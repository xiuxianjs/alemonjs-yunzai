const contextMap = new Map();
const contextTimers = new Map();
class YunzaiPlugin {
    name;
    dsc;
    event;
    priority;
    rule;
    task;
    handler;
    namespace;
    e = null;
    constructor(options = {}) {
        this.name = options.name ?? 'unnamed';
        this.dsc = options.dsc ?? '';
        this.event = options.event ?? 'message';
        this.priority = options.priority ?? 5000;
        this.rule = options.rule ?? [];
        this.task = options.task ?? { cron: '', fnc: '' };
        this.handler = options.handler ?? null;
        this.namespace = options.namespace ?? '';
    }
    reply(msg, quote = false, data = {}) {
        if (!this.e?.reply) {
            console.warn(`[${this.name}] reply 调用失败: 没有事件上下文`);
            return Promise.resolve(false);
        }
        return this.e.reply(msg, quote, data);
    }
    setContext(type, isGroup = false, time = 120, timeout = '操作超时已取消') {
        const key = `${this.name}.${this.conKey(isGroup)}.${type}`;
        const existing = contextTimers.get(key);
        if (existing) {
            clearTimeout(existing);
        }
        const ctx = { fnc: type, plugin: this.name };
        contextMap.set(key, ctx);
        if (time > 0) {
            const timer = setTimeout(() => {
                contextMap.delete(key);
                contextTimers.delete(key);
                if (timeout && this.e?.reply) {
                    this.e.reply(timeout);
                }
            }, time * 1000);
            contextTimers.set(key, timer);
        }
        return ctx;
    }
    getContext(type, isGroup = false) {
        if (!type) {
            const prefix = `${this.name}.`;
            const result = {};
            for (const [k, v] of contextMap) {
                if (k.startsWith(prefix)) {
                    result[k] = v;
                }
            }
            return Object.keys(result).length ? result : undefined;
        }
        const key = `${this.name}.${this.conKey(isGroup)}.${type}`;
        return contextMap.get(key);
    }
    finish(type, isGroup = false) {
        const key = `${this.name}.${this.conKey(isGroup)}.${type}`;
        contextMap.delete(key);
        const timer = contextTimers.get(key);
        if (timer) {
            clearTimeout(timer);
            contextTimers.delete(key);
        }
    }
    conKey(isGroup = false) {
        if (!this.e) {
            return 'unknown';
        }
        if (isGroup) {
            return `${this.e.group_id ?? ''}`;
        }
        return `${this.e.user_id ?? ''}`;
    }
}
function findContext(e) {
    const userId = e.user_id ?? '';
    const groupId = e.group_id ?? '';
    for (const [key, ctx] of contextMap) {
        const parts = key.split('.');
        if (parts.length < 3) {
            continue;
        }
        const conKey = parts[1];
        if ((userId && conKey === String(userId)) || (groupId && conKey === String(groupId))) {
            return { pluginName: ctx.plugin, fnc: ctx.fnc };
        }
    }
    return null;
}

export { YunzaiPlugin, findContext };
