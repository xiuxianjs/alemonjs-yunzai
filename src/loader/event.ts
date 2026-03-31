/**
 * AlemonJS 事件 → Yunzai e 对象适配器
 *
 * 将 AlemonJS 的 EventsEnum 转换为 Yunzai 插件期望的 e 对象，
 * 让现有 Yunzai 插件可以直接使用 e.msg / e.reply() / e.sender 等 API。
 */
import { EventsEnum, Format, useMessage } from 'alemonjs';
import type { MessageSegment } from './types';

/** 将 segment 写入 AlemonJS Format */
function appendSegmentToFormat(format: any, seg: MessageSegment) {
  switch (seg.type) {
    case 'text':
      if (seg.text) {
        format.addText(seg.text);
      }
      break;
    case 'image':
      if (seg.file && Buffer.isBuffer(seg.file)) {
        format.addImage(seg.file);
      } else if (seg.url || seg.file) {
        format.addImage(seg.url ?? seg.file);
      }
      break;
    case 'at':
      format.addText(`@${seg.qq ?? seg.text ?? ''} `);
      break;
    case 'face':
      format.addText(`[表情${seg.data}]`);
      break;
    default:
      if (seg.text) {
        format.addText(seg.text);
      }
      break;
  }
}

/** 将 Yunzai reply 内容发送到 AlemonJS */
async function sendReply(message: any, msg: any) {
  const format = Format.create();

  if (typeof msg === 'string') {
    format.addText(msg);
  } else if (Buffer.isBuffer(msg)) {
    format.addImage(msg);
  } else if (Array.isArray(msg)) {
    for (const seg of msg) {
      appendSegmentToFormat(format, seg);
    }
  } else if (msg && typeof msg === 'object') {
    appendSegmentToFormat(format, msg);
  }

  try {
    const result = await message.send({ format });

    return result;
  } catch (err) {
    console.error('[yunzai-loader] reply 发送失败:', err);

    return false;
  }
}

/**
 * 将 AlemonJS 事件转换为 Yunzai 兼容的 e 对象
 */
export function createYunzaiEvent(event: EventsEnum) {
  const [message] = useMessage(event);

  const isGroup = !event.IsPrivate;
  const msgText = event.MessageText ?? '';

  const e: any = {
    // ── 消息内容 ──
    msg: msgText,
    message: [{ type: 'text', text: msgText }],
    raw_message: msgText,

    // ── 用户信息 ──
    user_id: event.UserId ?? '',
    sender: {
      nickname: event.UserName ?? '',
      card: event.UserName ?? '',
      user_id: event.UserId ?? ''
    },

    // ── 群/频道信息 ──
    group_id: isGroup ? event.GuildId ?? '' : undefined,
    isGroup,
    isPrivate: !!event.IsPrivate,
    isGuild: false,

    // ── Bot ──
    self_id: event.BotId ?? '',
    bot: (globalThis as any).Bot ?? {},


    // ── 平台 ──
    platform: event.Platform || '',

    // ── 媒体 ──
    img: [] as string[],
    at: '',
    atBot: false,
    file: null,

    // ── 事件分类 ──
    post_type: 'message',
    message_type: isGroup ? 'group' : 'private',

    // ── 日志 ──
    logText: `[${isGroup ? event.GuildId ?? '群聊' : '私聊'}][${event.UserName ?? event.UserId}]`,
    logFnc: '',

    // ── 游戏标记 (插件可能用到) ──
    game: '',
    isSr: false,
    isGs: false,

    // ── reply 函数 ──
    reply: (msg: any, _quote = false, _data: any = {}) => {
      return sendReply(message, msg);
    },

    // ── 原始 AlemonJS 事件 (逃生口) ──
    _alemonEvent: event,
    _alemonMessage: message
  };

  return e;
}
