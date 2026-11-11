import { execFile, spawn } from 'node:child_process'
import { existsSync, readdirSync, renameSync, statSync, unlinkSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { promisify } from 'node:util'
import type { IpcMainEvent } from 'electron'
import { sendLog } from './event'

const require = createRequire(import.meta.url)

const execFileAsync = promisify(execFile)

const VIDEO_EXTS = new Set(['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v'])
export const OUTPUT_VIDEO_NAME = 'C.mp4'
const REACTION_NAME_RE = /^reaction_(\d{2})_(\d{2})_(\d{4})_(\d{2})_(\d{2})\.mp4$/i

export type OverlayCorner = 'top-left' | 'bottom-left'

export type BuildVideoFolder = {
  folder: string
  name: string
  videoA?: string
  videoAName?: string
  outputPath?: string
  outputName?: string
  createdAt?: string
  hasOutput: boolean
  ready: boolean
  error?: string
}

export type ScanBuildVideosResult = {
  parentFolder: string
  reactionFolder?: string
  reactionCount: number
  reactionError?: string
  folders: BuildVideoFolder[]
}

export type BuildVideosParams = {
  parentFolder: string
  reactionFolder: string
  corner?: OverlayCorner
}

export type BuildVideoItemResult = {
  folder: string
  name: string
  ok: boolean
  outputPath?: string
  outputName?: string
  createdAt?: string
  error?: string
}

type VideoFile = {
  name: string
  path: string
  size: number
  mtimeMs: number
}

const isVideoFile = (fileName: string) => VIDEO_EXTS.has(path.extname(fileName).toLowerCase())

const isLegacyOutput = (fileName: string) => fileName.toLowerCase() === OUTPUT_VIDEO_NAME.toLowerCase()

const isReactionFile = (fileName: string) => /^reaction_.*\.mp4$/i.test(fileName)

const isGeneratedOutput = (fileName: string) =>
  isLegacyOutput(fileName) || isReactionFile(fileName) || /\.tmp\.mp4$/i.test(fileName)

export const formatReactionFileName = (date = new Date()) => {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `reaction_${pad(date.getDate())}_${pad(date.getMonth() + 1)}_${date.getFullYear()}_${pad(date.getHours())}_${pad(date.getMinutes())}.mp4`
}

export const parseReactionCreatedAt = (fileName: string) => {
  const match = REACTION_NAME_RE.exec(path.basename(fileName))
  if (!match) return undefined
  const [, dd, mm, yyyy, hh, min] = match
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

const reactionSortKey = (fileName: string) => {
  const match = REACTION_NAME_RE.exec(fileName)
  if (!match) return 0
  const [, dd, mm, yyyy, hh, min] = match
  return Number(`${yyyy}${mm}${dd}${hh}${min}`)
}

const scoreProductName = (fileName: string) => {
  const stem = path.parse(fileName).name.toLowerCase()
  if (stem === 'a' || stem === 'video_a' || stem === 'video-a' || stem === 'main' || stem === 'product') return 100
  if (stem.includes('main') || stem.includes('background') || stem.includes('product')) return 80
  return 0
}

const listVideoFiles = (folder: string): VideoFile[] =>
  readdirSync(folder, { withFileTypes: true })
    .filter((file) => file.isFile() && isVideoFile(file.name))
    .map((file) => {
      const fullPath = path.join(folder, file.name)
      const stat = statSync(fullPath)
      return { name: file.name, path: fullPath, size: stat.size, mtimeMs: stat.mtimeMs }
    })

const pickProductVideo = (files: VideoFile[]) => {
  const products = files.filter((file) => !isGeneratedOutput(file.name))
  if (products.length === 0) return null
  const byRole = [...products].sort((a, b) => scoreProductName(b.name) - scoreProductName(a.name))
  if (scoreProductName(byRole[0].name) > 0) return byRole[0]
  return [...products].sort(
    (a, b) => b.size - a.size || a.name.localeCompare(b.name, undefined, { numeric: true }),
  )[0]
}

const pickLatestReaction = (files: VideoFile[]) => {
  const reactions = files.filter((file) => isReactionFile(file.name))
  if (reactions.length === 0) return null
  return [...reactions].sort((a, b) => {
    const keyDiff = reactionSortKey(b.name) - reactionSortKey(a.name)
    if (keyDiff !== 0) return keyDiff
    return b.mtimeMs - a.mtimeMs
  })[0]
}

const listReactionVideos = (reactionFolder?: string) => {
  if (!reactionFolder?.trim()) {
    return { videos: [] as VideoFile[], error: undefined as string | undefined }
  }
  if (!existsSync(reactionFolder)) {
    return { videos: [], error: 'Thư mục nhân vật không tồn tại' }
  }
  try {
    const videos = listVideoFiles(reactionFolder)
    if (videos.length === 0) {
      return { videos, error: 'Thư mục nhân vật không có video' }
    }
    return { videos, error: undefined }
  } catch {
    return { videos: [], error: 'Không đọc được thư mục nhân vật' }
  }
}

export const scanBuildVideos = (parentFolder: string, reactionFolder?: string): ScanBuildVideosResult => {
  if (!parentFolder?.trim()) {
    throw new Error('Chưa chọn thư mục product')
  }
  if (!existsSync(parentFolder)) {
    throw new Error('Thư mục product không tồn tại')
  }

  const reaction = listReactionVideos(reactionFolder)
  const reactionResolved = reactionFolder?.trim() ? path.resolve(reactionFolder) : ''
  const folders: BuildVideoFolder[] = []

  for (const entry of readdirSync(parentFolder, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue

    const folder = path.join(parentFolder, entry.name)
    if (reactionResolved && path.resolve(folder) === reactionResolved) continue

    let videos: VideoFile[] = []
    try {
      videos = listVideoFiles(folder)
    } catch {
      folders.push({
        folder,
        name: entry.name,
        hasOutput: false,
        ready: false,
        error: 'Không đọc được thư mục',
      })
      continue
    }

    const product = pickProductVideo(videos)
    const reactionOutput = pickLatestReaction(videos)
    const legacyOutput = videos.find((file) => isLegacyOutput(file.name))
    const output = reactionOutput || legacyOutput
    const item: BuildVideoFolder = {
      folder,
      name: entry.name,
      outputPath: output?.path,
      outputName: output?.name,
      createdAt: reactionOutput ? parseReactionCreatedAt(reactionOutput.name) : undefined,
      hasOutput: Boolean(output),
      ready: Boolean(product),
    }

    if (!product) {
      item.error = 'Không có video product'
    } else {
      item.videoA = product.path
      item.videoAName = product.name
    }

    folders.push(item)
  }

  folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
  return {
    parentFolder,
    reactionFolder: reactionFolder?.trim() || undefined,
    reactionCount: reaction.videos.length,
    reactionError: reaction.error,
    folders,
  }
}

const overlayXY = (corner: OverlayCorner) => (corner === 'top-left' ? '24:24' : '24:H-h-24')

const runFfmpeg = (ffmpeg: string, args: string[]) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(ffmpeg, args, { windowsHide: true })
    let stderr = ''
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk)
      if (stderr.length > 12_000) stderr = stderr.slice(-6_000)
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      const tail = stderr.trim().split('\n').slice(-8).join('\n')
      reject(new Error(tail || `ffmpeg exit ${code}`))
    })
  })

const overlayVideos = async (
  ffmpeg: string,
  videoA: string,
  videoB: string,
  outputPath: string,
  corner: OverlayCorner,
) => {
  const tmpPath = `${outputPath.replace(/\.mp4$/i, '')}.tmp.mp4`
  if (existsSync(tmpPath)) unlinkSync(tmpPath)

  const filter = [
    '[1:v][0:v]scale2ref=w=trunc(iw*0.28/2)*2:h=trunc(ow/mdar/2)*2[pip][base]',
    '[pip]format=yuva420p,pad=iw+8:ih+8:4:4:white[pipb]',
    `[base][pipb]overlay=${overlayXY(corner)}:shortest=1[v]`,
  ].join(';')

  await runFfmpeg(ffmpeg, [
    '-y',
    '-i', videoA,
    '-stream_loop', '-1',
    '-i', videoB,
    '-filter_complex', filter,
    '-map', '[v]',
    '-map', '0:a?',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '20',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    '-movflags', '+faststart',
    tmpPath,
  ])

  if (existsSync(outputPath)) unlinkSync(outputPath)
  renameSync(tmpPath, outputPath)
}

const removeOtherReactions = (folder: string, keepName: string) => {
  const removed: string[] = []
  for (const file of readdirSync(folder)) {
    if (file.toLowerCase() === keepName.toLowerCase()) continue
    if (!isGeneratedOutput(file)) continue
    unlinkSync(path.join(folder, file))
    removed.push(file)
  }
  return removed
}

export const resolveFfmpeg = async () => {
  if (process.env.FFMPEG_PATH && existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH
  }

  const candidates = [
    'C:\\ffmpeg\\bin\\ffmpeg.exe',
    'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
    'C:\\Program Files\\FFmpeg\\bin\\ffmpeg.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe'),
  ]

  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) return candidate
  }

  try {
    const { stdout } = await execFileAsync('where', ['ffmpeg'], { windowsHide: true })
    const first = stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean)
    if (first && existsSync(first)) return first
  } catch {
    // ignore
  }

  try {
    await execFileAsync('ffmpeg', ['-version'], { windowsHide: true })
    return 'ffmpeg'
  } catch {
    // fall through to bundled binary
  }

  try {
    const bundled = require('ffmpeg-static') as string | null
    if (bundled && existsSync(bundled)) return bundled
  } catch {
    // ignore
  }

  throw new Error('Không tìm thấy ffmpeg. Cài ffmpeg, thêm vào PATH, hoặc set FFMPEG_PATH.')
}

export const buildVideos = async (params: BuildVideosParams, event?: IpcMainEvent) => {
  if (!params.reactionFolder?.trim()) {
    throw new Error('Chưa chọn thư mục nhân vật')
  }

  const reaction = listReactionVideos(params.reactionFolder)
  if (reaction.error || reaction.videos.length === 0) {
    throw new Error(reaction.error || 'Thư mục nhân vật không có video')
  }

  const ffmpeg = await resolveFfmpeg()
  const scan = scanBuildVideos(params.parentFolder, params.reactionFolder)
  const corner = params.corner || 'bottom-left'
  const results: BuildVideoItemResult[] = []

  const log = (message: string, folder = 'build-videos') => {
    if (event) sendLog(event, { username: folder, message })
  }

  log(`FFmpeg: ${ffmpeg}`)
  log(`Video nhân vật: ${reaction.videos.length}`)
  log(`Tổng product: ${scan.folders.length}`)

  for (const item of scan.folders) {
    if (!item.ready || !item.videoA) {
      results.push({
        folder: item.folder,
        name: item.name,
        ok: false,
        error: item.error || 'Không có video product',
      })
      log(item.error || 'Bỏ qua', item.name)
      continue
    }

    const character = reaction.videos[Math.floor(Math.random() * reaction.videos.length)]
    const createdAtDate = new Date()
    const outputName = formatReactionFileName(createdAtDate)
    const outputPath = path.join(item.folder, outputName)
    const createdAt = parseReactionCreatedAt(outputName)

    try {
      log(`Ghép ${item.videoAName} + ${character.name} → ${outputName}`, item.name)
      await overlayVideos(ffmpeg, item.videoA, character.path, outputPath, corner)
      const removed = removeOtherReactions(item.folder, outputName)
      if (removed.length > 0) {
        log(`Xoá reaction cũ: ${removed.join(', ')}`, item.name)
      }
      results.push({
        folder: item.folder,
        name: item.name,
        ok: true,
        outputPath,
        outputName,
        createdAt,
      })
      log(`Xong ${outputName}`, item.name)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      results.push({ folder: item.folder, name: item.name, ok: false, error: message })
      log(`Lỗi: ${message}`, item.name)
    }
  }

  return {
    parentFolder: params.parentFolder,
    reactionFolder: params.reactionFolder,
    ffmpeg,
    total: results.length,
    success: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok).length,
    results,
  }
}
