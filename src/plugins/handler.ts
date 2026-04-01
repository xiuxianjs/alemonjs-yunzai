/**
 * Handler 兼容层
 *
 * 兼容 Miao-Yunzai lib/plugins/handler.js 的插件间通信机制。
 * 插件通过 Handler.add() 注册处理器，其他插件通过 Handler.call() 调用。
 */
import { logger } from 'alemonjs';

interface HandlerEntry {
  priority: number;
  fn: (...args: any[]) => any;
  ns: string;
  self: any;
  key: string;
}

const events: Record<string, HandlerEntry[]> = {};

const Handler = {
  /** 注册处理器 */
  add(cfg: { ns: string; fn: (...args: any[]) => any; self?: any; priority?: number; key?: string; event?: string }) {
    const { ns, fn, self, priority = 500 } = cfg;
    const key = cfg.key ?? cfg.event ?? '';

    if (!key || !fn) {
      return;
    }

    Handler.del(ns, key);
    logger.info(`[Handler][Reg]: [${ns}][${key}]`);

    events[key] = events[key] ?? [];
    events[key].push({ priority, fn, ns, self, key });
    events[key].sort((a, b) => a.priority - b.priority);
  },

  /** 删除处理器 */
  del(ns: string, key = '') {
    if (!key) {
      for (const k in events) {
        Handler.del(ns, k);
      }

      return;
    }

    if (!events[key]) {
      return;
    }

    events[key] = events[key].filter(h => h.ns !== ns);
  },

  /** 调用所有处理器（暂时同 call） */
  callAll(key: string, e: any, args?: any) {
    return Handler.call(key, e, args, true);
  },

  /** 调用处理器 */
  async call(key: string, e: any, args?: any, allHandler = false) {
    if (!events[key]) {
      return undefined;
    }

    let ret: any;

    for (const obj of events[key]) {
      let done = true;

      const reject = (msg = '') => {
        if (msg) {
          logger.info(`[Handler][Reject]: [${obj.ns}][${key}] ${msg}`);
        }

        done = false;
      };

      ret = await obj.fn.call(obj.self, e, args, reject);

      if (done && !allHandler) {
        logger.info(`[Handler][Done]: [${obj.ns}][${key}]`);

        return ret;
      }
    }

    return ret;
  },

  /** 检查是否有处理器 */
  has(key: string): boolean {
    return !!events[key]?.length;
  }
};

export default Handler;
