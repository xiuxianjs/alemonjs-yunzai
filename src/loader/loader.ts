/**
 * Yunzai 插件加载器
 *
 * 核心思路：不再依赖完整的 Miao-Yunzai 仓库，
 * 而是直接加载 packages/ 下的 Yunzai 风格插件。
 *
 * 职责：
 * 1. 注入全局变量 (plugin / segment / logger / redis / Bot)
 * 2. 扫描 packages/ 发现插件
 * 3. 实例化插件、按优先级排序
 * 4. 事件分发 — accept() → 上下文检查 → 规则匹配 → 调用处理函数
 */
import { logger } from 'alemonjs';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PACKAGE_ROOT } from '../path';
import { findContext, YunzaiPlugin } from './plugin';
import { segment } from './segment';
import type { PluginEntry } from './types';

export class PluginLoader {
  /** 按优先级排序的插件队列 */
  priority: PluginEntry[] = [];

  /** 插件目录 */
  private pluginsDir: string;

  constructor(pluginsDir: string) {
    this.pluginsDir = pluginsDir;
  }

  get pluginCount(): number {
    return this.priority.length;
  }

  // ─── 全局变量注入 ───

  setupGlobals() {
    const g = globalThis as any;

    // plugin 基类
    g.plugin = YunzaiPlugin;

    // segment 消息构建
    g.segment = segment;

    // logger (复用 AlemonJS logger)
    g.logger ??= logger;

    // Bot 桩对象 (插件可能引用 Bot.uin 等)
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

    // Redis 内存兜底 (无 Redis 时也能跑)
    if (!g.redis) {
      const store = new Map<string, { value: string; expireAt?: number }>();

      const cleanup = (key: string) => {
        const item = store.get(key);

        if (item?.expireAt && Date.now() > item.expireAt) {
          store.delete(key);

          return true;
        }

        return false;
      };

      g.redis = {
        get: (key: string) => {
          cleanup(key);

          return Promise.resolve(store.get(key)?.value ?? null);
        },
        set: (key: string, val: string, options?: any) => {
          const entry: any = { value: val };

          if (options?.EX) {
            entry.expireAt = Date.now() + options.EX * 1000;
          }

          store.set(key, entry);

          return Promise.resolve('OK');
        },
        del: (key: string) => {
          store.delete(key);

          return Promise.resolve(1);
        },
        keys: (pattern: string) => {
          const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');

          return Promise.resolve(
            [...store.keys()].filter(k => {
              cleanup(k);

              return store.has(k) && regex.test(k);
            })
          );
        },
        incr: (key: string) => {
          cleanup(key);
          const val = parseInt(store.get(key)?.value ?? '0') + 1;

          store.set(key, { value: String(val) });

          return Promise.resolve(val);
        },
        expire: (_key: string, _seconds: number) => Promise.resolve(true),
        exists: (key: string) => {
          cleanup(key);

          return Promise.resolve(store.has(key) ? 1 : 0);
        },
        setEx: (key: string, ttl: number, val: string) => {
          store.set(key, { value: val, expireAt: Date.now() + ttl * 1000 });

          return Promise.resolve('OK');
        }
      };
    }
  }

  // ─── 插件发现与加载 ───

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

      // 跳过自身目录，避免递归加载
      if (resolve(dirPath) === ownDir) {
        continue;
      }

      try {
        await this.loadPluginDir(dirPath, dir);
      } catch (err: any) {
        logger.error(`[yunzai-loader] 加载插件目录 ${dir} 失败: ${err.message}`);
      }
    }

    // 按优先级升序排列
    this.priority.sort((a, b) => a.priority - b.priority);

    logger.info(`[yunzai-loader] 共加载 ${this.priority.length} 个插件类`);
  }

  /**
   * 检测文件内容是否符合 Yunzai 插件导出约定。
   *
   * 已知风格:
   *  1. export class Xxx extends plugin        — 直接导出插件类
   *  2. class Xxx extends plugin               — 先定义再导出
   *  3. export { apps }                        — 收集子模块后导出
   *  4. export { xxx as apps }                 — 别名导出 apps
   *  5. export * from '...'                    — 星号重导出
   *  6. import plugin from '...'               — 导入 plugin 基类
   *  7. export default class ... extends       — 默认导出插件类
   *  8. export const/let/var apps              — 直接声明导出 apps
   */
  private static YUNZAI_PATTERNS: RegExp[] = [
    /extends\s+plugin\b/, // class Xxx extends plugin
    /export\s*\{[^}]*\bapps\b[^}]*\}/, // export { apps } / export { rules as apps }
    /export\s+\*\s+from\s/, // export * from '...'
    /import\s+plugin\s+from\s/, // import plugin from '../../lib/plugins/plugin.js'
    /export\s+(default\s+)?class\s+\w+\s+extends\s/, // export (default) class Xxx extends ...
    /export\s+(const|let|var)\s+apps\b/ // export const apps = ...
  ];

  /** 判断文件是否可能是 Yunzai 风格插件 */
  private isYunzaiFile(filePath: string): boolean {
    try {
      const content = readFileSync(filePath, 'utf-8');

      return PluginLoader.YUNZAI_PATTERNS.some(re => re.test(content));
    } catch {
      return false;
    }
  }

  /** 加载一个插件目录 */
  private async loadPluginDir(dirPath: string, dirName: string) {
    const indexPath = join(dirPath, 'index.js');

    if (existsSync(indexPath)) {
      if (this.isYunzaiFile(indexPath)) {
        await this.loadPluginFile(indexPath, dirName);
      }

      return;
    }

    // 没有 index.js 则加载目录下所有 .js
    const files = readdirSync(dirPath).filter(f => f.endsWith('.js') && !f.startsWith('.'));

    for (const file of files) {
      const filePath = join(dirPath, file);

      if (this.isYunzaiFile(filePath)) {
        await this.loadPluginFile(filePath, dirName);
      }
    }
  }

  /** 从单个文件中提取并注册插件类 */
  private async loadPluginFile(filePath: string, dirName: string) {
    const fileUrl = pathToFileURL(filePath).href;
    const mod = await import(fileUrl);

    const classes: any[] = [];

    // default export
    if (mod.default) {
      if (this.isPluginClass(mod.default)) {
        classes.push(mod.default);
      } else if (mod.default.apps && typeof mod.default.apps === 'object') {
        for (const val of Object.values(mod.default.apps)) {
          if (this.isPluginClass(val)) {
            classes.push(val);
          }
        }
      }
    }

    // named exports
    for (const [key, val] of Object.entries(mod)) {
      if (key === 'default') {
        continue;
      }

      if (this.isPluginClass(val)) {
        classes.push(val);
      }
    }

    // apps named export
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

        // 生命周期: init()
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
      } catch (err: any) {
        logger.error(`[yunzai-loader] 实例化 ${filePath} 失败: ${err.message}`);
      }
    }
  }

  /** 判断是否为插件类 (继承自 YunzaiPlugin 或原型链上有 rule) */
  private isPluginClass(val: any): boolean {
    if (typeof val !== 'function') {
      return false;
    }

    // 正式继承检查
    if (val.prototype instanceof YunzaiPlugin) {
      return true;
    }

    // 宽松检查: 通过原型判断，避免触发构造函数副作用
    const proto = val.prototype;

    if (proto && typeof proto.constructor === 'function') {
      return Array.isArray(proto.rule) || typeof proto.reply === 'function' || ('name' in proto && 'rule' in proto);
    }

    return false;
  }

  // ─── 事件分发 ───

  /**
   * 将事件分发给已加载的插件
   * @returns true 如果有插件处理了该事件
   */
  async deal(e: any): Promise<boolean> {
    // 1. 检查上下文 (多步交互)
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
        } catch (err: any) {
          logger.error(`[yunzai-loader] 上下文处理异常 ${entry.name}.${ctx.fnc}: ${err.message}`);
        }
      }
    }

    // 2. 遍历插件: accept() → 规则匹配
    for (const entry of this.priority) {
      try {
        const instance = new entry.cls();

        // 事件类型过滤: 插件声明的 event 需匹配 e.post_type
        if (!this.matchEvent(instance.event ?? 'message', e)) {
          continue;
        }

        instance.e = e;

        // accept() 全局拦截
        if (typeof instance.accept === 'function') {
          const acceptResult = await instance.accept(e);

          if (acceptResult === 'return') {
            return true;
          }

          if (acceptResult) {
            return true;
          }
        }

        // 规则匹配 (非消息事件跳过正则匹配)
        if (e.post_type !== 'message') {
          continue;
        }

        for (const rule of instance.rule ?? []) {
          const reg = rule.reg instanceof RegExp ? rule.reg : new RegExp(rule.reg);

          if (!reg.test(e.msg)) {
            continue;
          }

          // 权限检查
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

          // result !== false 表示已处理
          if (result !== false) {
            return true;
          }
        }
      } catch (err: any) {
        logger.error(`[yunzai-loader] ${entry.name} 异常: ${err.message}`);
        logger.error(err.stack);
      }
    }

    return false;
  }

  /** 重新加载所有插件 */
  async reload() {
    this.priority = [];
    await this.load();
  }

  /**
   * 判断插件声明的 event 是否匹配当前事件
   *
   * 支持格式:
   * - 'message'                → e.post_type === 'message'
   * - 'notice'                 → e.post_type === 'notice'
   * - 'notice.group_increase'  → notice_type === 'group_increase'
   * - 'notice.notify.poke'     → notice_type === 'notify' && sub_type === 'poke'
   * - 'request'                → e.post_type === 'request'
   */
  private matchEvent(pluginEvent: string, e: any): boolean {
    if (!pluginEvent) {
      return true;
    }

    const parts = pluginEvent.split('.');
    const postType = parts[0]; // 'message' | 'notice' | 'request'

    if (e.post_type !== postType) {
      return false;
    }

    // 只匹配 post_type (如 'message' / 'notice')
    if (parts.length === 1) {
      return true;
    }

    // 匹配子类型 (如 'notice.group_increase')
    const subTypeField = postType === 'request' ? e.request_type : e.notice_type;

    if (parts[1] && subTypeField !== parts[1]) {
      return false;
    }

    // 匹配更细粒度 (如 'notice.notify.poke')
    if (parts.length >= 3 && parts[2] && e.sub_type !== parts[2]) {
      return false;
    }

    return true;
  }

  /** 获取插件列表 */
  getPluginList(): { name: string; priority: number; filePath: string }[] {
    return this.priority.map(p => ({
      name: p.name,
      priority: p.priority,
      filePath: p.filePath
    }));
  }
}
