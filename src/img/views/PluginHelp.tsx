import { UI_ICONS } from '@src/assets/img/index.js';
import React from 'react';
import HTML from './HTML.js';

interface PluginItem {
  name: string;
  priority: number;
}

interface PluginHelpProps {
  data: { plugins: PluginItem[] };
}

export default function PluginHelp({ data }: PluginHelpProps) {
  const { plugins } = data;

  return (
    <HTML style={{ width: '780px' }}>
      <div className="p-[15px] bg-yz-bg font-['tttgbnumber',system-ui,sans-serif] text-base text-yz-text">
        {/* ═══ 标题卡 ═══ */}
        <div
          className='rounded-xl py-3.5 px-5 mb-3.5 shadow-card flex items-center justify-between'
          style={{ background: 'linear-gradient(135deg, #b8e6c8, #7cc99a)' }}
        >
          <div className='flex items-center gap-2'>
            <img src={UI_ICONS.paimon} className='w-7 h-7' />
            <span className='text-[22px] font-bold text-[#2a5e3a]'>Yunzai · 插件列表</span>
          </div>
          <span className='text-[13px] text-[#2a7a3a] font-bold'>共 {plugins.length} 个</span>
        </div>

        {/* ═══ 插件列表 ═══ */}
        {plugins.length > 0 ? (
          <div className='bg-yz-card rounded-xl p-4 mb-3.5 shadow-card'>
            <div className='flex items-center gap-2 mb-2.5'>
              <div className='w-[5px] h-5 rounded-sm bg-yz-green' />
              <span className='text-base font-bold text-yz-text'>已加载</span>
              <span className='text-[11px] text-yz-gray ml-1'>({plugins.length})</span>
            </div>
            <div className='grid grid-cols-2 gap-2'>
              {plugins.map((p, i) => (
                <div key={i} className='bg-yz-green-bg rounded-lg py-2 px-3 border-l-4 border-yz-green'>
                  <div className='flex items-center gap-1.5'>
                    <span className='text-[12px] font-bold text-yz-green'>✅</span>
                    <span className='text-[12px] font-bold text-yz-text truncate'>{p.name}</span>
                    <span className='text-[10px] text-yz-gray ml-auto shrink-0'>priority: {p.priority}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className='bg-yz-card rounded-xl p-4 mb-3.5 shadow-card'>
            <div className='text-[13px] text-yz-sub text-center py-4'>当前没有加载任何插件，请在 packages/ 目录下添加 Yunzai 风格插件。</div>
          </div>
        )}

        {/* ═══ 底部 ═══ */}
        <div className='bg-yz-card rounded-xl py-2.5 px-4 shadow-sm flex items-center justify-between'>
          <span className='text-xs text-yz-sub'>💡 发送 #yzp帮助 查看管理指令</span>
          <span className='text-xs text-[#b0a18a]'>Powered by alemonjs</span>
        </div>
      </div>
    </HTML>
  );
}
