import type { PluginEntry } from './types';
interface CompiledRule {
    reg: RegExp;
    fnc: string;
    permission?: string;
    log?: boolean;
}
interface LoadedPlugin extends PluginEntry {
    eventParts: string[];
    compiledRules: CompiledRule[];
    hasAccept: boolean;
    tasks: {
        cron: string;
        fnc: string;
        log?: boolean;
    }[];
}
export declare class PluginLoader {
    priority: LoadedPlugin[];
    private pluginsDir;
    constructor(pluginsDir: string);
    get pluginCount(): number;
    setupGlobals(): Promise<void>;
    load(): Promise<void>;
    private static YUNZAI_PATTERNS;
    private isYunzaiFile;
    private loadPluginDir;
    private loadPluginFile;
    private isPluginClass;
    deal(e: any): Promise<boolean>;
    reload(): Promise<void>;
    private collectTasks;
    private clearTasks;
    matchEvent(pluginEvent: string, e: any): boolean;
    getPluginList(): {
        name: string;
        priority: number;
        filePath: string;
    }[];
}
export {};
