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
function createYunzaiEvent(event) {
    const [message] = useMessage(event);
    const isGroup = !event.IsPrivate;
    const msgText = event.MessageText ?? '';
    const e = {
        msg: msgText,
        message: [{ type: 'text', text: msgText }],
        raw_message: msgText,
        user_id: event.UserId ?? '',
        sender: {
            nickname: event.UserName ?? '',
            card: event.UserName ?? '',
            user_id: event.UserId ?? ''
        },
        group_id: isGroup ? event.GuildId ?? '' : undefined,
        isGroup,
        isPrivate: !!event.IsPrivate,
        isGuild: false,
        self_id: event.BotId ?? '',
        bot: globalThis.Bot ?? {},
        platform: event.Platform || '',
        img: [],
        at: '',
        atBot: false,
        file: null,
        post_type: 'message',
        message_type: isGroup ? 'group' : 'private',
        logText: `[${isGroup ? event.GuildId ?? '群聊' : '私聊'}][${event.UserName ?? event.UserId}]`,
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
    return e;
}

export { createYunzaiEvent };
