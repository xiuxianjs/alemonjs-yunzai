/**
 * Yunzai common 兼容层
 */
import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

/**
 * 休眠函数
 * @param ms 毫秒
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 下载保存文件
 * @param fileUrl 下载地址
 * @param savePath 保存路径
 * @param param fetch 参数
 */
export async function downFile(fileUrl: string, savePath: string, param: any = {}): Promise<boolean> {
  try {
    const dir = dirname(savePath);

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const response = await fetch(fileUrl, param);

    if (!response.ok || !response.body) {
      return false;
    }

    const readable = Readable.fromWeb(response.body as any);

    await pipeline(readable, createWriteStream(savePath));

    return true;
  } catch (err) {
    console.error(`下载文件错误：${err}`);

    return false;
  }
}

/**
 * 发送私聊消息（桩实现，非 QQ 平台降级为日志提示）
 */
export async function relpyPrivate(userId: string | number, msg: any) {
  const g = globalThis as any;

  if (g.Bot?.pickUser) {
    try {
      return await g.Bot.pickUser(userId).sendMsg(msg);
    } catch {
      /* ignore */
    }
  }

  console.warn(`[common] relpyPrivate: 无法向 ${userId} 发送私聊消息`);

  return false;
}

/**
 * 制作转发消息
 */
export async function makeForwardMsg(e: any, msg: any = [], dec = '', msgsscr = false): Promise<any> {
  if (!Array.isArray(msg)) {
    msg = [msg];
  }

  const g = globalThis as any;
  const name = msgsscr ? (e?.sender?.card ?? e?.user_id ?? '') : (g.Bot?.nickname ?? 'Bot');
  const id = msgsscr ? (e?.user_id ?? 0) : (g.Bot?.uin ?? 0);

  const userInfo = { user_id: id, nickname: name };

  const forwardMsg = msg.filter(Boolean).map((message: any) => ({ ...userInfo, message }));

  try {
    if (e?.group?.makeForwardMsg) {
      return await e.group.makeForwardMsg(forwardMsg);
    }

    if (e?.friend?.makeForwardMsg) {
      return await e.friend.makeForwardMsg(forwardMsg);
    }
  } catch {
    /* fallback */
  }

  const text = msg.filter(Boolean).map(String).join('\n');

  return dec ? `${dec}\n────────\n${text}` : text;
}

export default { sleep, relpyPrivate, downFile, makeForwardMsg };
