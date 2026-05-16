import { loadMainConfig } from "./common"
import fs from "node:fs"
import nodePath from "node:path"

export interface Product {
  folderPath: string;
  link: string;
  cap: string;
}

const generateRandomString = (length: number) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const createEmptyProduct = async () => {
  const config = await loadMainConfig();

  const folderName = generateRandomString(10);

  // create folder
  const folderPath = nodePath.join(config?.workingDir || "", folderName);
  fs.mkdirSync(folderPath);

  // create link.txt
  fs.writeFileSync(nodePath.join(folderPath, "link.txt"), "");

  // create cap.txt
  fs.writeFileSync(nodePath.join(folderPath, "cap.txt"), "");

  return {
    folderPath,
    link: "",
    cap: ""
  };
}

export const saveProduct = async (product: Product) => {
  fs.writeFileSync(nodePath.join(product.folderPath, "link.txt"), product.link);
  fs.writeFileSync(nodePath.join(product.folderPath, "cap.txt"), product.cap);
}

export const getProductFolder = async (folderPath: string): Promise<Product> => {
  const link = fs.readFileSync(nodePath.join(folderPath, "link.txt"), "utf-8");
  const cap = fs.readFileSync(nodePath.join(folderPath, "cap.txt"), "utf-8");
  return {
    folderPath,
    link,
    cap
  };
}