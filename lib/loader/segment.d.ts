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
};
