export declare function sleep(ms: number): Promise<void>;
export declare function downFile(fileUrl: string, savePath: string, param?: any): Promise<boolean>;
export declare function relpyPrivate(userId: string | number, msg: any): Promise<any>;
export declare function makeForwardMsg(e: any, msg?: any, dec?: string, msgsscr?: boolean): Promise<any>;
declare const _default: {
    sleep: typeof sleep;
    relpyPrivate: typeof relpyPrivate;
    downFile: typeof downFile;
    makeForwardMsg: typeof makeForwardMsg;
};
export default _default;
