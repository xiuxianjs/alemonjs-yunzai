import { PLUGINS_DIR } from '../path.js';
import { PluginLoader } from './loader.js';
export { createYunzaiEvent } from './event.js';
export { YunzaiPlugin } from './plugin.js';
export { segment } from './segment.js';

const loader = new PluginLoader(PLUGINS_DIR);

export { PluginLoader, loader };
