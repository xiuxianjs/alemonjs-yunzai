import { defineChildren, defineRouter, lazy, logger } from 'alemonjs';
import { loader } from './loader';

// ─── 对外导出：供外部 import 使用 ───
export { default as common, downFile, makeForwardMsg, sleep } from './common/common';
export { default as cfg } from './config/config';
export { createYunzaiEvent, loader, PluginLoader, segment, YunzaiPlugin } from './loader';
export type { MessageSegment, PluginEntry, Rule, Task } from './loader/types';
export { default as Handler } from './plugins/handler';
export { default as puppeteer } from './puppeteer/puppeteer';

// ─── 路由 ───

const responseRouter = defineRouter([
  // 管理指令
  {
    regular: /^(!|！|\/|#|＃)(yzp|云崽p)/,
    selects: ['message.create', 'private.message.create'],
    handler: lazy(() => import('./response/admin'))
  },
  // 其余全部分发给 Yunzai 插件加载器
  {
    regular: /.*/,
    handler: lazy(() => import('./response/bridge'))
  }
]);

export default defineChildren({
  register() {
    return { responseRouter };
  },
  async onCreated() {
    logger.info('[yunzai-loader] 正在加载插件...');
    await loader.load();
  }
});
