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

export type OverlayCorner = 'top-left' | 'bottom-left'

export type BuildVideoFolder = {
  folder: string
  name: string
  videoA?: string
  videoB?: string
  videoAName?: string
  videoBName?: string
  outputPath: string
  hasOutput: boolean
  ready: boolean
  error?: string
}

export type ScanBuildVideosResult = {
  parentFolder: string
  folders: BuildVideoFolder[]
}

export type BuildVideosParams = {
  parentFolder: string
  overwrite?: boolean
  corner?: OverlayCorner
}

export type BuildVideoItemResult = {
  folder: string
  name: string
  ok: boolean
  skipped?: boolean
  outputPath?: string
  error?: string
}

const isVideoFile = (fileName: string) => VIDEO_EXTS.has(path.extname(fileName).toLowerCase())

const isOutputName = (fileName: string) => fileName.toLowerCase() === OUTPUT_VIDEO_NAME.toLowerCase()

const scoreNameForRole = (fileName: string, role: 'a' | 'b') => {
  const stem = path.parse(fileName).name.toLowerCase()
  if (role === 'a') {
    if (stem === 'a' || stem === 'video_a' || stem === 'video-a' || stem === 'main') return 100
    if (stem.includes('main') || stem.includes('background')) return 80
  } else {
    if (stem === 'b' || stem === 'video_b' || stem === 'video-b') return 100
    if (stem.includes('reaction') || stem.includes('react') || stem.includes('nhanvat') || stem.includes('character')) {
      return 90
    }
  }
  return 0
}

const pickAB = (files: { name: string; path: string; size: number }[]) => {
  if (files.length < 2) return null

  const byA = [...files].sort((x, y) => scoreNameForRole(y.name, 'a') - scoreNameForRole(x.name, 'a'))
  const byB = [...files].sort((x, y) => scoreNameForRole(y.name, 'b') - scoreNameForRole(x.name, 'b'))
  const aScore = scoreNameForRole(byA[0].name, 'a')
  const bScore = scoreNameForRole(byB[0].name, 'b')
  if (aScore > 0 && bScore > 0 && byA[0].path !== byB[0].path) {
    return { a: byA[0], b: byB[0] }
  }

  const bySize = [...files].sort(
    (x, y) => y.size - x.size || x.name.localeCompare(y.name, undefined, { numeric: true }),
  )
  return { a: bySize[0], b: bySize[1] }
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

export const scanBuildVideos = (parentFolder: string): ScanBuildVideosResult => {
  if (!parentFolder?.trim()) {
    throw new Error('Chưa chọn thư mục cha')
  }
  if (!existsSync(parentFolder)) {
    throw new Error('Thư mục cha không tồn tại')
  }

  const folders: BuildVideoFolder[] = []
  for (const entry of readdirSync(parentFolder, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue

    const folder = path.join(parentFolder, entry.name)
    const outputPath = path.join(folder, OUTPUT_VIDEO_NAME)
    let videos: { name: string; path: string; size: number }[] = []
    try {
      videos = readdirSync(folder, { withFileTypes: true })
        .filter((file) => file.isFile() && isVideoFile(file.name) && !isOutputName(file.name))
        .map((file) => {
          const fullPath = path.join(folder, file.name)
          return { name: file.name, path: fullPath, size: statSync(fullPath).size }
        })
    } catch {
      folders.push({
        folder,
        name: entry.name,
        outputPath,
        hasOutput: existsSync(outputPath),
        ready: false,
        error: 'Không đọc được thư mục',
      })
      continue
    }

    const picked = pickAB(videos)
    const item: BuildVideoFolder = {
      folder,
      name: entry.name,
      outputPath,
      hasOutput: existsSync(outputPath),
      ready: Boolean(picked),
    }

    if (!picked) {
      item.error = videos.length === 0 ? 'Không có video' : `Cần 2 video, đang có ${videos.length}`
    } else {
      item.videoA = picked.a.path
      item.videoB = picked.b.path
      item.videoAName = picked.a.name
      item.videoBName = picked.b.name
    }

    folders.push(item)
  }

  folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
  return { parentFolder, folders }
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

export const buildVideos = async (params: BuildVideosParams, event?: IpcMainEvent) => {
  const ffmpeg = await resolveFfmpeg()
  const scan = scanBuildVideos(params.parentFolder)
  const overwrite = Boolean(params.overwrite)
  const corner = params.corner || 'bottom-left'
  const results: BuildVideoItemResult[] = []

  const log = (message: string, folder = 'build-videos') => {
    if (event) sendLog(event, { username: folder, message })
  }

  log(`FFmpeg: ${ffmpeg}`)
  log(`Tổng folder con: ${scan.folders.length}`)

  for (const item of scan.folders) {
    if (!item.ready || !item.videoA || !item.videoB) {
      results.push({
        folder: item.folder,
        name: item.name,
        ok: false,
        error: item.error || 'Không đủ 2 video',
      })
      log(item.error || 'Bỏ qua', item.name)
      continue
    }

    if (item.hasOutput && !overwrite) {
      results.push({
        folder: item.folder,
        name: item.name,
        ok: true,
        skipped: true,
        outputPath: item.outputPath,
      })
      log('Đã có C.mp4, bỏ qua', item.name)
      continue
    }

    try {
      log(`Ghép ${item.videoAName} + ${item.videoBName} → C.mp4`, item.name)
      await overlayVideos(ffmpeg, item.videoA, item.videoB, item.outputPath, corner)
      results.push({
        folder: item.folder,
        name: item.name,
        ok: true,
        outputPath: item.outputPath,
      })
      log('Xong C.mp4', item.name)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      results.push({ folder: item.folder, name: item.name, ok: false, error: message })
      log(`Lỗi: ${message}`, item.name)
    }
  }

  return {
    parentFolder: params.parentFolder,
    ffmpeg,
    total: results.length,
    success: results.filter((item) => item.ok && !item.skipped).length,
    skipped: results.filter((item) => item.skipped).length,
    failed: results.filter((item) => !item.ok).length,
    results,
  }
}
