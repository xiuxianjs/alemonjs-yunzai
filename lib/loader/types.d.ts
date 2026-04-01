export interface Rule {
    reg: string | RegExp;
    fnc: string;
    event?: string;
    permission?: string;
    log?: boolean;
}
export interface Task {
    cron: string;
    fnc: string;
    log?: boolean;
}
export interface PluginEntry {
    cls: any;
    name: string;
    priority: number;
    filePath: string;
}
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
export interface ButtonItem {
    text: string;
    input?: string;
    callback?: string;
    link?: string;
}
