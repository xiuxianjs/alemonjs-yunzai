/**
 * Yunzai 插件加载器 — 类型定义
 */

/** 插件规则定义 */
export interface Rule {
  /** 正则表达式，匹配 e.msg */
  reg: string | RegExp;
  /** 触发的方法名 */
  fnc: string;
  /** 事件类型过滤 (默认继承 plugin.event) */
  event?: string;
  /** 权限: 'all' | 'master' | 'owner' | 'admin' */
  permission?: string;
  /** 是否打印日志 */
  log?: boolean;
}

/** 定时任务 */
export interface Task {
  /** cron 表达式 */
  cron: string;
  /** 方法名 */
  fnc: string;
  /** 是否打印日志 */
  log?: boolean;
}

/** 加载后的插件条目 */
export interface PluginEntry {
  /** 插件类构造函数 */
  cls: any;
  /** 插件名 */
  name: string;
  /** 优先级 (越小越先执行) */
  priority: number;
  /** 来源文件路径 */
  filePath: string;
}

/** segment 消息元素 */
export interface MessageSegment {
  type: 'text' | 'image' | 'at' | 'face' | 'record' | 'video' | 'file' | 'json' | 'xml' | 'button';
  text?: string;
  qq?: string | number;
  url?: string;
  file?: string | Buffer;
  data?: any;
  buttons?: ButtonItem[];
  [key: string]: any;
}

/** 按钮元素 */
export interface ButtonItem {
  text: string;
  input?: string;
  callback?: string;
  link?: string;
}
