import { defineRouter, lazy, defineChildren, logger } from 'alemonjs';
import { loader } from './loader/index.js';
export { PluginLoader } from './loader/loader.js';
export { YunzaiPlugin } from './loader/plugin.js';
export { createYunzaiEvent } from './loader/event.js';
export { segment } from './loader/segment.js';

const responseRouter = defineRouter([
    {
        regular: /^(!|！|\/|#|＃)(yzp|云崽p)/,
        selects: ['message.create', 'private.message.create'],
        handler: lazy(() => import('./response/admin.js'))
    },
    {
        regular: /.*/,
        handler: lazy(() => import('./response/bridge.js'))
    }
]);
var index = defineChildren({
    register() {
        return { responseRouter };
    },
    async onCreated() {
        logger.info('[yunzai-loader] 正在加载插件...');
        await loader.load();
    }
});

export { index as default, loader };
