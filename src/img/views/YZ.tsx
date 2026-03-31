import { UI_ICONS } from '@src/assets/img/index.js';
import classNames from 'classnames';
import React from 'react';
import HTML from './HTML.js';

// ─── 数据 ───

type ColorKey = 'green' | 'blue' | 'orange';

const COLOR_CLASSES: Record<ColorKey, { text: string; bg: string; border: string }> = {
  green: { text: 'text-yz-green', bg: 'bg-yz-green-bg', border: 'border-yz-green' },
  blue: { text: 'text-yz-blue', bg: 'bg-yz-blue-bg', border: 'border-yz-blue' },
  orange: { text: 'text-yz-orange', bg: 'bg-yz-orange-bg', border: 'border-yz-orange' }
};

const COMMANDS: { cmd: string; desc: string; color: ColorKey }[] = [
  { cmd: '#yzp状态', desc: '查看已加载的插件及优先级', color: 'orange' },
  { cmd: '#yzp重载', desc: '重新扫描并加载所有插件', color: 'blue' },
  { cmd: '#yzp插件列表', desc: '查看已加载的插件名称', color: 'green' },
  { cmd: '#yzp帮助', desc: '查看本帮助图', color: 'orange' }
];

interface YZHelpProps {
  data?: Record<string, unknown>;
}

/** 小节标题 */
function Title({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className='flex items-center gap-2 mb-2.5'>
      <div className={classNames('w-[5px] h-5 rounded-sm', color)} />
      <span className='text-base font-bold text-yz-text'>{children}</span>
    </div>
  );
}

/** 指令行 */
function CmdRow({ cmd, desc, color }: { cmd: string; desc: string; color: ColorKey }) {
  const c = COLOR_CLASSES[color];

  return (
    <div className={classNames('flex items-center gap-2.5 rounded-lg py-2 px-3 border-l-4', c.bg, c.border)}>
      <span className={classNames('text-[13px] font-bold min-w-[80px]', c.text)}>{cmd}</span>
      <span className='text-xs text-yz-sub'>{desc}</span>
    </div>
  );
}

export default function YZHelp({ data: _data }: YZHelpProps) {
  return (
    <HTML style={{ width: '780px' }}>
      <div className="p-[15px] bg-yz-bg font-['tttgbnumber',system-ui,sans-serif] text-base text-yz-text">
        {/* ═══ 标题卡 ═══ */}
        <div
          className='rounded-xl py-3.5 px-5 mb-3.5 shadow-card flex items-center justify-between'
          style={{ background: 'linear-gradient(135deg, #e8d5b0, #d3bc8e)' }}
        >
          <div className='flex items-center gap-2'>
            <img src={UI_ICONS.paimon} className='w-7 h-7' />
            <span className='text-[22px] font-bold text-yz-gold-dark'>Yunzai · 管理帮助</span>
          </div>
          <span className='text-[13px] text-[#6b5838]'>⚠️ 仅主人可用</span>
        </div>

        {/* ═══ 说明 ═══ */}
        <div className='bg-yz-card rounded-xl p-4 mb-3.5 shadow-card'>
          <Title color='bg-yz-gold'>使用说明</Title>
          <div className='text-[12px] text-yz-sub leading-[1.8]'>
            本中间件自动加载 <span className='font-bold text-yz-text'>packages/</span> 目录下的 Yunzai 风格插件， 将插件消息处理桥接到 AlemonJS 平台，无需完整的
            Miao-Yunzai 运行时。
          </div>
        </div>

        {/* ═══ 管理指令 ═══ */}
        <div className='bg-yz-card rounded-xl p-4 mb-3.5 shadow-card'>
          <Title color='bg-yz-blue'>管理指令</Title>
          <div className='flex flex-col gap-2'>
            {COMMANDS.map((c, i) => (
              <CmdRow key={i} {...c} />
            ))}
          </div>
        </div>

        {/* ═══ 底部 ═══ */}
        <div className='bg-yz-card rounded-xl py-2.5 px-4 shadow-sm flex items-center justify-between'>
          <span className='text-xs text-yz-sub'>💡 前缀支持 # ! / · 可用 #yzp 或 #云崽p</span>
          <span className='text-xs text-[#b0a18a]'>Powered by alemonjs</span>
        </div>
      </div>
    </HTML>
  );
}
