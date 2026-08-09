import { getMediaInFolder, getRandomFolder } from "./foder";
import { getRandomCaption, getRandomLink } from "./caption";
import { loadMainConfig } from "./common";

interface SubmitPostData {
  files: string[];
  caption: string;
  link: string;
}

export const getSubmitPostData = async (type: 'post' | 'quote'): Promise<SubmitPostData> => {
  const config = await loadMainConfig();
  const rootPath = type === 'post' ? config?.workingDir : config?.quoteWorkingDir;
  const folder = getRandomFolder(rootPath || '', []);
  const files = getMediaInFolder(folder);
  const caption = getRandomCaption(folder);
  const link = getRandomLink(folder);

  return { files, caption, link };
}