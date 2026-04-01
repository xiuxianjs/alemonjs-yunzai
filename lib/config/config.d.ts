declare class Cfg {
    private _package;
    private _masterQQ;
    private configCache;
    constructor();
    private loadMasterKey;
    get masterQQ(): string[];
    get package(): any;
    get qq(): number;
    get other(): any;
    get notice(): any;
    get bot(): any;
    getGroup(groupId?: string): any;
    getOther(): any;
    getNotice(): any;
    getdefSet(name: string): any;
    getConfig(name: string): any;
    getYaml(type: string, name: string): any;
    get renderer(): any;
    get redis(): any;
    get db(): any;
}
declare const cfg: Cfg;
export default cfg;
export { Cfg };
