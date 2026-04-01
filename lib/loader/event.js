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
        case 'button':
            if (seg.buttons?.length) {
                const labels = seg.buttons.map((b) => b.text).join(' | ');
                format.addText(`[${labels}]`);
            }
            break;
        default:
            if (seg.text) {
                format.addText(seg.text);
            }
            break;
    }
}
function makeForwardMsgFallback(msgArr) {
    const parts = [];
    for (const item of msgArr) {
        if (typeof item === 'string') {
            parts.push(item);
        }
        else if (item?.message) {
            if (typeof item.message === 'string') {
                parts.push(item.message);
            }
            else if (Array.isArray(item.message)) {
                parts.push(item.message
                    .filter((s) => s.type === 'text')
                    .map((s) => s.text ?? '')
                    .join(''));
            }
        }
    }
    return parts.join('\n────────\n');
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
const NOT_SET = Symbol('NOT_SET');
function defineLazy(obj, prop, factory) {
    let value = NOT_SET;
    Object.defineProperty(obj, prop, {
        get() {
            if (value === NOT_SET) {
                value = factory();
            }
            return value;
        },
        set(v) {
            value = v;
        },
        configurable: true,
        enumerable: true
    });
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
    const imgs = [];
    const messageSegments = [];
    if (msgText) {
        messageSegments.push({ type: 'text', text: msgText });
    }
    const rawMedia = event.MessageMedia ?? [];
    for (const item of rawMedia) {
        const url = item.Url ?? item.FileId ?? '';
        switch (item.Type) {
            case 'image':
                messageSegments.push({ type: 'image', url, file: url });
                if (url) {
                    imgs.push(url);
                }
                break;
            case 'audio':
                messageSegments.push({ type: 'record', file: url });
                break;
            case 'video':
                messageSegments.push({ type: 'video', file: url });
                break;
            case 'file':
                messageSegments.push({ type: 'file', file: url, name: item.FileName ?? '' });
                break;
        }
    }
    if (messageSegments.length === 0) {
        messageSegments.push({ type: 'text', text: '' });
    }
    const noticeInfo = EVENT_NOTICE_MAP[eventName];
    const requestInfo = EVENT_REQUEST_MAP[eventName];
    const e = {
        msg: msgText,
        message: messageSegments,
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
        img: imgs,
        at: '',
        atBot: false,
        file: null,
        source: null,
        logFnc: '',
        original_msg: msgText,
        group_name: '',
        game: '',
        isSr: false,
        isGs: false,
        toString: () => msgText,
        reply: (msg, _quote = false, _data = {}) => {
            return sendReply(message, msg);
        },
        _alemonEvent: event,
        _alemonMessage: message
    };
    if (isGroup) {
        defineLazy(e, 'group', () => ({
            group_id: groupId,
            name: '',
            is_owner: false,
            is_admin: false,
            sendMsg: (msg) => sendReply(message, msg),
            makeForwardMsg: (msgArr) => Promise.resolve(makeForwardMsgFallback(msgArr)),
            recallMsg: () => Promise.resolve(true),
            pickMember: (uid) => ({
                info: { user_id: uid, card: '', nickname: '' },
                getAvatarUrl: () => Promise.resolve('')
            }),
            getMemberMap: () => Promise.resolve(new Map()),
            getChatHistory: (_seq, _count) => Promise.resolve([]),
            sendFile: (_filePath) => {
                console.warn('[yunzai-loader] e.group.sendFile 暂不支持');
                return Promise.resolve(false);
            },
            getFileUrl: (_fid) => {
                console.warn('[yunzai-loader] e.group.getFileUrl 暂不支持');
                return Promise.resolve('');
            },
            quit: () => {
                console.warn('[yunzai-loader] e.group.quit 暂不支持');
                return Promise.resolve(false);
            },
            setCard: (_uid, _card) => Promise.resolve(true),
            muteMember: (_uid, _duration) => Promise.resolve(true),
            kickMember: (_uid) => Promise.resolve(true)
        }));
    }
    defineLazy(e, 'friend', () => ({
        user_id: userId,
        nickname: userName,
        sendMsg: (msg) => sendReply(message, msg),
        makeForwardMsg: (msgArr) => Promise.resolve(makeForwardMsgFallback(msgArr)),
        recallMsg: () => Promise.resolve(true),
        getChatHistory: (_time, _count) => Promise.resolve([]),
        sendFile: (_filePath) => {
            console.warn('[yunzai-loader] e.friend.sendFile 暂不支持');
            return Promise.resolve(false);
        },
        getAvatarUrl: () => Promise.resolve('')
    }));
    defineLazy(e, 'member', () => ({
        user_id: userId,
        card: userName,
        nickname: userName,
        role: 'member',
        is_admin: false,
        is_owner: false,
        _info: { card: userName, nickname: userName },
        getAvatarUrl: () => Promise.resolve('')
    }));
    defineLazy(e, 'runtime', () => ({
        render: async (pluginName, tpl, data = {}, cfg = {}) => {
            try {
                const pup = globalThis.puppeteer ?? (await import('../puppeteer/puppeteer.js')).default;
                if (pup?.screenshot) {
                    const img = await pup.screenshot(`${pluginName}/${tpl}`, { ...data, ...cfg });
                    if (cfg?.retType === 'base64') {
                        return img;
                    }
                    if (img) {
                        await e.reply(img);
                    }
                    return img;
                }
            }
            catch (err) {
                console.error('[yunzai-loader] runtime.render 失败:', err.message);
            }
            return false;
        },
        getUid: () => e.user_id,
        handler: null,
        user: null,
        cfg: globalThis.cfg ?? {}
    }));
    if (noticeInfo) {
        e.post_type = 'notice';
        e.notice_type = noticeInfo.notice_type;
        e.sub_type = noticeInfo.sub_type;
        e.operator_id = userId;
        e.message_type = isGroup ? 'group' : 'private';
        e.logText = `[Notice:${noticeInfo.notice_type}:${groupId ?? userId}]`;
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
