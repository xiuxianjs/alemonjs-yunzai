import { useMessage, Format } from 'alemonjs';

function appendSegmentToFormat(format, seg) {
    switch (seg.type) {
        case 'text':
            if (seg.text) {
                format.addText(seg.text);
            }
            break;
        case 'image':
            if (seg.file && Buffer.isBuffer(seg.file)) {
                format.addImage(seg.file);
            }
            else if (seg.url || seg.file) {
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
async function sendReply(message, msg) {
    const format = Format.create();
    if (typeof msg === 'string') {
        format.addText(msg);
    }
    else if (Buffer.isBuffer(msg)) {
        format.addImage(msg);
    }
    else if (Array.isArray(msg)) {
        for (const seg of msg) {
            appendSegmentToFormat(format, seg);
        }
    }
    else if (msg && typeof msg === 'object') {
        appendSegmentToFormat(format, msg);
    }
    try {
        const result = await message.send({ format });
        return result;
    }
    catch (err) {
        console.error('[yunzai-loader] reply 发送失败:', err);
        return false;
    }
}
const EVENT_NOTICE_MAP = {
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
const EVENT_REQUEST_MAP = {
    'private.friend.add': { request_type: 'friend', sub_type: 'add' },
    'private.guild.add': { request_type: 'group', sub_type: 'invite' }
};
function isPrivateEvent(name) {
    return name.startsWith('private.');
}
function createYunzaiEvent(event) {
    const [message] = useMessage(event);
    const eventName = event.name ?? '';
    const isGroup = !event.IsPrivate;
    const msgText = event.MessageText ?? '';
    const userId = event.UserId ?? '';
    const userName = event.UserName ?? '';
    const groupId = isGroup ? (event.GuildId ?? '') : undefined;
    const noticeInfo = EVENT_NOTICE_MAP[eventName];
    const requestInfo = EVENT_REQUEST_MAP[eventName];
    const e = {
        msg: msgText,
        message: [{ type: 'text', text: msgText }],
        raw_message: msgText,
        user_id: userId,
        sender: {
            nickname: userName,
            card: userName,
            user_id: userId
        },
        group_id: groupId,
        isGroup,
        isPrivate: !!event.IsPrivate || isPrivateEvent(eventName),
        isGuild: false,
        self_id: event.BotId ?? '',
        bot: globalThis.Bot ?? {},
        isMaster: event.IsMaster ?? false,
        isOwner: event.IsMaster ?? false,
        isAdmin: event.IsMaster ?? false,
        platform: event.Platform || '',
        img: [],
        at: '',
        atBot: false,
        file: null,
        logFnc: '',
        game: '',
        isSr: false,
        isGs: false,
        reply: (msg, _quote = false, _data = {}) => {
            return sendReply(message, msg);
        },
        _alemonEvent: event,
        _alemonMessage: message
    };
    if (noticeInfo) {
        e.post_type = 'notice';
        e.notice_type = noticeInfo.notice_type;
        e.sub_type = noticeInfo.sub_type;
        e.operator_id = userId;
        e.message_type = isGroup ? 'group' : 'private';
        e.logText = `[Notice:${noticeInfo.notice_type}:${groupId ?? userId}]`;
        e.member = {
            user_id: userId,
            card: userName,
            nickname: userName,
            role: 'member',
            is_admin: false,
            is_owner: false,
            _info: { card: userName, nickname: userName }
        };
    }
    else if (requestInfo) {
        e.post_type = 'request';
        e.request_type = requestInfo.request_type;
        e.sub_type = requestInfo.sub_type;
        e.comment = '';
        e.flag = `${eventName}_${Date.now()}`;
        e.message_type = isGroup ? 'group' : 'private';
        e.logText = `[Request:${requestInfo.request_type}:${userId}]`;
        e.approve = () => Promise.resolve(true);
        e.reject = () => Promise.resolve(true);
    }
    else {
        e.post_type = 'message';
        e.message_type = isGroup ? 'group' : 'private';
        e.logText = `[${isGroup ? (groupId ?? '群聊') : '私聊'}][${userName ?? userId}]`;
    }
    return e;
}

export { createYunzaiEvent };
