import { existsSync, mkdirSync, createWriteStream } from 'node:fs';
import { dirname } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function downFile(fileUrl, savePath, param = {}) {
    try {
        const dir = dirname(savePath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        const response = await fetch(fileUrl, param);
        if (!response.ok || !response.body) {
            return false;
        }
        const readable = Readable.fromWeb(response.body);
        await pipeline(readable, createWriteStream(savePath));
        return true;
    }
    catch (err) {
        console.error(`下载文件错误：${err}`);
        return false;
    }
}
async function relpyPrivate(userId, msg) {
    const g = globalThis;
    if (g.Bot?.pickUser) {
        try {
            return await g.Bot.pickUser(userId).sendMsg(msg);
        }
        catch {
        }
    }
    console.warn(`[common] relpyPrivate: 无法向 ${userId} 发送私聊消息`);
    return false;
}
async function makeForwardMsg(e, msg = [], dec = '', msgsscr = false) {
    if (!Array.isArray(msg)) {
        msg = [msg];
    }
    const g = globalThis;
    const name = msgsscr ? (e?.sender?.card ?? e?.user_id ?? '') : (g.Bot?.nickname ?? 'Bot');
    const id = msgsscr ? (e?.user_id ?? 0) : (g.Bot?.uin ?? 0);
    const userInfo = { user_id: id, nickname: name };
    const forwardMsg = msg.filter(Boolean).map((message) => ({ ...userInfo, message }));
    try {
        if (e?.group?.makeForwardMsg) {
            return await e.group.makeForwardMsg(forwardMsg);
        }
        if (e?.friend?.makeForwardMsg) {
            return await e.friend.makeForwardMsg(forwardMsg);
        }
    }
    catch {
    }
    const text = msg.filter(Boolean).map(String).join('\n');
    return dec ? `${dec}\n────────\n${text}` : text;
}
var common = { sleep, relpyPrivate, downFile, makeForwardMsg };

export { common as default, downFile, makeForwardMsg, relpyPrivate, sleep };
