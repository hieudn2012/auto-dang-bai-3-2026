import puppeteer, { Page } from "puppeteer";
import { app, IpcMainEvent } from "electron";
import fs from "node:fs";
import path from "node:path";
import { waitRandom } from "./common";
import { sendMessage } from "./event";

export interface CheckAccountViewsProps {
  ws: string;
  groupId: number;
  profiles: string[];
  reportName: string;
}

const TAB_STAGGER_MS = 2_000;
const POSTS_TO_CHECK = 2;
const BATCH_SIZE = 10;

const pageletName = (index: number) => `threads_profile_posts_timeline_${index}`;
const pageletSelector = (index: number) => `[data-pagelet="${pageletName(index)}"]`;

/** step2: caption text (trong HTML thực tế là SPAN, không phải DIV) */
const POST_CAPTION_SELECTOR =
  "span.x1lliihq.x1plvlek.xryxfnj.x1n2onr6.xyejjpt.x15dsfln.xi7mnp6.x193iq5w.xeuugli.x1fj9vlw.x13faqbe.x1vvkbs.x1s928wv.xhkezso.x1gmr53x.x1cpjm7i.x1fgarty.x1943h6x.x1i0vuye.xjohtrz.xo1l8bm.xw2npq5.x1yc453h";

/** fallback: link vào post detail */
const POST_LINK_SELECTOR = 'a[href*="/post/"]:not([href*="/media"])';

/** step3: container views */
const VIEWS_CONTAINER_SELECTOR =
  "div.x78zum5.xdt5ytf.xl56j7k.xwib8y2.x1g0dm76.xpdmqnj.x889kno.xpse7mg";

/** step4: span chứa số views */
const VIEWS_SPAN_SELECTOR =
  "span.x1lliihq.x193iq5w.x6ikm8r.x10wlt62.xlyipyv.xuxw1ft";

/** step5: nút back */
const BACK_SVG_SELECTOR =
  "svg.x1lliihq.x2lah0s.x1n2onr6.x16ye13r.x5lhr3w.x86x9uj.xbh8q5q.x73je2i.x1owpc8m.x1f6yumg.xvlca1e";

/** "1.2K views" -> "1200", "8 views" -> "8", "3" -> "3" */
export const parseViewsCount = (text: string): string => {
  const cleaned = text.replace(/views/gi, "").replace(/,/g, "").trim();
  const match = cleaned.match(/^([\d.]+)\s*([kmb])?$/i);
  if (!match) {
    const digits = cleaned.replace(/[^\d]/g, "");
    return digits || "0";
  }

  let num = parseFloat(match[1]);
  if (Number.isNaN(num)) return "0";

  const suffix = (match[2] || "").toLowerCase();
  if (suffix === "k") num *= 1_000;
  if (suffix === "m") num *= 1_000_000;
  if (suffix === "b") num *= 1_000_000_000;

  return String(Math.round(num));
};

export interface PostEngagementMetrics {
  views: string;
  like: string;
  comment: string;
  share: string;
  send: string;
}

export interface CheckViewsReportItem {
  profile: string;
  postUrl: string;
  views: number;
  like: number;
  comment: number;
  share: number;
  send: number;
}

export interface CheckViewsReportResult {
  fileName: string;
  items: CheckViewsReportItem[];
  totalRows: number;
  totalProfiles: number;
  totalViews: number;
  avgViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalSends: number;
}

const getCheckViewsDir = () => path.join(app.getPath("userData"), "check-views");

export const listCheckViewsReports = async (): Promise<string[]> => {
  const dir = getCheckViewsDir();
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".txt"))
    .map((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      const createdAt = stat.birthtimeMs > 0 ? stat.birthtimeMs : stat.ctimeMs;
      return { name: file, createdAt };
    })
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((item) => item.name);
};

export const getCheckViewsReport = async (fileName: string): Promise<CheckViewsReportResult> => {
  const safeName = path.basename(fileName);
  const filePath = path.join(getCheckViewsDir(), safeName);

  if (!safeName.endsWith(".txt") || !fs.existsSync(filePath)) {
    return {
      fileName: safeName,
      items: [],
      totalRows: 0,
      totalProfiles: 0,
      totalViews: 0,
      avgViews: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      totalSends: 0,
    };
  }

  const parseMetric = (raw = "0") => Number(raw.replace(/[^\d]/g, "")) || 0;

  const content = fs.readFileSync(filePath, "utf8");
  const items = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.includes(" || "))
    .map((line) => {
      const [
        profile = "",
        postUrl = "",
        viewsRaw = "0",
        likeRaw = "0",
        commentRaw = "0",
        shareRaw = "0",
        sendRaw = "0",
      ] = line.split(" || ").map((p) => p.trim());
      return {
        profile,
        postUrl,
        views: parseMetric(viewsRaw),
        like: parseMetric(likeRaw),
        comment: parseMetric(commentRaw),
        share: parseMetric(shareRaw),
        send: parseMetric(sendRaw),
      };
    })
    .sort((a, b) => b.views - a.views);

  const totalViews = items.reduce((sum, item) => sum + item.views, 0);
  const totalLikes = items.reduce((sum, item) => sum + item.like, 0);
  const totalComments = items.reduce((sum, item) => sum + item.comment, 0);
  const totalShares = items.reduce((sum, item) => sum + item.share, 0);
  const totalSends = items.reduce((sum, item) => sum + item.send, 0);
  const totalProfiles = new Set(items.map((item) => item.profile)).size;

  return {
    fileName: safeName,
    items,
    totalRows: items.length,
    totalProfiles,
    totalViews,
    avgViews: items.length ? Math.round(totalViews / items.length) : 0,
    totalLikes,
    totalComments,
    totalShares,
    totalSends,
  };
};

const createReportFile = (reportName: string): string => {
  const dir = getCheckViewsDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const base = reportName.replace(/\.txt$/i, "").trim() || "views-report";
  let filePath = path.join(dir, `${base}.txt`);

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "", "utf8");
    return filePath;
  }

  let index = 1;
  while (fs.existsSync(path.join(dir, `${base}_${index}.txt`))) {
    index += 1;
  }

  filePath = path.join(dir, `${base}_${index}.txt`);
  fs.writeFileSync(filePath, "", "utf8");
  return filePath;
};

const appendReportLine = (
  reportPath: string,
  profile: string,
  postUrl: string,
  metrics: PostEngagementMetrics,
) => {
  const line = `${profile} || ${postUrl} || ${metrics.views} || ${metrics.like} || ${metrics.comment} || ${metrics.share} || ${metrics.send}\n`;
  fs.appendFileSync(reportPath, line, "utf8");
};

const listPagelets = async (page: Page) => {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll("[data-pagelet]"))
      .map((el) => el.getAttribute("data-pagelet") || "")
      .filter((name) => name.includes("threads_profile_posts_timeline_")),
  );
};

const waitForPagelet = async (page: Page, postIndex: number) => {
  const selector = pageletSelector(postIndex);
  const name = pageletName(postIndex);

  try {
    await page.waitForFunction(
      (pagelet) => !!document.querySelector(`[data-pagelet="${pagelet}"]`),
      { timeout: 25_000 },
      name,
    );
  } catch {
    const found = await listPagelets(page);
    throw new Error(
      `Timeout waiting for ${selector}. Pagelets found: [${found.join(", ") || "none"}] | url=${page.url()}`,
    );
  }

  await page.evaluate((pagelet) => {
    document.querySelector(`[data-pagelet="${pagelet}"]`)?.scrollIntoView({
      block: "center",
      inline: "nearest",
    });
  }, name);

  await waitRandom(500, 1000);
  return selector;
};

const openPostDetail = async (page: Page, postIndex: number) => {
  const name = pageletName(postIndex);

  const clicked = await page.evaluate(
    (pagelet, captionSel, linkSel) => {
      const root = document.querySelector(`[data-pagelet="${pagelet}"]`);
      if (!root) return { ok: false, reason: "missing-pagelet" as const };

      const caption = root.querySelector(captionSel) as HTMLElement | null;
      if (caption) {
        caption.click();
        return { ok: true, reason: "caption" as const };
      }

      const link = root.querySelector(linkSel) as HTMLElement | null;
      if (link) {
        link.click();
        return { ok: true, reason: "link" as const };
      }

      return { ok: false, reason: "missing-click-target" as const };
    },
    name,
    POST_CAPTION_SELECTOR,
    POST_LINK_SELECTOR,
  );

  if (!clicked.ok) {
    throw new Error(
      `Cannot open post #${postIndex + 1} (${pageletName(postIndex)}): ${clicked.reason}`,
    );
  }
};

/** like=Like, comment=Reply, share=Repost, send=Share */
const extractPostMetrics = async (page: Page): Promise<PostEngagementMetrics> => {
  const raw = await page.evaluate(
    (containerSel, spanSel) => {
      const root =
        document.querySelector('[data-pagelet="threads_post_page_0"]') || document.body;

      const readCountByAriaLabel = (label: string) => {
        const svg = root.querySelector(`svg[aria-label="${label}"]`);
        if (!svg) return "0";

        const button = svg.closest('[role="button"]');
        if (!button) return "0";

        const countSpans = Array.from(button.querySelectorAll("span"));
        for (const span of countSpans) {
          const text = (span.textContent || "").trim();
          if (!text) continue;
          if (/^[\d.,]+\s*[kmb]?$/i.test(text)) return text;
        }
        return "0";
      };

      let viewsText = "";
      const containers = Array.from(document.querySelectorAll(containerSel));
      for (const container of containers) {
        const spans = Array.from(container.querySelectorAll(spanSel));
        for (const span of spans) {
          const text = span.textContent?.trim() || "";
          if (/views/i.test(text)) {
            viewsText = text;
            break;
          }
        }
        if (viewsText) break;
      }

      if (!viewsText) {
        const all = Array.from(document.querySelectorAll(spanSel));
        for (const span of all) {
          const text = span.textContent?.trim() || "";
          if (/views/i.test(text)) {
            viewsText = text;
            break;
          }
        }
      }

      return {
        viewsText,
        like: readCountByAriaLabel("Like"),
        comment: readCountByAriaLabel("Reply"),
        share: readCountByAriaLabel("Repost"),
        send: readCountByAriaLabel("Share"),
      };
    },
    VIEWS_CONTAINER_SELECTOR,
    VIEWS_SPAN_SELECTOR,
  );

  if (!raw.viewsText) {
    throw new Error("Views text empty");
  }

  return {
    views: parseViewsCount(raw.viewsText),
    like: parseViewsCount(raw.like),
    comment: parseViewsCount(raw.comment),
    share: parseViewsCount(raw.share),
    send: parseViewsCount(raw.send),
  };
};

const checkFirstTwoPostViews = async (
  page: Page,
  profile: string,
  reportPath: string,
): Promise<PostEngagementMetrics[]> => {
  const results: PostEngagementMetrics[] = [];

  await page.evaluate(() => window.scrollBy(0, 400));
  await waitRandom(1500, 2500);

  for (let postIndex = 0; postIndex < POSTS_TO_CHECK; postIndex++) {
    await waitForPagelet(page, postIndex);
    await openPostDetail(page, postIndex);
    await waitRandom(2000, 3500);

    const viewsContainer = await page.waitForSelector(VIEWS_CONTAINER_SELECTOR, {
      timeout: 15_000,
    });
    if (!viewsContainer) {
      throw new Error(`Views container not found for post #${postIndex + 1}`);
    }

    // wait for engagement row (Like) to be present on post detail
    await page.waitForSelector('svg[aria-label="Like"]', { timeout: 10_000 }).catch(() => undefined);

    const metrics = await extractPostMetrics(page);
    const postUrl = page.url();

    console.log(
      `[@${profile}] post #${postIndex + 1}:`,
      `views=${metrics.views}`,
      `like=${metrics.like}`,
      `comment=${metrics.comment}`,
      `share=${metrics.share}`,
      `send=${metrics.send}`,
    );
    appendReportLine(reportPath, profile, postUrl, metrics);
    results.push(metrics);

    const backSvg = await page.waitForSelector(BACK_SVG_SELECTOR, { timeout: 10_000 });
    if (!backSvg) {
      throw new Error(`Back button not found for post #${postIndex + 1}`);
    }
    await backSvg.click();
    await waitRandom(1500, 2500);
  }

  return results;
};

export const checkAccountViews = async (
  { ws, groupId, reportName, profiles }: CheckAccountViewsProps,
  event: IpcMainEvent,
) => {
  // const profiles = ['lion.7170638', 'peter_grabbitt', 'lucky5456383', 'homebywu']
  const key = String(groupId);

  if (!reportName?.trim()) {
    throw new Error("reportName is required");
  }

  const reportPath = createReportFile(reportName.trim());
  const reportFileName = path.basename(reportPath);

  sendMessage(event, {
    username: key,
    message: `Report: ${reportFileName} | ${profiles.length} profiles (batch ${BATCH_SIZE})...`,
  });

  const browser = await puppeteer.connect({
    browserWSEndpoint: ws,
    defaultViewport: null,
  });

  try {
    const batches: string[][] = [];
    for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
      batches.push(profiles.slice(i, i + BATCH_SIZE));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      sendMessage(event, {
        username: key,
        message: `Batch ${batchIndex + 1}/${batches.length}: ${batch.length} profiles...`,
      });

      const tasks = batch.map(async (profile, index) => {
        if (index > 0) {
          await new Promise((resolve) => setTimeout(resolve, TAB_STAGGER_MS * index));
        }

        sendMessage(event, {
          username: key,
          message: `[@${profile}] Opening tab (batch ${batchIndex + 1}, ${index + 1}/${batch.length})...`,
        });

        try {
          const page = await browser.newPage();
          try {
            await page.goto(`https://threads.com/@${profile}`, {
              waitUntil: "domcontentloaded",
              timeout: 30_000,
            });
            sendMessage(event, {
              username: key,
              message: `[@${profile}] Tab opened, checking 2 posts...`,
            });

            await waitRandom(3000, 5000);
            const posts = await checkFirstTwoPostViews(page, profile, reportPath);
            const summary = posts
              .map(
                (m, i) =>
                  `#${i + 1} v=${m.views} l=${m.like} c=${m.comment} s=${m.share} send=${m.send}`,
              )
              .join(" | ");

            sendMessage(event, {
              username: key,
              message: `[@${profile}] ${summary} ✅`,
            });
          } finally {
            await page.close().catch(() => undefined);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`[@${profile}] Check views failed: ${message}`);
          sendMessage(event, {
            username: key,
            message: `[@${profile}] Check views failed: ${message}`,
          });
        }
      });

      await Promise.all(tasks);

      sendMessage(event, {
        username: key,
        message: `Done batch ${batchIndex + 1}/${batches.length} ✅`,
      });
    }

    sendMessage(event, {
      username: key,
      message: `Done ${profiles.length} profiles ✅ Report: ${reportFileName}`,
    });

    return { reportPath, reportFileName };
  } finally {
    await browser.disconnect();
  }
};
