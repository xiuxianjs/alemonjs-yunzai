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
