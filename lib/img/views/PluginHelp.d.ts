import React from 'react';
interface PluginItem {
    name: string;
    priority: number;
}
interface PluginHelpProps {
    data: {
        plugins: PluginItem[];
    };
}
export default function PluginHelp({ data }: PluginHelpProps): React.JSX.Element;
export {};
