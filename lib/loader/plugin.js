const contextMap = new Map();
const contextTimers = new Map();
const SymbolResolve = Symbol('Resolve');
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
        if (contextMap.size > 1000) {
            const oldest = contextMap.keys().next().value;
            if (oldest) {
                contextMap.delete(oldest);
                const t = contextTimers.get(oldest);
                if (t) {
                    clearTimeout(t);
                    contextTimers.delete(oldest);
                }
            }
        }
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
    awaitContext(...args) {
        return new Promise(resolve => {
            const ctx = this.setContext('resolveContext', ...args);
            ctx[SymbolResolve] = resolve;
        });
    }
    resolveContext(context) {
        this.finish('resolveContext');
        if (context?.[SymbolResolve]) {
            context[SymbolResolve](this.e);
        }
    }
    makeForwardMsg(title, msg, end, resmsg) {
        const parts = [];
        if (title) {
            parts.push(String(title));
        }
        if (typeof msg === 'string') {
            parts.push(...msg.split('\n\n').filter(Boolean));
        }
        else if (Array.isArray(msg)) {
            for (const m of msg) {
                parts.push(typeof m === 'string' ? m : String(m));
            }
        }
        else if (msg !== null && msg !== undefined) {
            parts.push(String(msg));
        }
        if (end) {
            parts.push(end);
        }
        if (resmsg) {
            parts.push(resmsg);
        }
        if (this.e?.isGroup && this.e.group?.makeForwardMsg) {
            const msgArr = parts.map(m => ({
                message: m,
                nickname: globalThis.Bot?.nickname ?? 'Bot',
                user_id: this.e.self_id ?? 0
            }));
            return this.e.group.makeForwardMsg(msgArr);
        }
        if (this.e?.friend?.makeForwardMsg) {
            const msgArr = parts.map(m => ({
                message: m,
                nickname: globalThis.Bot?.nickname ?? 'Bot',
                user_id: this.e.self_id ?? 0
            }));
            return this.e.friend.makeForwardMsg(msgArr);
        }
        return parts.join('\n────────\n');
    }
    renderImg(plugin, tpl, data = {}, cfg = {}) {
        if (this.e?.runtime?.render) {
            return this.e.runtime.render(plugin, tpl, data, cfg);
        }
        return false;
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
