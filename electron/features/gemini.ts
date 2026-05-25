import { GoogleGenAI } from "@google/genai";
import fs from "node:fs";
import path from "node:path";
import { loadMainConfig } from "./common";

const initPrompt = `
      Analyze this affiliate product video.

      Generate:
      - 10 amazon captions
      - Each caption is separated by new line with character "####" for example:
      cation1
      ####
      cation2
      ####
      cation3

      Style:
      Gen Z
      Viral short-form
      Emotional buying trigger
      Only captions, no hashtags, have emojis, no links, no mentions
      Have 100 to 150 characters
      `;

export const generateAmazonCaptions = async (folder: string) => {
  try {
    const mainConfig = await loadMainConfig();
    const keys = mainConfig?.gemini?.apiKey?.trim().split(`\n`);
    const randomKey = keys?.[Math.floor(Math.random() * keys.length)] || mainConfig?.gemini?.apiKey;

    const ai = new GoogleGenAI({
      apiKey: randomKey,
    });

    // get .mp4 in folder
    const files = fs.readdirSync(folder);
    const videoFile = files.find(file => file.endsWith('.mp4'));
    if (!videoFile) {
      throw new Error('No video file found in folder');
    }
    const videoPath = path.join(folder, videoFile);

    const videoBytes = fs.readFileSync(videoPath);

    const response = await ai.models.generateContent({
      model: mainConfig?.gemini?.model || "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: "video/mp4",
            data: videoBytes.toString("base64"),
          },
        },
        {
          text: mainConfig?.gemini?.prompt || initPrompt,
        },
      ],
    });

    return response.text;
  } catch (error) {
    console.error(error);
    throw String(error);
  }
}
