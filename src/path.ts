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

/** 插件定义 (配置文件中的插件描述) */
export interface PluginDef {
  /** 插件目录名 */
  dirName: string;
  /** 仓库地址 */
  repoUrl: string;
  /** 显示名称 */
  label: string;
  /** 别名列表 (不区分大小写) */
  aliases: string[];
}
