import { defineConfig } from 'jsxp';
import PluginHelp from './src/img/views/PluginHelp';
import PluginReadme from './src/img/views/PluginReadme';
import YZ from './src/img/views/YZ';
export default defineConfig({
  routes: {
    '/YZ': {
      element: YZ
    },
    '/PluginHelp': {
      element: PluginHelp
    },
    '/PluginReadme': {
      element: PluginReadme
    }
  }
});
