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
export declare class YunzaiPlugin {
    name: string;
    dsc: string;
    event: string;
    priority: number;
    rule: Rule[];
    task: Task | Task[];
    handler: any;
    namespace: string;
    e: any;
    constructor(options?: PluginOptions);
    reply(msg: any, quote?: boolean, data?: any): Promise<any>;
    setContext(type: string, isGroup?: boolean, time?: number, timeout?: string): {
        fnc: string;
        plugin: string;
    };
    getContext(type?: string, isGroup?: boolean): any;
    finish(type: string, isGroup?: boolean): void;
    conKey(isGroup?: boolean): string;
    awaitContext(...args: any[]): Promise<any>;
    resolveContext(context: any): void;
    makeForwardMsg(title: string, msg?: any, end?: string, resmsg?: string): Promise<any> | string;
    renderImg(plugin: string, tpl: string, data?: any, cfg?: any): Promise<any> | false;
}
export declare function findContext(e: any): {
    pluginName: string;
    fnc: string;
} | null;
export {};
