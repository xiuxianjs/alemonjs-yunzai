/**
 * Yunzai plugin 基类兼容层
 *
 * 提供与 Miao-Yunzai plugin 基类相同的 API，
 * 让 Yunzai 插件无需修改即可运行。
 */
import type { Rule, Task } from './types';

interface PluginOptions {
  name?: string;
  dsc?: string;
  event?: string;
  priority?: number;
  rule?: Rule[];
  task?: Task | Task[];
  handler?: any;
  namespace?: string;
}

/** 上下文存储 (跨实例共享) */
const contextMap = new Map<string, any>();
const contextTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** Symbol 用于 awaitContext (同 Miao-Yunzai) */
const SymbolResolve = Symbol('Resolve');

export class YunzaiPlugin {
  name: string;
  dsc: string;
  event: string;
  priority: number;
  rule: Rule[];
  task: Task | Task[];
  handler: any;
  namespace: string;
  e: any = null;

  constructor(options: PluginOptions = {}) {
    this.name = options.name ?? 'unnamed';
    this.dsc = options.dsc ?? '';
    this.event = options.event ?? 'message';
    this.priority = options.priority ?? 5000;
    this.rule = options.rule ?? [];
    this.task = options.task ?? { cron: '', fnc: '' };
    this.handler = options.handler ?? null;
    this.namespace = options.namespace ?? '';
  }

  /** 回复当前消息 */
  reply(msg: any, quote = false, data: any = {}): Promise<any> {
    if (!this.e?.reply) {
      console.warn(`[${this.name}] reply 调用失败: 没有事件上下文`);

      return Promise.resolve(false);
    }

    return this.e.reply(msg, quote, data);
  }

  /**
   * 设置上下文 (多步交互)
   * 调用后，同一用户的下一条消息将直接触发 type 对应的方法
   */
  setContext(type: string, isGroup = false, time = 120, timeout = '操作超时已取消') {
    const key = `${this.name}.${this.conKey(isGroup)}.${type}`;

    // 清除已有定时器
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

  /** 获取已存储的上下文 */
  getContext(type?: string, isGroup = false) {
    if (!type) {
      const prefix = `${this.name}.`;
      const result: any = {};

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

  /** 清除上下文 */
  finish(type: string, isGroup = false) {
    const key = `${this.name}.${this.conKey(isGroup)}.${type}`;

    contextMap.delete(key);
    const timer = contextTimers.get(key);

    if (timer) {
      clearTimeout(timer);
      contextTimers.delete(key);
    }
  }

  /** 生成上下文键 */
  conKey(isGroup = false): string {
    if (!this.e) {
      return 'unknown';
    }

    if (isGroup) {
      return `${this.e.group_id ?? ''}`;
    }

    return `${this.e.user_id ?? ''}`;
  }

  /**
   * Promise 风格的上下文等待 (多步交互)
   *
   * 用法: const reply = await this.awaitContext()
   * 用户回复后 resolve(e)；超时则 resolve(false)
   */
  awaitContext(...args: any[]): Promise<any> {
    return new Promise(resolve => {
      const ctx = this.setContext('resolveContext', ...args);

      (ctx as any)[SymbolResolve] = resolve;
    });
  }

  /** 解析 awaitContext 的等待，将当前 e 传给 resolve */
  resolveContext(context: any) {
    this.finish('resolveContext');

    if (context?.[SymbolResolve]) {
      context[SymbolResolve](this.e);
    }
  }

  /**
   * 构建转发消息 (forward message)
   *
   * 在非 QQ 平台上，将多条消息合并为文本回复。
   * 签名兼容 Miao-Yunzai 插件中常见的两种调用方式。
   */
  makeForwardMsg(title: string, msg?: any, end?: string, resmsg?: string): Promise<any> | string {
    const parts: string[] = [];

    if (title) {
      parts.push(String(title));
    }

    if (typeof msg === 'string') {
      // "line1\n\nline2" → 按双换行分段
      parts.push(...msg.split('\n\n').filter(Boolean));
    } else if (Array.isArray(msg)) {
      for (const m of msg) {
        parts.push(typeof m === 'string' ? m : String(m));
      }
    } else if (msg !== null && msg !== undefined) {
      parts.push(String(msg));
    }

    if (end) {
      parts.push(end);
    }
    if (resmsg) {
      parts.push(resmsg);
    }

    // 尝试使用 e.group/e.friend 的 makeForwardMsg
    if (this.e?.isGroup && this.e.group?.makeForwardMsg) {
      const msgArr = parts.map(m => ({
        message: m,
        nickname: (globalThis as any).Bot?.nickname ?? 'Bot',
        user_id: this.e.self_id ?? 0
      }));

      return this.e.group.makeForwardMsg(msgArr);
    }

    if (this.e?.friend?.makeForwardMsg) {
      const msgArr = parts.map(m => ({
        message: m,
        nickname: (globalThis as any).Bot?.nickname ?? 'Bot',
        user_id: this.e.self_id ?? 0
      }));

      return this.e.friend.makeForwardMsg(msgArr);
    }

    return parts.join('\n────────\n');
  }

  /**
   * 渲染图片 (调用 puppeteer 或 e.runtime.render)
   *
   * 签名: renderImg(plugin, tpl, data, cfg?)
   * 兼容 Miao-Yunzai 中 Apps 基类的 this.renderImg()
   */
  async renderImg(plugin: string, tpl: string, data: any = {}, cfg: any = {}): Promise<any> {
    if (this.e?.runtime?.render) {
      return this.e.runtime.render(plugin, tpl, data, cfg);
    }

    try {
      const pup = (globalThis as any).puppeteer ?? (await import('../puppeteer/puppeteer')).default;

      if (pup?.screenshot) {
        const img = await pup.screenshot(`${plugin}/${tpl}`, { ...data, ...cfg });

        if (cfg?.retType === 'base64') {
          return img;
        }

        if (img) {
          await this.reply(img);
        }

        return img;
      }
    } catch (err: any) {
      console.error(`[${this.name}] renderImg 失败:`, err.message);
    }

    return false;
  }
}

/**
 * 查找用户的上下文 (loader 内部使用)
 * 根据事件信息查找是否有等待中的上下文
 */
export function findContext(e: any): { pluginName: string; fnc: string } | null {
  const userId = e.user_id ?? '';
  const groupId = e.group_id ?? '';

  for (const [key, ctx] of contextMap) {
    // key 格式: pluginName.conKey.type
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
