import { UI_ICONS } from '../../assets/img/index.js';
import classNames from 'classnames';
import React from 'react';
import HTML from './HTML.js';

const COLOR_CLASSES = {
    green: { text: 'text-yz-green', bg: 'bg-yz-green-bg', border: 'border-yz-green' },
    blue: { text: 'text-yz-blue', bg: 'bg-yz-blue-bg', border: 'border-yz-blue' },
    orange: { text: 'text-yz-orange', bg: 'bg-yz-orange-bg', border: 'border-yz-orange' }
};
const COMMANDS = [
    { cmd: '#yzp状态', desc: '查看已加载的插件及优先级', color: 'orange' },
    { cmd: '#yzp重载', desc: '重新扫描并加载所有插件', color: 'blue' },
    { cmd: '#yzp插件列表', desc: '查看已加载的插件名称', color: 'green' },
    { cmd: '#yzp帮助', desc: '查看本帮助图', color: 'orange' }
];
function Title({ color, children }) {
    return (React.createElement("div", { className: 'flex items-center gap-2 mb-2.5' },
        React.createElement("div", { className: classNames('w-[5px] h-5 rounded-sm', color) }),
        React.createElement("span", { className: 'text-base font-bold text-yz-text' }, children)));
}
function CmdRow({ cmd, desc, color }) {
    const c = COLOR_CLASSES[color];
    return (React.createElement("div", { className: classNames('flex items-center gap-2.5 rounded-lg py-2 px-3 border-l-4', c.bg, c.border) },
        React.createElement("span", { className: classNames('text-[13px] font-bold min-w-[80px]', c.text) }, cmd),
        React.createElement("span", { className: 'text-xs text-yz-sub' }, desc)));
}
function YZHelp({ data: _data }) {
    return (React.createElement(HTML, { style: { width: '780px' } },
        React.createElement("div", { className: "p-[15px] bg-yz-bg font-['tttgbnumber',system-ui,sans-serif] text-base text-yz-text" },
            React.createElement("div", { className: 'rounded-xl py-3.5 px-5 mb-3.5 shadow-card flex items-center justify-between', style: { background: 'linear-gradient(135deg, #e8d5b0, #d3bc8e)' } },
                React.createElement("div", { className: 'flex items-center gap-2' },
                    React.createElement("img", { src: UI_ICONS.paimon, className: 'w-7 h-7' }),
                    React.createElement("span", { className: 'text-[22px] font-bold text-yz-gold-dark' }, "Yunzai \u00B7 \u7BA1\u7406\u5E2E\u52A9")),
                React.createElement("span", { className: 'text-[13px] text-[#6b5838]' }, "\u26A0\uFE0F \u4EC5\u4E3B\u4EBA\u53EF\u7528")),
            React.createElement("div", { className: 'bg-yz-card rounded-xl p-4 mb-3.5 shadow-card' },
                React.createElement(Title, { color: 'bg-yz-gold' }, "\u4F7F\u7528\u8BF4\u660E"),
                React.createElement("div", { className: 'text-[12px] text-yz-sub leading-[1.8]' },
                    "\u672C\u4E2D\u95F4\u4EF6\u81EA\u52A8\u52A0\u8F7D ",
                    React.createElement("span", { className: 'font-bold text-yz-text' }, "packages/"),
                    " \u76EE\u5F55\u4E0B\u7684 Yunzai \u98CE\u683C\u63D2\u4EF6\uFF0C \u5C06\u63D2\u4EF6\u6D88\u606F\u5904\u7406\u6865\u63A5\u5230 AlemonJS \u5E73\u53F0\uFF0C\u65E0\u9700\u5B8C\u6574\u7684 Miao-Yunzai \u8FD0\u884C\u65F6\u3002")),
            React.createElement("div", { className: 'bg-yz-card rounded-xl p-4 mb-3.5 shadow-card' },
                React.createElement(Title, { color: 'bg-yz-blue' }, "\u7BA1\u7406\u6307\u4EE4"),
                React.createElement("div", { className: 'flex flex-col gap-2' }, COMMANDS.map((c, i) => (React.createElement(CmdRow, { key: i, ...c }))))),
            React.createElement("div", { className: 'bg-yz-card rounded-xl py-2.5 px-4 shadow-sm flex items-center justify-between' },
                React.createElement("span", { className: 'text-xs text-yz-sub' }, "\uD83D\uDCA1 \u524D\u7F00\u652F\u6301 # ! / \u00B7 \u53EF\u7528 #yzp \u6216 #\u4E91\u5D3Dp"),
                React.createElement("span", { className: 'text-xs text-[#b0a18a]' }, "Powered by alemonjs")))));
}

export { YZHelp as default };
