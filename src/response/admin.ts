/**
 * Yunzai 插件加载器 — 管理指令（仅限主人使用）
 */
import { EventsEnum, Format, Next, useMessage } from 'alemonjs';
import { loader } from '../loader';

export default async (e: EventsEnum, next: Next) => {
  if (!e.IsMaster) {
    next();

    return;
  }

  const [message] = useMessage(e);
  const cmd = (e.MessageText ?? '').replace(/^(!|！|\/|#|＃)(yzp|云崽p)\s*/, '').trim();

  const reply = (text: string) => {
    void message.send({ format: Format.create().addText(text) });
  };

  try {
    if (cmd === '状态') {
      const plugins = loader.getPluginList();
      const lines = [`已加载 ${plugins.length} 个插件:`];

      for (const p of plugins) {
        lines.push(`  · ${p.name} (priority: ${p.priority})`);
      }

      reply(lines.join('\n'));
    } else if (cmd === '重载') {
      reply('正在重新加载插件...');
      await loader.reload();
      reply(`重载完成，已加载 ${loader.pluginCount} 个插件`);
    } else if (cmd.startsWith('插件列表') || cmd.startsWith('插件帮助')) {
      const plugins = loader.getPluginList();

      if (plugins.length === 0) {
        reply('当前没有加载任何插件。\n请在 packages/ 目录下添加插件。');
      } else {
        const lines = ['已加载的插件:'];

        for (const p of plugins) {
          lines.push(`  · ${p.name}`);
        }

        reply(lines.join('\n'));
      }
    } else if (cmd === '帮助') {
      reply('#yzp状态 — 查看插件及优先级\n#yzp重载 — 重新加载插件\n#yzp插件列表 — 查看插件名称\n#yzp帮助 — 查看本帮助');
    } else {
      next();
    }
  } catch (err: any) {
    reply(`操作失败: ${err.message ?? '未知错误'}`);
  }
};
