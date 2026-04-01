import { logger } from 'alemonjs';

const events = {};
const Handler = {
    add(cfg) {
        const { ns, fn, self, priority = 500 } = cfg;
        const key = cfg.key ?? cfg.event ?? '';
        if (!key || !fn) {
            return;
        }
        Handler.del(ns, key);
        logger.info(`[Handler][Reg]: [${ns}][${key}]`);
        events[key] = events[key] ?? [];
        events[key].push({ priority, fn, ns, self, key });
        events[key].sort((a, b) => a.priority - b.priority);
    },
    del(ns, key = '') {
        if (!key) {
            for (const k in events) {
                Handler.del(ns, k);
            }
            return;
        }
        if (!events[key]) {
            return;
        }
        events[key] = events[key].filter(h => h.ns !== ns);
    },
    callAll(key, e, args) {
        return Handler.call(key, e, args, true);
    },
    async call(key, e, args, allHandler = false) {
        if (!events[key]) {
            return undefined;
        }
        let ret;
        for (const obj of events[key]) {
            let done = true;
            const reject = (msg = '') => {
                if (msg) {
                    logger.info(`[Handler][Reject]: [${obj.ns}][${key}] ${msg}`);
                }
                done = false;
            };
            ret = await obj.fn.call(obj.self, e, args, reject);
            if (done && !allHandler) {
                logger.info(`[Handler][Done]: [${obj.ns}][${key}]`);
                return ret;
            }
        }
        return ret;
    },
    has(key) {
        return !!events[key]?.length;
    }
};

export { Handler as default };
