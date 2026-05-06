import puppeteer from "puppeteer"

interface ToggleDismissButtonParams {
  ws: string;
}

export const toggleDismissButton = async ({ ws }: ToggleDismissButtonParams) => {
  const browser = await puppeteer.connect({
    browserWSEndpoint: ws,
    defaultViewport: null,
  });

  try {
    // find tab with instagram
    const pages = await browser.pages();
    const instagramPage = pages.find(page => page.url().includes('instagram.com'));

    if (instagramPage) {
      // find dismiss button
      const dismissButton = await instagramPage.$('[aria-label="Dismiss"]');
      if (dismissButton) {
        await dismissButton.click();
      }
    }
  } catch (error) {
    console.error(error);
  } finally {
    await browser.disconnect();
  }
}

export interface BulkToggleDismissButtonParams {
  wss: ToggleDismissButtonParams[];
}

export const bulkToggleDismissButton = async ({ wss }: BulkToggleDismissButtonParams) => {
  for (const ws of wss) {
    toggleDismissButton(ws);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}