import { logger } from 'alemonjs';
import artTemplate from 'art-template';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { segment } from '../loader/segment.js';

let browser = null;
let screenshotCount = 0;
const MAX_SCREENSHOTS = 100;
async function ensureBrowser() {
    if (browser) {
        try {
            if (browser.isConnected()) {
                screenshotCount++;
                if (screenshotCount < MAX_SCREENSHOTS) {
                    return browser;
                }
                await closeBrowser();
            }
        }
        catch {
            browser = null;
        }
    }
    try {
        const puppeteer = await import('puppeteer');
        browser = await puppeteer.default.launch({
            headless: true,
            args: ['--disable-gpu', '--disable-setuid-sandbox', '--no-sandbox', '--no-zygote', '--disable-dev-shm-usage']
        });
        screenshotCount = 0;
        logger.info('[puppeteer] 浏览器已启动');
        return browser;
    }
    catch (err) {
        logger.error(`[puppeteer] 启动浏览器失败: ${err.message}`);
        logger.error('[puppeteer] 请确保已安装 puppeteer: npm i puppeteer');
        return null;
    }
}
async function closeBrowser() {
    if (browser) {
        try {
            await browser.close();
        }
        catch {
        }
        browser = null;
    }
}
function renderHtml(tplFile, data) {
    if (!existsSync(tplFile)) {
        throw new Error(`模板文件不存在: ${tplFile}`);
    }
    const raw = readFileSync(tplFile, 'utf-8');
    if (artTemplate) {
        return artTemplate.render(raw, { resPath: './resources/', ...data });
    }
    logger.warn('[puppeteer] art-template 未安装，使用简单替换。建议: npm i art-template');
    let html = raw;
    for (const [k, v] of Object.entries(data)) {
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
            html = html.replaceAll(`{{${k}}}`, String(v));
        }
    }
    return html;
}
function saveRenderedHtml(name, saveId, html) {
    const tmpDir = join(process.cwd(), 'temp', 'html', name);
    if (!existsSync(tmpDir)) {
        mkdirSync(tmpDir, { recursive: true });
    }
    const filePath = join(tmpDir, `${saveId}.html`);
    writeFileSync(filePath, html, 'utf-8');
    return filePath;
}
async function screenshot(name, data = {}) {
    const { tplFile, saveId = name, imgType = 'jpeg', quality = 90, omitBackground = false, multiPage = false, multiPageHeight = 4000, pageGotoParams } = data;
    if (!tplFile) {
        logger.error('[puppeteer] screenshot 缺少 tplFile 参数');
        return false;
    }
    try {
        const html = renderHtml(tplFile, data);
        const savedPath = saveRenderedHtml(name, saveId, html);
        const fileUrl = pathToFileURL(savedPath).href;
        const brw = await ensureBrowser();
        if (!brw) {
            return false;
        }
        const page = await brw.newPage();
        try {
            await page.goto(fileUrl, {
                timeout: 120000,
                waitUntil: 'networkidle2',
                ...pageGotoParams
            });
            const container = (await page.$('#container')) ?? (await page.$('body'));
            if (!container) {
                logger.error('[puppeteer] 未找到 #container 或 body 元素');
                return false;
            }
            const box = await container.boundingBox();
            if (!box) {
                return false;
            }
            const screenshotType = imgType === 'png' ? 'png' : 'jpeg';
            const screenshotQuality = screenshotType === 'png' ? undefined : Math.min(quality, 100);
            if (!multiPage) {
                const buf = await container.screenshot({
                    type: screenshotType,
                    quality: screenshotQuality,
                    omitBackground,
                    encoding: 'binary'
                });
                return segment.image(buf);
            }
            const pageCount = Math.ceil(box.height / multiPageHeight);
            const result = [];
            for (let i = 0; i < pageCount; i++) {
                const clipY = box.y + i * multiPageHeight;
                const clipH = Math.min(multiPageHeight, box.height - i * multiPageHeight);
                const buf = await page.screenshot({
                    type: screenshotType,
                    quality: screenshotQuality,
                    omitBackground,
                    clip: { x: box.x, y: clipY, width: box.width, height: clipH },
                    encoding: 'binary'
                });
                result.push(segment.image(buf));
            }
            return result.length > 0 ? result : false;
        }
        finally {
            await page.close();
        }
    }
    catch (err) {
        logger.error(`[puppeteer] 截图失败 ${name}: ${err.message}`);
        return false;
    }
}
function screenshots(name, data = {}) {
    data.multiPage = true;
    return screenshot(name, data);
}
var puppeteer = { screenshot, screenshots };

export { puppeteer as default, screenshot, screenshots };
