import fs from 'node:fs';
import path from 'node:path';

export interface MoveData {
  data: string;
  folder: string;
  fileName: string;
  type?: 'cap' | 'link';
}

const countNonEmptyLines = (data: string) =>
  data
    .trim()
    .replace(/(\r?\n)\s*(\r?\n)+/g, '\n')
    .split('\n')
    .filter((line) => line.trim() !== '').length;

const isUsableProductFolder = (folderPath: string): boolean => {
  try {
    const capPath = path.join(folderPath, 'cap.txt');
    const linkPath = path.join(folderPath, 'link.txt');
    if (!fs.existsSync(capPath) || !fs.existsSync(linkPath)) {
      return false;
    }

    const capLength = countNonEmptyLines(fs.readFileSync(capPath, 'utf-8'));
    const linkLength = countNonEmptyLines(fs.readFileSync(linkPath, 'utf-8'));
    return capLength >= 2 && linkLength >= 2;
  } catch {
    return false;
  }
};

export const getRandomFolder = (
  rootPath: string,
  exclude: string[] = [],
): string => {
  const excludeFolders: string[] = [];
  if (!rootPath) {
    console.error('Root path is undefined or empty');
    return '';
  }

  if (!fs.existsSync(rootPath)) {
    console.error('Root path does not exist:', rootPath);
    return '';
  }

  try {
    const excludeSet = new Set(
      excludeFolders.filter(Boolean).map((p) => path.normalize(p)),
    );

    const candidates = fs
      .readdirSync(rootPath, { withFileTypes: true })
      .filter((entry) => {
        if (!entry.isDirectory()) return false;
        if (entry.name === '.DS_Store' || entry.name === 'desktop.ini') return false;
        if (entry.name.startsWith('.')) return false;
        return true;
      })
      .map((entry) => path.join(rootPath, entry.name))
      .filter((folderPath) => !excludeSet.has(path.normalize(folderPath)))
      .filter((folderPath) => isUsableProductFolder(folderPath));

    if (candidates.length === 0) {
      console.error(
        'No usable folders found (need cap.txt + link.txt with >= 2 lines each):',
        rootPath,
        `| excluded=${excludeFolders.length}`,
      );
      return '';
    }

    return candidates[Math.floor(Math.random() * candidates.length)];
  } catch (error) {
    console.error('Error reading folder:', rootPath, error);
    return '';
  }
};

// get all folder in root path
export interface FolderData {
  folder: string;
  defaultLink: string;
  totalLink: number;
  totalCap: number;
  imgs: string[];
  realProductImage: string;
  title: string;
  isMapping: boolean;
}

export const getAllFolder = (rootPath: string): FolderData[] => {
  try {
    const folders = fs.readdirSync(rootPath);
    const data = folders.filter(folder => folder !== '.DS_Store' && folder !== 'desktop.ini');
    return data.map((folder) => {
      // get link.txt in folder
      const linkPath = path.join(rootPath, folder, 'link.txt');
      if (!folder.trim()) {
        console.error(`Folder ${folder} không hợp lệ`);
      }

      // check link.txt có tồn tại không
      if (!fs.existsSync(linkPath)) {
        console.error(`Link.txt không tồn tại trong folder ${folder}`);
      }

      let totalLink = 0;
      let totalCap = 0;
      let defaultLink = '';
      if (fs.existsSync(linkPath)) {
        const linkData = fs.readFileSync(linkPath, 'utf-8');
        const normalizedData = linkData.replace(/(\r?\n)\s*(\r?\n)+/g, '\n');
        const links = normalizedData.split('\n').filter(link => link.trim().length > 0);
        totalLink = links.length;
        if (links.length > 0) {
          defaultLink = links[0]; // Lấy link đầu tiên làm defaultLink
        }
      }

      const capPath = path.join(rootPath, folder, 'cap.txt');
      if (fs.existsSync(capPath)) {
        const capData = fs.readFileSync(capPath, 'utf-8').trim();
        const newsCap = capData.replace(/(\r?\n)\s*(\r?\n)+/g, '\n');
        const caps = newsCap.split('\n').filter(cap => cap.trim().length > 0);
        totalCap = caps.length;
      }

      // get all img in folder
      const imgs: string[] = [];
      const files = fs.readdirSync(path.join(rootPath, folder));
      files.forEach(file => {
        if (file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.jpeg')) {
          // convert to base64 to view in img tag
          const imgPath = path.join(rootPath, folder, file);
          const imgData = fs.readFileSync(imgPath);
          const imgBase64 = imgData.toString('base64');
          imgs.push(`data:image/jpeg;base64,${imgBase64}`);
        }
      });

      // get real product image in folder/real_product/img.png
      const realProductImagePath = path.join(rootPath, folder, 'real_product', 'img.png');
      let realProductImage = '';
      if (fs.existsSync(realProductImagePath)) {
        // convert to base64 to view in img tag
        const imgData = fs.readFileSync(realProductImagePath);
        const imgBase64 = imgData.toString('base64');
        realProductImage = `data:image/jpeg;base64,${imgBase64}`;
      }

      // get title in folder/real_product/title.txt
      const titlePath = path.join(rootPath, folder, 'real_product', 'title.txt');
      let titleText = '';
      if (fs.existsSync(titlePath)) {
        titleText = fs.readFileSync(titlePath, 'utf-8').trim();
      }

      // check folder và title text giống nhau 80% thì mới mapping, tránh trường hợp folder tên là "Áo thun nam" mà title là "Áo thun nữ" thì không mapping
      const folderWords = folder.split(/\s+/);
      const titleWords = titleText.split(/\s+/);
      let commonWords = 0;
      folderWords.forEach(word => {
        if (titleWords.includes(word)) {
          commonWords++;
        }
      });
      const similarity = commonWords / Math.max(folderWords.length, titleWords.length);
      const isMapping = similarity >= 0.8;

      return ({
        folder: path.join(rootPath, folder),
        defaultLink: defaultLink,
        totalLink: totalLink,
        totalCap: totalCap,
        imgs,
        realProductImage,
        title: titleText,
        isMapping,
      });
    });
  } catch (error) {
    console.error('Error reading folder:', rootPath, error);
    return [];
  }
};

export const moveDataToFolder = ({ data, folder, fileName }: MoveData): void => {
  try {
    const folderPath = path.join(folder, fileName);
    fs.writeFileSync(folderPath, data);
  } catch (error) {
    console.error('Error moving data to folder:', error);
    throw error;
  }
}

const VIDEO_EXTS = new Set(['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v']);
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.bmp']);

/** Get media paths in folder: videos first, then images. */
export const getMediaInFolder = (folderPath: string): string[] => {
  if (!folderPath || !fs.existsSync(folderPath)) {
    return [];
  }

  try {
    const videos: string[] = [];
    const images: string[] = [];

    for (const entry of fs.readdirSync(folderPath, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      const fullPath = path.join(folderPath, entry.name);
      if (VIDEO_EXTS.has(ext)) {
        videos.push(fullPath);
      } else if (IMAGE_EXTS.has(ext)) {
        images.push(fullPath);
      }
    }

    return [...videos, ...images];
  } catch (error) {
    console.error('Error reading media in folder:', folderPath, error);
    return [];
  }
};
