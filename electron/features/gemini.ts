import { GoogleGenAI } from "@google/genai";
import fs from "node:fs";
import path from "node:path";
import { loadMainConfig } from "./common";

const initPrompt = `
      Analyze this affiliate product video.

      Generate:
      - 10 amazon captions
      - Each caption is separated by three line breaks"

      Style:
      Gen Z
      Viral short-form
      Emotional buying trigger
      Only captions, no hashtags, have emojis, no links, no mentions
      Have 150 to 200 characters
      Have a hook, a story, and a call to action
      Format: "[hook1]\n[story1]\n[call to action1]\n\n\n\n[hook2]\n[story2]\n[call to action2]\n\n\n\n[hook3]\n[story3]\n[call to action3]"
      `;

export const generateAmazonCaptions = async (folder: string) => {
  try {
    const mainConfig = await loadMainConfig();
    const ai = new GoogleGenAI({
      apiKey: mainConfig?.gemini?.apiKey,
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
      model: mainConfig?.gemini?.model || "gemini-2.5-flash-lite",
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
