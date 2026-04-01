import { logger } from 'alemonjs';
import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PACKAGE_ROOT } from '../path.js';
import { YunzaiPlugin, findContext } from './plugin.js';
import { segment } from './segment.js';

function parseCron(cron) {
    if (!cron) {
        return null;
    }
    const parts = cron.trim().split(/\s+/);
    if (parts.length >= 5) {
        for (let i = 0; i < Math.min(parts.length, 3); i++) {
            const m = parts[i].match(/^\*\/(\d+)$/);
            if (m) {
                const n = parseInt(m[1]);
                const multipliers = [1000, 60000, 3600000];
                return { interval: n * multipliers[i] };
            }
        }
        return { interval: 86400000 };
    }
    return null;
}
const taskTimers = [];
class PluginLoader {
    priority = [];
    pluginsDir;
    constructor(pluginsDir) {
        this.pluginsDir = pluginsDir;
    }
    get pluginCount() {
        return this.priority.length;
    }
    async setupGlobals() {
        const g = globalThis;
        g.plugin = YunzaiPlugin;
        g.segment = segment;
        g.logger ??= logger;
        if (g.logger && !g.logger.red) {
            try {
                const chalk = (await import('chalk')).default;
                g.logger.chalk = chalk;
                g.logger.red = chalk.red;
                g.logger.green = chalk.green;
                g.logger.yellow = chalk.yellow;
                g.logger.blue = chalk.blue;
                g.logger.magenta = chalk.magenta;
                g.logger.cyan = chalk.cyan;
            }
            catch {
                const identity = (s) => s;
                g.logger.chalk = identity;
                g.logger.red = identity;
                g.logger.green = identity;
                g.logger.yellow = identity;
                g.logger.blue = identity;
                g.logger.magenta = identity;
                g.logger.cyan = identity;
            }
        }
        g.Bot ??= {
            uin: 0,
            nickname: 'Bot',
            fl: new Map(),
            gl: new Map(),
            gml: new Map(),
            stat: {
                start_time: Math.floor(Date.now() / 1000),
                recv_msg_cnt: 0,
                sent_msg_cnt: 0
            },
            pickUser: (uid) => ({
                user_id: uid,
                sendMsg: () => Promise.resolve({}),
                getAvatarUrl: () => Promise.resolve('')
            }),
            pickGroup: (gid) => ({
                group_id: gid,
                name: '',
                is_owner: false,
                is_admin: false,
                sendMsg: () => Promise.resolve({}),
                pickMember: (uid) => ({
                    info: { user_id: uid, card: '', nickname: '' },
                    getAvatarUrl: () => Promise.resolve('')
                }),
                getMemberMap: () => Promise.resolve(new Map()),
                getChatHistory: () => Promise.resolve([]),
                makeForwardMsg: (arr) => Promise.resolve(arr),
                recallMsg: () => Promise.resolve(true),
                sendFile: () => Promise.resolve(false),
                getFileUrl: () => Promise.resolve(''),
                quit: () => Promise.resolve(false),
                setCard: () => Promise.resolve(true),
                muteMember: () => Promise.resolve(true),
                kickMember: () => Promise.resolve(true)
            }),
            pickFriend: (uid) => ({
                user_id: uid,
                sendMsg: () => Promise.resolve({}),
                getAvatarUrl: () => Promise.resolve(''),
                getChatHistory: () => Promise.resolve([]),
                sendFile: () => Promise.resolve(false),
                makeForwardMsg: (arr) => Promise.resolve(arr),
                recallMsg: () => Promise.resolve(true)
            }),
            sendGroupMsg: () => Promise.resolve({}),
            sendPrivateMsg: () => Promise.resolve({}),
            getGroupMemberInfo: (_gid, _uid) => Promise.resolve({ user_id: _uid, card: '', nickname: '', role: 'member' }),
            getGroupMemberList: (_gid) => Promise.resolve([]),
            getGroupInfo: (_gid) => Promise.resolve({ group_id: _gid, group_name: '' }),
            getFriendList: () => Promise.resolve([])
        };
        if (!g.redis) {
            const store = new Map();
            const hashStore = new Map();
            const sortedSetStore = new Map();
            const listStore = new Map();
            const setStore = new Map();
            const cleanup = (key) => {
                const item = store.get(key);
                if (item?.expireAt && Date.now() > item.expireAt) {
                    store.delete(key);
                    return true;
                }
                return false;
            };
            g.redis = {
                get: (key) => {
                    cleanup(key);
                    return Promise.resolve(store.get(key)?.value ?? null);
                },
                set: (key, val, options) => {
                    const entry = { value: val };
                    if (options?.EX) {
                        entry.expireAt = Date.now() + options.EX * 1000;
                    }
                    store.set(key, entry);
                    return Promise.resolve('OK');
                },
                del: (key) => {
                    store.delete(key);
                    hashStore.delete(key);
                    sortedSetStore.delete(key);
                    listStore.delete(key);
                    setStore.delete(key);
                    return Promise.resolve(1);
                },
                keys: (pattern) => {
                    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
                    const allKeys = new Set([...store.keys(), ...hashStore.keys(), ...sortedSetStore.keys(), ...listStore.keys(), ...setStore.keys()]);
                    return Promise.resolve([...allKeys].filter(k => {
                        cleanup(k);
                        return (store.has(k) || hashStore.has(k) || sortedSetStore.has(k) || listStore.has(k) || setStore.has(k)) && regex.test(k);
                    }));
                },
                incr: (key) => {
                    cleanup(key);
                    const val = parseInt(store.get(key)?.value ?? '0') + 1;
                    store.set(key, { value: String(val) });
                    return Promise.resolve(val);
                },
                expire: (_key, _seconds) => Promise.resolve(true),
                exists: (key) => {
                    cleanup(key);
                    return Promise.resolve(store.has(key) || hashStore.has(key) || sortedSetStore.has(key) || listStore.has(key) || setStore.has(key) ? 1 : 0);
                },
                setEx: (key, ttl, val) => {
                    store.set(key, { value: val, expireAt: Date.now() + ttl * 1000 });
                    return Promise.resolve('OK');
                },
                hGet: (key, field) => {
                    return Promise.resolve(hashStore.get(key)?.get(field) ?? null);
                },
                hSet: (key, field, value) => {
                    if (!hashStore.has(key)) {
                        hashStore.set(key, new Map());
                    }
                    hashStore.get(key).set(field, value);
                    return Promise.resolve(1);
                },
                hDel: (key, ...fields) => {
                    const hash = hashStore.get(key);
                    if (!hash) {
                        return Promise.resolve(0);
                    }
                    let count = 0;
                    for (const f of fields) {
                        if (hash.delete(f)) {
                            count++;
                        }
                    }
                    return Promise.resolve(count);
                },
                hGetAll: (key) => {
                    const hash = hashStore.get(key);
                    if (!hash) {
                        return Promise.resolve({});
                    }
                    const result = {};
                    for (const [k, v] of hash) {
                        result[k] = v;
                    }
                    return Promise.resolve(result);
                },
                zAdd: (key, ...args) => {
                    if (!sortedSetStore.has(key)) {
                        sortedSetStore.set(key, []);
                    }
                    const arr = sortedSetStore.get(key);
                    for (let i = 0; i < args.length; i++) {
                        let score;
                        let value;
                        if (typeof args[i] === 'object' && args[i] !== null) {
                            score = args[i].score;
                            value = args[i].value;
                        }
                        else {
                            score = Number(args[i]);
                            value = String(args[++i]);
                        }
                        const idx = arr.findIndex(e => e.value === value);
                        if (idx >= 0) {
                            arr[idx].score = score;
                        }
                        else {
                            arr.push({ value, score });
                        }
                    }
                    arr.sort((a, b) => a.score - b.score);
                    return Promise.resolve(1);
                },
                zScore: (key, member) => {
                    const entry = sortedSetStore.get(key)?.find(e => e.value === member);
                    return Promise.resolve(entry ? entry.score : null);
                },
                zRange: (key, start, stop) => {
                    const arr = sortedSetStore.get(key) ?? [];
                    const len = arr.length;
                    const s = start < 0 ? Math.max(0, len + start) : start;
                    const e = stop < 0 ? len + stop : stop;
                    return Promise.resolve(arr.slice(s, e + 1).map(x => x.value));
                },
                zRangeWithScores: (key, start, stop) => {
                    const arr = sortedSetStore.get(key) ?? [];
                    const len = arr.length;
                    const s = start < 0 ? Math.max(0, len + start) : start;
                    const e = stop < 0 ? len + stop : stop;
                    return Promise.resolve(arr.slice(s, e + 1));
                },
                zRevRange: (key, start, stop) => {
                    const arr = [...(sortedSetStore.get(key) ?? [])].reverse();
                    const len = arr.length;
                    const s = start < 0 ? Math.max(0, len + start) : start;
                    const e = stop < 0 ? len + stop : stop;
                    return Promise.resolve(arr.slice(s, e + 1).map(x => x.value));
                },
                zRevRank: (key, member) => {
                    const arr = sortedSetStore.get(key) ?? [];
                    const reversed = [...arr].reverse();
                    const idx = reversed.findIndex(e => e.value === member);
                    return Promise.resolve(idx >= 0 ? idx : null);
                },
                zRem: (key, ...members) => {
                    const arr = sortedSetStore.get(key);
                    if (!arr) {
                        return Promise.resolve(0);
                    }
                    let removed = 0;
                    for (const m of members) {
                        const idx = arr.findIndex(e => e.value === m);
                        if (idx >= 0) {
                            arr.splice(idx, 1);
                            removed++;
                        }
                    }
                    return Promise.resolve(removed);
                },
                zCard: (key) => {
                    return Promise.resolve(sortedSetStore.get(key)?.length ?? 0);
                },
                zRangeByScore: (key, min, max) => {
                    const arr = sortedSetStore.get(key) ?? [];
                    const lo = min === '-inf' ? -Infinity : Number(min);
                    const hi = max === '+inf' ? Infinity : Number(max);
                    return Promise.resolve(arr.filter(e => e.score >= lo && e.score <= hi).map(e => e.value));
                },
                zRangeByScoreWithScores: (key, min, max) => {
                    const arr = sortedSetStore.get(key) ?? [];
                    const lo = min === '-inf' ? -Infinity : Number(min);
                    const hi = max === '+inf' ? Infinity : Number(max);
                    return Promise.resolve(arr.filter(e => e.score >= lo && e.score <= hi));
                },
                zRemRangeByScore: (key, min, max) => {
                    const arr = sortedSetStore.get(key);
                    if (!arr) {
                        return Promise.resolve(0);
                    }
                    const lo = min === '-inf' ? -Infinity : Number(min);
                    const hi = max === '+inf' ? Infinity : Number(max);
                    const before = arr.length;
                    const filtered = arr.filter(e => e.score < lo || e.score > hi);
                    sortedSetStore.set(key, filtered);
                    return Promise.resolve(before - filtered.length);
                },
                lPush: (key, ...values) => {
                    if (!listStore.has(key)) {
                        listStore.set(key, []);
                    }
                    const list = listStore.get(key);
                    list.unshift(...values);
                    return Promise.resolve(list.length);
                },
                lRange: (key, start, stop) => {
                    const list = listStore.get(key);
                    if (!list) {
                        return Promise.resolve([]);
                    }
                    const s = start < 0 ? Math.max(0, list.length + start) : start;
                    const e = stop < 0 ? list.length + stop : stop;
                    return Promise.resolve(list.slice(s, e + 1));
                },
                sAdd: (key, ...members) => {
                    if (!setStore.has(key)) {
                        setStore.set(key, new Set());
                    }
                    const set = setStore.get(key);
                    let added = 0;
                    for (const m of members) {
                        if (!set.has(m)) {
                            set.add(m);
                            added++;
                        }
                    }
                    return Promise.resolve(added);
                },
                sMembers: (key) => {
                    const set = setStore.get(key);
                    if (!set) {
                        return Promise.resolve([]);
                    }
                    return Promise.resolve([...set]);
                }
            };
            setInterval(() => {
                const now = Date.now();
                for (const [key, item] of store) {
                    if (item.expireAt && now > item.expireAt) {
                        store.delete(key);
                    }
                }
            }, 60000);
        }
        if (!g.cfg) {
            try {
                const { default: cfg } = await import('../config/config.js');
                g.cfg = cfg;
            }
            catch {
            }
        }
        if (!g.common) {
            try {
                const { default: common } = await import('../common/common.js');
                g.common = common;
            }
            catch {
            }
        }
    }
    async load() {
        await this.setupGlobals();
        this.priority = [];
        if (!existsSync(this.pluginsDir)) {
            logger.warn(`[yunzai-loader] 插件目录不存在: ${this.pluginsDir}`);
            return;
        }
        const dirs = readdirSync(this.pluginsDir);
        const ownDir = resolve(PACKAGE_ROOT);
        for (const dir of dirs) {
            const dirPath = join(this.pluginsDir, dir);
            if (!statSync(dirPath).isDirectory()) {
                continue;
            }
            if (resolve(dirPath) === ownDir) {
                continue;
            }
            try {
                await this.loadPluginDir(dirPath, dir);
            }
            catch (err) {
                logger.error(`[yunzai-loader] 加载插件目录 ${dir} 失败: ${err.message}`);
            }
        }
        this.priority.sort((a, b) => a.priority - b.priority);
        this.collectTasks();
        logger.info(`[yunzai-loader] 共加载 ${this.priority.length} 个插件类`);
    }
    static YUNZAI_PATTERNS = [
        /extends\s+plugin\b/,
        /export\s*\{[^}]*\bapps\b[^}]*\}/,
        /export\s+\*\s+from\s/,
        /import\s+plugin\s+from\s/,
        /export\s+(default\s+)?class\s+\w+\s+extends\s/,
        /export\s+(const|let|var)\s+apps\b/
    ];
    isYunzaiFile(filePath) {
        try {
            const content = readFileSync(filePath, 'utf-8');
            return PluginLoader.YUNZAI_PATTERNS.some(re => re.test(content));
        }
        catch {
            return false;
        }
    }
    async loadPluginDir(dirPath, dirName) {
        const indexPath = join(dirPath, 'index.js');
        if (existsSync(indexPath)) {
            if (this.isYunzaiFile(indexPath)) {
                await this.loadPluginFile(indexPath, dirName);
            }
            return;
        }
        const files = readdirSync(dirPath).filter(f => f.endsWith('.js') && !f.startsWith('.'));
        for (const file of files) {
            const filePath = join(dirPath, file);
            if (this.isYunzaiFile(filePath)) {
                await this.loadPluginFile(filePath, dirName);
            }
        }
    }
    async loadPluginFile(filePath, dirName) {
        const fileUrl = pathToFileURL(filePath).href;
        const mod = await import(fileUrl);
        const classes = [];
        if (mod.default) {
            if (this.isPluginClass(mod.default)) {
                classes.push(mod.default);
            }
            else if (mod.default.apps && typeof mod.default.apps === 'object') {
                for (const val of Object.values(mod.default.apps)) {
                    if (this.isPluginClass(val)) {
                        classes.push(val);
                    }
                }
            }
        }
        for (const [key, val] of Object.entries(mod)) {
            if (key === 'default') {
                continue;
            }
            if (this.isPluginClass(val)) {
                classes.push(val);
            }
        }
        if (mod.apps && typeof mod.apps === 'object' && !this.isPluginClass(mod.apps)) {
            for (const val of Object.values(mod.apps)) {
                if (this.isPluginClass(val)) {
                    classes.push(val);
                }
            }
        }
        for (const Cls of classes) {
            try {
                const instance = new Cls();
                if (typeof instance.init === 'function') {
                    const result = await instance.init();
                    if (result === 'return') {
                        continue;
                    }
                }
                const eventStr = instance.event ?? 'message';
                const compiledRules = (instance.rule ?? []).map((r) => {
                    let reg;
                    if (r.reg instanceof RegExp) {
                        reg = r.reg.global || r.reg.sticky ? new RegExp(r.reg.source, r.reg.flags.replace(/[gy]/g, '')) : r.reg;
                    }
                    else {
                        reg = new RegExp(r.reg);
                    }
                    return { reg, fnc: r.fnc, permission: r.permission, log: r.log };
                });
                const rawTasks = Array.isArray(instance.task) ? instance.task : instance.task ? [instance.task] : [];
                const tasks = rawTasks.filter((t) => t?.cron && t?.fnc);
                this.priority.push({
                    cls: Cls,
                    name: instance.name ?? dirName,
                    priority: instance.priority ?? 5000,
                    filePath,
                    eventParts: eventStr.split('.'),
                    compiledRules,
                    hasAccept: typeof instance.accept === 'function',
                    tasks
                });
                logger.info(`[yunzai-loader]   ├─ ${instance.name} (priority: ${instance.priority})`);
            }
            catch (err) {
                logger.error(`[yunzai-loader] 实例化 ${filePath} 失败: ${err.message}`);
            }
        }
    }
    isPluginClass(val) {
        if (typeof val !== 'function') {
            return false;
        }
        if (val.prototype instanceof YunzaiPlugin) {
            return true;
        }
        const proto = val.prototype;
        if (proto && typeof proto.constructor === 'function') {
            return Array.isArray(proto.rule) || typeof proto.reply === 'function' || ('name' in proto && 'rule' in proto);
        }
        return false;
    }
    async deal(e) {
        const ctx = findContext(e);
        if (ctx) {
            for (const entry of this.priority) {
                if (entry.name !== ctx.pluginName) {
                    continue;
                }
                try {
                    const instance = new entry.cls();
                    instance.e = e;
                    if (typeof instance[ctx.fnc] === 'function') {
                        e.logFnc = `[${entry.name}][${ctx.fnc}](上下文)`;
                        logger.info(`${e.logText} ${e.logFnc}`);
                        await instance[ctx.fnc](e);
                        return true;
                    }
                }
                catch (err) {
                    logger.error(`[yunzai-loader] 上下文处理异常 ${entry.name}.${ctx.fnc}: ${err.message}`);
                }
            }
        }
        for (const entry of this.priority) {
            try {
                const ep = entry.eventParts;
                if (ep[0] && e.post_type !== ep[0]) {
                    continue;
                }
                if (ep[1]) {
                    const field = ep[0] === 'request' ? e.request_type : e.notice_type;
                    if (field !== ep[1]) {
                        continue;
                    }
                }
                if (ep[2] && e.sub_type !== ep[2]) {
                    continue;
                }
                let instance = null;
                if (entry.hasAccept) {
                    instance = new entry.cls();
                    instance.e = e;
                    const acceptResult = await instance.accept(e);
                    if (acceptResult === 'return' || acceptResult) {
                        return true;
                    }
                }
                if (e.post_type !== 'message' || entry.compiledRules.length === 0) {
                    continue;
                }
                for (const rule of entry.compiledRules) {
                    if (!rule.reg.test(e.msg)) {
                        continue;
                    }
                    if (rule.permission === 'master' && !e.isMaster) {
                        continue;
                    }
                    if (!instance) {
                        instance = new entry.cls();
                        instance.e = e;
                    }
                    if (typeof instance[rule.fnc] !== 'function') {
                        logger.warn(`[yunzai-loader] ${entry.name}.${rule.fnc} 不是方法`);
                        continue;
                    }
                    e.logFnc = `[${entry.name}][${rule.fnc}]`;
                    if (rule.log !== false) {
                        logger.info(`${e.logText} ${e.logFnc} ${e.msg}`);
                    }
                    const result = await instance[rule.fnc](e);
                    if (result !== false) {
                        return true;
                    }
                }
            }
            catch (err) {
                logger.error(`[yunzai-loader] ${entry.name} 异常: ${err.message}`);
                logger.error(err.stack);
            }
        }
        return false;
    }
    async reload() {
        this.clearTasks();
        this.priority = [];
        await this.load();
    }
    collectTasks() {
        for (const entry of this.priority) {
            for (const task of entry.tasks) {
                const fnc = task.fnc;
                const parsed = parseCron(task.cron);
                if (!parsed) {
                    logger.warn(`[yunzai-loader] 无法解析 cron: ${task.cron} (${entry.name}.${fnc})`);
                    continue;
                }
                const timer = setInterval(() => {
                    try {
                        const inst = new entry.cls();
                        if (typeof inst[fnc] === 'function') {
                            if (task.log !== false) {
                                logger.info(`[yunzai-loader] [定时任务] ${entry.name}.${fnc}`);
                            }
                            void Promise.resolve(inst[fnc]()).catch((err) => {
                                logger.error(`[yunzai-loader] 定时任务 ${entry.name}.${fnc} 失败: ${err.message}`);
                            });
                        }
                    }
                    catch (err) {
                        logger.error(`[yunzai-loader] 定时任务 ${entry.name}.${fnc} 失败: ${err.message}`);
                    }
                }, parsed.interval);
                taskTimers.push(timer);
                logger.info(`[yunzai-loader]   ├─ 定时任务 ${entry.name}.${fnc} (${task.cron})`);
            }
        }
    }
    clearTasks() {
        for (const timer of taskTimers) {
            clearInterval(timer);
        }
        taskTimers.length = 0;
    }
    matchEvent(pluginEvent, e) {
        if (!pluginEvent) {
            return true;
        }
        const parts = pluginEvent.split('.');
        const postType = parts[0];
        if (e.post_type !== postType) {
            return false;
        }
        if (parts.length === 1) {
            return true;
        }
        const subTypeField = postType === 'request' ? e.request_type : e.notice_type;
        if (parts[1] && subTypeField !== parts[1]) {
            return false;
        }
        if (parts.length >= 3 && parts[2] && e.sub_type !== parts[2]) {
            return false;
        }
        return true;
    }
    getPluginList() {
        return this.priority.map(p => ({
            name: p.name,
            priority: p.priority,
            filePath: p.filePath
        }));
    }
}

export { PluginLoader };
