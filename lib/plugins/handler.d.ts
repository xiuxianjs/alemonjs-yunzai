declare const Handler: {
    add(cfg: {
        ns: string;
        fn: (...args: any[]) => any;
        self?: any;
        priority?: number;
        key?: string;
        event?: string;
    }): void;
    del(ns: string, key?: string): void;
    callAll(key: string, e: any, args?: any): Promise<any>;
    call(key: string, e: any, args?: any, allHandler?: boolean): Promise<any>;
    has(key: string): boolean;
};
export default Handler;
