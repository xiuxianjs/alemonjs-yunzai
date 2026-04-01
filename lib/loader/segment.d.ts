import type { ButtonItem, MessageSegment } from './types';
export declare const segment: {
    text(text: string): MessageSegment;
    at(qq: string | number, text?: string): MessageSegment;
    image(file: string | Buffer): MessageSegment;
    face(id: number): MessageSegment;
    record(file: string): MessageSegment;
    video(file: string): MessageSegment;
    json(data: any): MessageSegment;
    xml(data: string): MessageSegment;
    button(buttons: ButtonItem[]): MessageSegment;
    share(url: string, title?: string, content?: string, image?: string): MessageSegment;
    music(type: string, id: string | number): MessageSegment;
    poke(qq: string | number): MessageSegment;
};
