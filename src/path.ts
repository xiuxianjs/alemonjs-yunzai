/**
 * 路径配置
 */
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** 插件包根目录 (alemonjs-yunzai/) */
export const PACKAGE_ROOT = join(__dirname, '..');

/** Yunzai 插件加载目录 — 父级 packages/（与本包同级） */
export const PLUGINS_DIR = join(PACKAGE_ROOT, '..');
