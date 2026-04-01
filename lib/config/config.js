import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'yaml';

function safeReadYaml(filePath) {
    try {
        if (!existsSync(filePath)) {
            return {};
        }
        const raw = readFileSync(filePath, 'utf-8');
        try {
            return yaml.parse(raw) ?? {};
        }
        catch {
            return {};
        }
    }
    catch {
        return {};
    }
}
function loadPackageJson() {
    const candidates = [join(process.cwd(), 'package.json'), join(process.cwd(), '..', 'package.json')];
    for (const p of candidates) {
        try {
            if (existsSync(p)) {
                return JSON.parse(readFileSync(p, 'utf-8'));
            }
        }
        catch {
        }
    }
    return { name: 'alemonjs', version: '0.0.0' };
}
class Cfg {
    _package = null;
    _masterQQ = [];
    configCache = {};
    constructor() {
        this.loadMasterKey();
    }
    loadMasterKey() {
        const configPath = join(process.cwd(), 'alemon.config.yaml');
        try {
            const data = safeReadYaml(configPath);
            if (data?.master_key) {
                this._masterQQ = Array.isArray(data.master_key) ? data.master_key.map(String) : [String(data.master_key)];
            }
        }
        catch {
        }
    }
    get masterQQ() {
        return this._masterQQ;
    }
    get package() {
        this._package ??= loadPackageJson();
        return this._package;
    }
    get qq() {
        return globalThis.Bot?.uin ?? 0;
    }
    get other() {
        return { masterQQ: this._masterQQ };
    }
    get notice() {
        return {};
    }
    get bot() {
        return { log_level: 'info' };
    }
    getGroup(groupId) {
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
    getOther() {
        return this.other;
    }
    getNotice() {
        return this.notice;
    }
    getdefSet(name) {
        return this.getYaml('default_config', name);
    }
    getConfig(name) {
        return this.getYaml('config', name);
    }
    getYaml(type, name) {
        const key = `${type}.${name}`;
        if (this.configCache[key]) {
            return this.configCache[key];
        }
        const filePath = join(process.cwd(), 'config', type, `${name}.yaml`);
        const data = safeReadYaml(filePath);
        this.configCache[key] = data;
        return data;
    }
    get renderer() {
        return {};
    }
    get redis() {
        return {};
    }
    get db() {
        return {};
    }
}
const cfg = new Cfg();

export { Cfg, cfg as default };
