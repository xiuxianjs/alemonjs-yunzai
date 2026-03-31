/**
 * Yunzai 插件加载器 — 统一导出
 */
import { PLUGINS_DIR } from '../path';
import { PluginLoader } from './loader';

export { createYunzaiEvent } from './event';
export { PluginLoader } from './loader';
export { YunzaiPlugin } from './plugin';
export { segment } from './segment';

/** 全局单例加载器 */
export const loader = new PluginLoader(PLUGINS_DIR);
