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

// ━━━━━━━━━━━━━ 事件类型映射 ━━━━━━━━━━━━━

/** AlemonJS 事件名 → Yunzai post_type + 子类型映射 */
const EVENT_NOTICE_MAP: Record<string, { notice_type: string; sub_type: string }> = {
  'member.add': { notice_type: 'group_increase', sub_type: 'approve' },
  'member.remove': { notice_type: 'group_decrease', sub_type: 'leave' },
  'member.ban': { notice_type: 'group_ban', sub_type: 'ban' },
  'member.unban': { notice_type: 'group_ban', sub_type: 'lift_ban' },
  'member.update': { notice_type: 'group_admin', sub_type: 'set' },
  'notice.create': { notice_type: 'notify', sub_type: 'poke' },
  'private.notice.create': { notice_type: 'notify', sub_type: 'poke' },
  'message.delete': { notice_type: 'group_recall', sub_type: '' },
  'private.message.delete': { notice_type: 'friend_recall', sub_type: '' }
};

const EVENT_REQUEST_MAP: Record<string, { request_type: string; sub_type: string }> = {
  'private.friend.add': { request_type: 'friend', sub_type: 'add' },
  'private.guild.add': { request_type: 'group', sub_type: 'invite' }
};

/** 判断事件是否私聊 */
function isPrivateEvent(name: string): boolean {
  return name.startsWith('private.');
}

/**
 * 将 AlemonJS 事件转换为 Yunzai 兼容的 e 对象
 */
export function createYunzaiEvent(event: EventsEnum) {
  const [message] = useMessage(event);

  const eventName: string = (event as any).name ?? '';
  const isGroup = !event.IsPrivate;
  const msgText = event.MessageText ?? '';
  const userId = event.UserId ?? '';
  const userName = event.UserName ?? '';
  const groupId = isGroup ? ((event as any).GuildId ?? '') : undefined;

  // ── 事件分类 ──
  const noticeInfo = EVENT_NOTICE_MAP[eventName];
  const requestInfo = EVENT_REQUEST_MAP[eventName];

  const e: any = {
    // ── 消息内容 ──
    msg: msgText,
    message: [{ type: 'text', text: msgText }],
    raw_message: msgText,

    // ── 用户信息 ──
    user_id: userId,
    sender: {
      nickname: userName,
      card: userName,
      user_id: userId
    },

    // ── 群/频道信息 ──
    group_id: groupId,
    isGroup,
    isPrivate: !!event.IsPrivate || isPrivateEvent(eventName),
    isGuild: false,

    // ── Bot ──
    self_id: event.BotId ?? '',
    bot: (globalThis as any).Bot ?? {},

    // ── 权限 ──
    isMaster: event.IsMaster ?? false,
    isOwner: event.IsMaster ?? false,
    isAdmin: event.IsMaster ?? false,

    // ── 平台 ──
    platform: event.Platform || '',

    // ── 媒体 ──
    img: [] as string[],
    at: '',
    atBot: false,
    file: null,

    // ── 日志 ──
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

  // ── 按事件类型填充分类字段 ──
  if (noticeInfo) {
    e.post_type = 'notice';
    e.notice_type = noticeInfo.notice_type;
    e.sub_type = noticeInfo.sub_type;
    e.operator_id = userId;
    e.message_type = isGroup ? 'group' : 'private';
    e.logText = `[Notice:${noticeInfo.notice_type}:${groupId ?? userId}]`;

    // notice 事件插件可能访问 e.member
    e.member = {
      user_id: userId,
      card: userName,
      nickname: userName,
      role: 'member',
      is_admin: false,
      is_owner: false,
      _info: { card: userName, nickname: userName }
    };
  } else if (requestInfo) {
    e.post_type = 'request';
    e.request_type = requestInfo.request_type;
    e.sub_type = requestInfo.sub_type;
    e.comment = '';
    e.flag = `${eventName}_${Date.now()}`;
    e.message_type = isGroup ? 'group' : 'private';
    e.logText = `[Request:${requestInfo.request_type}:${userId}]`;
    e.approve = () => Promise.resolve(true);
    e.reject = () => Promise.resolve(true);
  } else {
    // 消息事件 (默认)
    e.post_type = 'message';
    e.message_type = isGroup ? 'group' : 'private';
    e.logText = `[${isGroup ? (groupId ?? '群聊') : '私聊'}][${userName ?? userId}]`;
  }

  return e;
}
