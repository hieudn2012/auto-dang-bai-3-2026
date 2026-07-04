import * as fs from 'fs';
import path from 'node:path';

export const checkValidCaptionOrLink = async (workingDir: string) => {
  // lấy tất cả thư mục trong workingDir
  const folders = fs.readdirSync(workingDir);
  // bỏ qua '.DS_Store' và 'desktop.ini'
  const filteredFolders = folders.filter((folder) => !folder.startsWith('.') && folder !== 'desktop.ini');
  const captionResult: any[] = [];
  const linkResult: any[] = [];


  for (const folder of filteredFolders) {
    const captionFile = path.join(workingDir, folder, 'cap.txt');
    const linkFile = path.join(workingDir, folder, 'link.txt');
    
    let captionValidation;
    let linkValidation;
    
    // Kiểm tra và xử lý file caption
    if (fs.existsSync(captionFile)) {
      try {
        const caption = fs.readFileSync(captionFile, 'utf-8').trim();
        captionValidation = checkValid(caption, path.join(workingDir, folder), 'cap');
      } catch (error) {
        console.error(`Lỗi khi đọc file caption ${captionFile}:`, error);
        captionValidation = {
          isValid: false,
          errors: [`Không thể đọc file caption: ${error instanceof Error ? error.message : String(error)}`],
          path: path.join(workingDir, folder),
          totalItems: 0
        };
      }
    } else {
      captionValidation = {
        isValid: false,
        errors: ["File caption không tồn tại"],
        path: path.join(workingDir, folder),
        totalItems: 0
      };
    }
    
    // Kiểm tra và xử lý file link
    if (fs.existsSync(linkFile)) {
      try {
        const link = fs.readFileSync(linkFile, 'utf-8').trim();
        linkValidation = checkValid(link, path.join(workingDir, folder), 'link');
      } catch (error) {
        console.error(`Lỗi khi đọc file link ${linkFile}:`, error);
        linkValidation = {
          isValid: false,
          errors: [`Không thể đọc file link: ${error instanceof Error ? error.message : String(error)}`],
          path: path.join(workingDir, folder),
          totalItems: 0
        };
      }
    } else {
      linkValidation = {
        isValid: false,
        errors: ["File link không tồn tại"],
        path: path.join(workingDir, folder),
        totalItems: 0
      };
    }
    
    captionResult.push(captionValidation);
    linkResult.push(linkValidation);
  }

  return {
    captionResult,
    linkResult,
    captionErrorCount: captionResult.filter((item) => !item.isValid).length,
    linkErrorCount: linkResult.filter((item) => !item.isValid).length,
  };
};

const checkValid = (data: string, path: string, type: 'cap' | 'link') => {
  // Chuẩn hóa ký tự xuống dòng để xử lý cả Windows (\r\n) và Unix (\n)
  const normalizedData = data.replace(/\r\n/g, '\n');
  const newsData = normalizedData.trim().replace(/(\r?\n)\s*(\r?\n)+/g, '\n');
  const errors: string[] = [];
  // Quy tắc 1: Caption không được rỗng hoặc chỉ chứa khoảng trắng
  if (!newsData || newsData.trim().length === 0) {
    errors.push("Dữ liệu không được để trống");
    return { isValid: false, errors, path };
  }

  // Quy tắc 2: Caption không được chứa quá nhiều dòng trống liên tiếp (tối đa 4)
  const emptyLineGroups = newsData.match(type === 'cap' ? /\n{5,}/g : /\n{2,}/g);
  if (emptyLineGroups) {
    errors.push(`Dữ liệu chứa quá nhiều dòng trống liên tiếp (tối đa ${type === 'cap' ? 4 : 1} dòng cho phép)`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    path,
    totalItems: normalizedData.split('\n').length,
  };
}

export const getRandomCaption = (p: string) => {
  try {
    // Check if path is a directory, if so, look for caption.txt file
    let filePath = p;
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
      filePath = path.join(p, 'cap.txt');
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`Caption file not found: ${filePath}`);
      return ''; // Return empty string if file doesn't exist
    }
    
    const data = fs.readFileSync(filePath, 'utf-8');
    const normalizedData = data.replace(/\r\n/g, '\n');
    const newsData = normalizedData.trim().replace(/(\r?\n)\s*(\r?\n)+/g, '\n');
    const captions = newsData.split('\n').filter(caption => caption.trim().length > 0);
    
    if (captions.length === 0) {
      console.error(`No captions found in file: ${filePath}`);
      return ''; // Return empty string if no captions
    }
    
    const randomIndex = Math.floor(Math.random() * captions.length);
    // remove caption in file
    const newCaptions = captions.filter((_, index) => index !== randomIndex);
    fs.writeFileSync(filePath, newCaptions.join('\n'));

    return captions[randomIndex];
  } catch (error) {
    console.error(`Error reading caption file: ${p}`, error);
    return ''; // Return empty string on error
  }
}

export const getRandomCap = (data: string) => {
  const normalizedData = data.replace(/\r\n/g, '\n');
  const newsData = normalizedData.trim().replace(/(\r?\n)\s*(\r?\n)+/g, '\n');
  const captions = newsData.split('\n').filter(caption => caption.trim().length > 0);
  
  if (captions.length === 0) {
    return ''; // Return empty string if no captions
  }
  
  const randomIndex = Math.floor(Math.random() * captions.length);
  return captions[randomIndex];
} 

export const getRandomLink = (p: string) => {
  try {
    // Check if path is a directory, if so, look for link.txt fileπ
    let filePath = p;
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
      filePath = path.join(p, 'link.txt');
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`Link file not found: ${filePath}`);
      return ''; // Return empty string if file doesn't exist
    }
    
    const data = fs.readFileSync(filePath, 'utf-8').trim();
    const normalizedData = data.replace(/\r\n/g, '\n');
    const newsData = normalizedData.trim().replace(/(\r?\n)\s*(\r?\n)+/g, '\n');
    const firstLink = newsData.split('\n')[0].trim();
    const links = newsData.split('\n').filter(link => link.trim().length > 0).slice(1);
    
    if (links.length === 0) {
      console.error(`No links found in file: ${filePath}`);
      return ''; // Return empty string if no links
    }
    
    const randomIndex = Math.floor(Math.random() * links.length);
    const newLinks = links.filter((_, index) => index !== randomIndex);
    fs.writeFileSync(filePath, [firstLink, ...newLinks].join('\n'));

    return links[randomIndex];
  } catch (error) {
    console.error(`Error reading link file: ${p}`, error);
    return ''; // Return empty string on error
  }
}
