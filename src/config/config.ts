/**
 * Yunzai cfg 配置兼容层
 *
 * 让插件中 import cfg from '...config.js' 的代码不报错。
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'yaml';
/** 安全读取 YAML (无 yaml 依赖时降级) */
function safeReadYaml(filePath: string): any {
  try {
    if (!existsSync(filePath)) {
      return {};
    }
    const raw = readFileSync(filePath, 'utf-8');

    // 尝试动态加载 yaml
    try {
      return yaml.parse(raw) ?? {};
    } catch {
      return {};
    }
  } catch {
    return {};
  }
}

/** 查找 package.json */
function loadPackageJson(): any {
  const candidates = [join(process.cwd(), 'package.json'), join(process.cwd(), '..', 'package.json')];

  for (const p of candidates) {
    try {
      if (existsSync(p)) {
        return JSON.parse(readFileSync(p, 'utf-8'));
      }
    } catch {
      /* skip */
    }
  }

  return { name: 'alemonjs', version: '0.0.0' };
}

class Cfg {
  private _package: any = null;
  private _masterQQ: string[] = [];
  private configCache: Record<string, any> = {};

  constructor() {
    this.loadMasterKey();
  }

  /** 从 alemon.config.yaml 读取 master_key */
  private loadMasterKey() {
    const configPath = join(process.cwd(), 'alemon.config.yaml');

    try {
      const data = safeReadYaml(configPath);

      if (data?.master_key) {
        this._masterQQ = Array.isArray(data.master_key) ? data.master_key.map(String) : [String(data.master_key)];
      }
    } catch {
      /* ignore */
    }
  }

  /** 主人 QQ 列表 */
  get masterQQ(): string[] {
    return this._masterQQ;
  }

  /** package.json 内容 */
  get package(): any {
    this._package ??= loadPackageJson();

    return this._package;
  }

  /** 机器人 QQ 号（桩） */
  get qq(): number {
    return (globalThis as any).Bot?.uin ?? 0;
  }

  /** other 配置 */
  get other(): any {
    return { masterQQ: this._masterQQ };
  }

  /** notice 配置 */
  get notice(): any {
    return {};
  }

  /** bot 配置 */
  get bot(): any {
    return { log_level: 'info' };
  }

  /** 群配置 */
  getGroup(groupId?: string): any {
    const defaults = {
      groupCD: 0,
      singleCD: 0,
      onlyReplyAt: 0,
      botAlias: [],
      imgAddLimit: 0,
      imgMaxSize: 0
    };

    if (!groupId) {
      return defaults;
    }

    return defaults;
  }

  /** other 配置 */
  getOther(): any {
    return this.other;
  }

  /** notice 配置 */
  getNotice(): any {
    return this.notice;
  }

  /** 获取默认配置 */
  getdefSet(name: string): any {
    return this.getYaml('default_config', name);
  }

  /** 获取用户配置 */
  getConfig(name: string): any {
    return this.getYaml('config', name);
  }

  /** 读取 YAML 配置 */
  getYaml(type: string, name: string): any {
    const key = `${type}.${name}`;

    if (this.configCache[key]) {
      return this.configCache[key];
    }

    const filePath = join(process.cwd(), 'config', type, `${name}.yaml`);
    const data = safeReadYaml(filePath);

    this.configCache[key] = data;

    return data;
  }

  /** renderer 配置 */
  get renderer(): any {
    return {};
  }

  /** redis 配置 */
  get redis(): any {
    return {};
  }

  /** db 配置 */
  get db(): any {
    return {};
  }
}

const cfg = new Cfg();

export default cfg;
export { Cfg };
