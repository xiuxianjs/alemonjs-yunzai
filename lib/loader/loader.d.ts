import type { PluginEntry } from './types';
export declare class PluginLoader {
    priority: PluginEntry[];
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
    private matchEvent;
    getPluginList(): {
        name: string;
        priority: number;
        filePath: string;
    }[];
}
