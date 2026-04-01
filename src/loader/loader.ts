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

/** 简易 cron 解析器：支持 "秒 分 时 日 月 周" 六段 cron */
function parseCron(cron: string): { interval: number } | null {
  if (!cron) {
    return null;
  }

  const parts = cron.trim().split(/\s+/);

  // 仅处理最常见的固定间隔格式
  // */N * * * * * → 每 N 秒
  // 0 */N * * * * → 每 N 分钟
  // 0 0 */N * * * → 每 N 小时
  if (parts.length >= 5) {
    // 尝试找 */N 模式
    for (let i = 0; i < Math.min(parts.length, 3); i++) {
      const m = parts[i].match(/^\*\/(\d+)$/);

      if (m) {
        const n = parseInt(m[1]);
        const multipliers = [1000, 60000, 3600000]; // 秒/分/时

        return { interval: n * multipliers[i] };
      }
    }

    // 固定时刻 (如 "0 30 8 * * *")：每天执行
    return { interval: 86400000 };
  }

  return null;
}

/** 已注册的定时任务 */
const taskTimers: ReturnType<typeof setInterval>[] = [];

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

  async setupGlobals() {
    const g = globalThis as any;

    // plugin 基类
    g.plugin = YunzaiPlugin;

    // segment 消息构建
    g.segment = segment;

    // logger (复用 AlemonJS logger + 添加颜色方法)
    g.logger ??= logger;

    // 兼容 Miao-Yunzai logger 颜色方法
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
      } catch {
        // chalk 未安装，提供无颜色降级
        const identity = (s: any) => s;

        g.logger.chalk = identity;
        g.logger.red = identity;
        g.logger.green = identity;
        g.logger.yellow = identity;
        g.logger.blue = identity;
        g.logger.magenta = identity;
        g.logger.cyan = identity;
      }
    }

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
      pickUser: (uid: any) => ({
        user_id: uid,
        sendMsg: () => Promise.resolve({}),
        getAvatarUrl: () => Promise.resolve('')
      }),
      pickGroup: (gid: any) => ({
        group_id: gid,
        name: '',
        is_owner: false,
        is_admin: false,
        sendMsg: () => Promise.resolve({}),
        pickMember: (uid: any) => ({
          info: { user_id: uid, card: '', nickname: '' },
          getAvatarUrl: () => Promise.resolve('')
        }),
        getMemberMap: () => Promise.resolve(new Map()),
        getChatHistory: () => Promise.resolve([]),
        makeForwardMsg: (arr: any[]) => Promise.resolve(arr),
        recallMsg: () => Promise.resolve(true),
        sendFile: () => Promise.resolve(false),
        getFileUrl: () => Promise.resolve(''),
        quit: () => Promise.resolve(false),
        setCard: () => Promise.resolve(true),
        muteMember: () => Promise.resolve(true),
        kickMember: () => Promise.resolve(true)
      }),
      pickFriend: (uid: any) => ({
        user_id: uid,
        sendMsg: () => Promise.resolve({}),
        getAvatarUrl: () => Promise.resolve(''),
        getChatHistory: () => Promise.resolve([]),
        sendFile: () => Promise.resolve(false),
        makeForwardMsg: (arr: any[]) => Promise.resolve(arr),
        recallMsg: () => Promise.resolve(true)
      }),
      sendGroupMsg: () => Promise.resolve({}),
      sendPrivateMsg: () => Promise.resolve({}),
      getGroupMemberInfo: (_gid: any, _uid: any) => Promise.resolve({ user_id: _uid, card: '', nickname: '', role: 'member' }),
      getGroupMemberList: (_gid: any) => Promise.resolve([]),
      getGroupInfo: (_gid: any) => Promise.resolve({ group_id: _gid, group_name: '' }),
      getFriendList: () => Promise.resolve([])
    };

    // Redis 内存兜底 (无 Redis 时也能跑)
    if (!g.redis) {
      const store = new Map<string, { value: string; expireAt?: number }>();
      const hashStore = new Map<string, Map<string, string>>();
      const sortedSetStore = new Map<string, { value: string; score: number }[]>();

      const cleanup = (key: string) => {
        const item = store.get(key);

        if (item?.expireAt && Date.now() > item.expireAt) {
          store.delete(key);

          return true;
        }

        return false;
      };

      g.redis = {
        // ─── String 操作 ───
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
          hashStore.delete(key);
          sortedSetStore.delete(key);

          return Promise.resolve(1);
        },
        keys: (pattern: string) => {
          const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
          const allKeys = new Set([...store.keys(), ...hashStore.keys(), ...sortedSetStore.keys()]);

          return Promise.resolve(
            [...allKeys].filter(k => {
              cleanup(k);

              return (store.has(k) || hashStore.has(k) || sortedSetStore.has(k)) && regex.test(k);
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

          return Promise.resolve(store.has(key) || hashStore.has(key) || sortedSetStore.has(key) ? 1 : 0);
        },
        setEx: (key: string, ttl: number, val: string) => {
          store.set(key, { value: val, expireAt: Date.now() + ttl * 1000 });

          return Promise.resolve('OK');
        },

        // ─── Hash 操作 ───
        hGet: (key: string, field: string) => {
          return Promise.resolve(hashStore.get(key)?.get(field) ?? null);
        },
        hSet: (key: string, field: string, value: string) => {
          if (!hashStore.has(key)) {
            hashStore.set(key, new Map());
          }

          hashStore.get(key)!.set(field, value);

          return Promise.resolve(1);
        },
        hDel: (key: string, ...fields: string[]) => {
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
        hGetAll: (key: string) => {
          const hash = hashStore.get(key);

          if (!hash) {
            return Promise.resolve({});
          }

          const result: Record<string, string> = {};

          for (const [k, v] of hash) {
            result[k] = v;
          }

          return Promise.resolve(result);
        },

        // ─── Sorted Set 操作 ───
        zAdd: (key: string, ...args: any[]) => {
          if (!sortedSetStore.has(key)) {
            sortedSetStore.set(key, []);
          }

          const arr = sortedSetStore.get(key)!;

          // 支持 zAdd(key, {score, value}) 和 zAdd(key, score, value)
          for (let i = 0; i < args.length; i++) {
            let score: number;
            let value: string;

            if (typeof args[i] === 'object' && args[i] !== null) {
              score = args[i].score;
              value = args[i].value;
            } else {
              score = Number(args[i]);
              value = String(args[++i]);
            }

            const idx = arr.findIndex(e => e.value === value);

            if (idx >= 0) {
              arr[idx].score = score;
            } else {
              arr.push({ value, score });
            }
          }

          arr.sort((a, b) => a.score - b.score);

          return Promise.resolve(1);
        },
        zScore: (key: string, member: string) => {
          const entry = sortedSetStore.get(key)?.find(e => e.value === member);

          return Promise.resolve(entry ? entry.score : null);
        },
        zRange: (key: string, start: number, stop: number) => {
          const arr = sortedSetStore.get(key) ?? [];
          const len = arr.length;
          const s = start < 0 ? Math.max(0, len + start) : start;
          const e = stop < 0 ? len + stop : stop;

          return Promise.resolve(arr.slice(s, e + 1).map(x => x.value));
        },
        zRangeWithScores: (key: string, start: number, stop: number) => {
          const arr = sortedSetStore.get(key) ?? [];
          const len = arr.length;
          const s = start < 0 ? Math.max(0, len + start) : start;
          const e = stop < 0 ? len + stop : stop;

          return Promise.resolve(arr.slice(s, e + 1));
        },
        zRevRange: (key: string, start: number, stop: number) => {
          const arr = [...(sortedSetStore.get(key) ?? [])].reverse();
          const len = arr.length;
          const s = start < 0 ? Math.max(0, len + start) : start;
          const e = stop < 0 ? len + stop : stop;

          return Promise.resolve(arr.slice(s, e + 1).map(x => x.value));
        },
        zRevRank: (key: string, member: string) => {
          const arr = sortedSetStore.get(key) ?? [];
          const reversed = [...arr].reverse();
          const idx = reversed.findIndex(e => e.value === member);

          return Promise.resolve(idx >= 0 ? idx : null);
        },
        zRem: (key: string, ...members: string[]) => {
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
        zCard: (key: string) => {
          return Promise.resolve(sortedSetStore.get(key)?.length ?? 0);
        },
        zRangeByScore: (key: string, min: number | string, max: number | string) => {
          const arr = sortedSetStore.get(key) ?? [];
          const lo = min === '-inf' ? -Infinity : Number(min);
          const hi = max === '+inf' ? Infinity : Number(max);

          return Promise.resolve(arr.filter(e => e.score >= lo && e.score <= hi).map(e => e.value));
        },
        zRangeByScoreWithScores: (key: string, min: number | string, max: number | string) => {
          const arr = sortedSetStore.get(key) ?? [];
          const lo = min === '-inf' ? -Infinity : Number(min);
          const hi = max === '+inf' ? Infinity : Number(max);

          return Promise.resolve(arr.filter(e => e.score >= lo && e.score <= hi));
        },
        zRemRangeByScore: (key: string, min: number | string, max: number | string) => {
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

        // ─── List 操作 ───
        lPush: (key: string, ...values: string[]) => {
          if (!store.has(key)) {
            store.set(key, { value: JSON.stringify([]) });
          }

          const list: string[] = JSON.parse(store.get(key)!.value);

          list.unshift(...values);
          store.set(key, { value: JSON.stringify(list) });

          return Promise.resolve(list.length);
        },
        lRange: (key: string, start: number, stop: number) => {
          if (!store.has(key)) {
            return Promise.resolve([]);
          }

          const list: string[] = JSON.parse(store.get(key)!.value);
          const s = start < 0 ? Math.max(0, list.length + start) : start;
          const e = stop < 0 ? list.length + stop : stop;

          return Promise.resolve(list.slice(s, e + 1));
        },

        // ─── Set 操作 ───
        sAdd: (key: string, ...members: string[]) => {
          if (!store.has(key)) {
            store.set(key, { value: JSON.stringify([]) });
          }

          const set: string[] = JSON.parse(store.get(key)!.value);
          let added = 0;

          for (const m of members) {
            if (!set.includes(m)) {
              set.push(m);
              added++;
            }
          }

          store.set(key, { value: JSON.stringify(set) });

          return Promise.resolve(added);
        },
        sMembers: (key: string) => {
          if (!store.has(key)) {
            return Promise.resolve([]);
          }

          return Promise.resolve(JSON.parse(store.get(key)!.value));
        }
      };
    }

    // cfg 配置对象
    if (!g.cfg) {
      try {
        const { default: cfg } = await import('../config/config');

        g.cfg = cfg;
      } catch {
        /* ignore */
      }
    }

    // common 工具函数
    if (!g.common) {
      try {
        const { default: common } = await import('../common/common');

        g.common = common;
      } catch {
        /* ignore */
      }
    }
  }

  // ─── 插件发现与加载 ───

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

    // 收集并注册定时任务
    this.collectTasks();

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
    this.clearTasks();
    this.priority = [];
    await this.load();
  }

  /** 收集并注册定时任务 */
  private collectTasks() {
    for (const entry of this.priority) {
      try {
        const instance = new entry.cls();
        const tasks = Array.isArray(instance.task) ? instance.task : [instance.task];

        for (const task of tasks) {
          if (!task?.cron || !task?.fnc) {
            continue;
          }

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

                void Promise.resolve(inst[fnc]()).catch((err: any) => {
                  logger.error(`[yunzai-loader] 定时任务 ${entry.name}.${fnc} 失败: ${err.message}`);
                });
              }
            } catch (err: any) {
              logger.error(`[yunzai-loader] 定时任务 ${entry.name}.${fnc} 失败: ${err.message}`);
            }
          }, parsed.interval);

          taskTimers.push(timer);
          logger.info(`[yunzai-loader]   ├─ 定时任务 ${entry.name}.${fnc} (${task.cron})`);
        }
      } catch {
        /* skip */
      }
    }
  }

  /** 清除所有定时任务 */
  private clearTasks() {
    for (const timer of taskTimers) {
      clearInterval(timer);
    }

    taskTimers.length = 0;
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
