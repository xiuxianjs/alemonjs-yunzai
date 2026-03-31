import { UI_ICONS } from '../../assets/img/index.js';
import React from 'react';
import HTML from './HTML.js';

function PluginHelp({ data }) {
    const { plugins } = data;
    return (React.createElement(HTML, { style: { width: '780px' } },
        React.createElement("div", { className: "p-[15px] bg-yz-bg font-['tttgbnumber',system-ui,sans-serif] text-base text-yz-text" },
            React.createElement("div", { className: 'rounded-xl py-3.5 px-5 mb-3.5 shadow-card flex items-center justify-between', style: { background: 'linear-gradient(135deg, #b8e6c8, #7cc99a)' } },
                React.createElement("div", { className: 'flex items-center gap-2' },
                    React.createElement("img", { src: UI_ICONS.paimon, className: 'w-7 h-7' }),
                    React.createElement("span", { className: 'text-[22px] font-bold text-[#2a5e3a]' }, "Yunzai \u00B7 \u63D2\u4EF6\u5217\u8868")),
                React.createElement("span", { className: 'text-[13px] text-[#2a7a3a] font-bold' },
                    "\u5171 ",
                    plugins.length,
                    " \u4E2A")),
            plugins.length > 0 ? (React.createElement("div", { className: 'bg-yz-card rounded-xl p-4 mb-3.5 shadow-card' },
                React.createElement("div", { className: 'flex items-center gap-2 mb-2.5' },
                    React.createElement("div", { className: 'w-[5px] h-5 rounded-sm bg-yz-green' }),
                    React.createElement("span", { className: 'text-base font-bold text-yz-text' }, "\u5DF2\u52A0\u8F7D"),
                    React.createElement("span", { className: 'text-[11px] text-yz-gray ml-1' },
                        "(",
                        plugins.length,
                        ")")),
                React.createElement("div", { className: 'grid grid-cols-2 gap-2' }, plugins.map((p, i) => (React.createElement("div", { key: i, className: 'bg-yz-green-bg rounded-lg py-2 px-3 border-l-4 border-yz-green' },
                    React.createElement("div", { className: 'flex items-center gap-1.5' },
                        React.createElement("span", { className: 'text-[12px] font-bold text-yz-green' }, "\u2705"),
                        React.createElement("span", { className: 'text-[12px] font-bold text-yz-text truncate' }, p.name),
                        React.createElement("span", { className: 'text-[10px] text-yz-gray ml-auto shrink-0' },
                            "priority: ",
                            p.priority)))))))) : (React.createElement("div", { className: 'bg-yz-card rounded-xl p-4 mb-3.5 shadow-card' },
                React.createElement("div", { className: 'text-[13px] text-yz-sub text-center py-4' }, "\u5F53\u524D\u6CA1\u6709\u52A0\u8F7D\u4EFB\u4F55\u63D2\u4EF6\uFF0C\u8BF7\u5728 packages/ \u76EE\u5F55\u4E0B\u6DFB\u52A0 Yunzai \u98CE\u683C\u63D2\u4EF6\u3002"))),
            React.createElement("div", { className: 'bg-yz-card rounded-xl py-2.5 px-4 shadow-sm flex items-center justify-between' },
                React.createElement("span", { className: 'text-xs text-yz-sub' }, "\uD83D\uDCA1 \u53D1\u9001 #yzp\u5E2E\u52A9 \u67E5\u770B\u7BA1\u7406\u6307\u4EE4"),
                React.createElement("span", { className: 'text-xs text-[#b0a18a]' }, "Powered by alemonjs")))));
}

export { PluginHelp as default };
