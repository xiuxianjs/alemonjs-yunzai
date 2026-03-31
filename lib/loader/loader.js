import { logger } from 'alemonjs';
import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PACKAGE_ROOT } from '../path.js';
import { YunzaiPlugin, findContext } from './plugin.js';
import { segment } from './segment.js';

class PluginLoader {
    priority = [];
    pluginsDir;
    constructor(pluginsDir) {
        this.pluginsDir = pluginsDir;
    }
    get pluginCount() {
        return this.priority.length;
    }
    setupGlobals() {
        const g = globalThis;
        g.plugin = YunzaiPlugin;
        g.segment = segment;
        g.logger ??= logger;
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
            pickUser: () => ({ sendMsg: () => Promise.resolve({}) }),
            pickGroup: () => ({
                sendMsg: () => Promise.resolve({}),
                pickMember: () => ({ info: {} })
            }),
            pickFriend: () => ({ sendMsg: () => Promise.resolve({}) }),
            sendGroupMsg: () => Promise.resolve({}),
            sendPrivateMsg: () => Promise.resolve({})
        };
        if (!g.redis) {
            const store = new Map();
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
                    return Promise.resolve(1);
                },
                keys: (pattern) => {
                    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
                    return Promise.resolve([...store.keys()].filter(k => {
                        cleanup(k);
                        return store.has(k) && regex.test(k);
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
                    return Promise.resolve(store.has(key) ? 1 : 0);
                },
                setEx: (key, ttl, val) => {
                    store.set(key, { value: val, expireAt: Date.now() + ttl * 1000 });
                    return Promise.resolve('OK');
                }
            };
        }
    }
    async load() {
        this.setupGlobals();
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
                this.priority.push({
                    cls: Cls,
                    name: instance.name ?? dirName,
                    priority: instance.priority ?? 5000,
                    filePath
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
            return (Array.isArray(proto.rule) ||
                typeof proto.reply === 'function' ||
                ('name' in proto && 'rule' in proto));
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
                const instance = new entry.cls();
                instance.e = e;
                if (typeof instance.accept === 'function') {
                    const acceptResult = await instance.accept(e);
                    if (acceptResult === 'return') {
                        return true;
                    }
                    if (acceptResult) {
                        return true;
                    }
                }
                for (const rule of instance.rule ?? []) {
                    const reg = rule.reg instanceof RegExp ? rule.reg : new RegExp(rule.reg);
                    if (!reg.test(e.msg)) {
                        continue;
                    }
                    if (rule.permission === 'master' && !e.isMaster) {
                        continue;
                    }
                    const fnc = rule.fnc;
                    if (typeof instance[fnc] !== 'function') {
                        logger.warn(`[yunzai-loader] ${entry.name}.${fnc} 不是方法`);
                        continue;
                    }
                    e.logFnc = `[${entry.name}][${fnc}]`;
                    if (rule.log !== false) {
                        logger.info(`${e.logText} ${e.logFnc} ${e.msg}`);
                    }
                    const result = await instance[fnc](e);
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
        this.priority = [];
        await this.load();
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
