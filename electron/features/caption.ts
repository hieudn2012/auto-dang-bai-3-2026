import * as fs from 'fs';
import { loadMainConfig } from './common';

export const checkValidCaptionOrLink = async () => {
  const config = await loadMainConfig();
  const workingDir = config?.workingDir || '';

  // lấy tất cả thư mục trong workingDir
  const folders = fs.readdirSync(workingDir);
  // bỏ qua '.DS_Store' và 'desktop.ini'
  const filteredFolders = folders.filter((folder) => !folder.startsWith('.') && folder !== 'desktop.ini');
  const captionResult: any[] = [];
  const linkResult: any[] = [];


  for (const folder of filteredFolders) {
    const captionFile = `${workingDir}/${folder}/cap.txt`;
    const linkFile = `${workingDir}/${folder}/link.txt`;
    
    let captionValidation;
    let linkValidation;
    
    // Kiểm tra và xử lý file caption
    if (fs.existsSync(captionFile)) {
      try {
        const caption = fs.readFileSync(captionFile, 'utf-8');
        console.log(caption);
        captionValidation = checkValid(caption, `${workingDir}/${folder}`);
      } catch (error) {
        console.error(`Lỗi khi đọc file caption ${captionFile}:`, error);
        captionValidation = {
          isValid: false,
          errors: [`Không thể đọc file caption: ${error instanceof Error ? error.message : String(error)}`],
          path: `${workingDir}/${folder}`,
          totalItems: 0
        };
      }
    } else {
      console.log(`File caption không tồn tại: ${captionFile}`);
      captionValidation = {
        isValid: false,
        errors: ["File caption không tồn tại"],
        path: `${workingDir}/${folder}`,
        totalItems: 0
      };
    }
    
    // Kiểm tra và xử lý file link
    if (fs.existsSync(linkFile)) {
      try {
        const link = fs.readFileSync(linkFile, 'utf-8');
        console.log(link);
        linkValidation = checkValid(link, `${workingDir}/${folder}`);
      } catch (error) {
        console.error(`Lỗi khi đọc file link ${linkFile}:`, error);
        linkValidation = {
          isValid: false,
          errors: [`Không thể đọc file link: ${error instanceof Error ? error.message : String(error)}`],
          path: `${workingDir}/${folder}`,
          totalItems: 0
        };
      }
    } else {
      console.log(`File link không tồn tại: ${linkFile}`);
      linkValidation = {
        isValid: false,
        errors: ["File link không tồn tại"],
        path: `${workingDir}/${folder}`,
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

const checkValid = (data: string, path: string) => {
  // Chuẩn hóa ký tự xuống dòng để xử lý cả Windows (\r\n) và Unix (\n)
  const normalizedData = data.replace(/\r\n/g, '\n');
  const errors: string[] = [];
  // Quy tắc 1: Caption không được rỗng hoặc chỉ chứa khoảng trắng
  if (!normalizedData || normalizedData.trim().length === 0) {
    errors.push("Dữ liệu không được để trống");
    return { isValid: false, errors, path };
  }

  // Quy tắc 2: Caption không được chứa quá nhiều dòng trống liên tiếp (tối đa 4)
  const emptyLineGroups = normalizedData.match(/\n{5,}/g);
  if (emptyLineGroups) {
    errors.push("Dữ liệu chứa quá nhiều dòng trống liên tiếp (tối đa 4 dòng cho phép)");
  }

  return {
    isValid: errors.length === 0,
    errors,
    path,
    totalItems: normalizedData.split('\n\n\n\n').length,
  };
}

export const getRandomCaption = (path: string) => {
  const data = fs.readFileSync(path, 'utf-8');
  const normalizedData = data.replace(/\r\n/g, '\n');
  const captions = normalizedData.split('\n\n\n\n');
  const randomIndex = Math.floor(Math.random() * captions.length);
  return captions[randomIndex];
}

export const getRandomLink = (path: string) => {
  const data = fs.readFileSync(path, 'utf-8');
  const normalizedData = data.replace(/\r\n/g, '\n');
  const links = normalizedData.split('\n');
  const randomIndex = Math.floor(Math.random() * links.length);
  return links[randomIndex];
}
