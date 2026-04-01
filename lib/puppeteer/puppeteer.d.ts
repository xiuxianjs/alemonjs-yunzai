declare function screenshot(name: string, data?: any): Promise<any>;
declare function screenshots(name: string, data?: any): Promise<any>;
declare const _default: {
    screenshot: typeof screenshot;
    screenshots: typeof screenshots;
};
export default _default;
export { screenshot, screenshots };
