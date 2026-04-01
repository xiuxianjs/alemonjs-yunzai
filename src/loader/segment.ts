/**
 * Yunzai segment 兼容层
 *
 * 提供与 icqq segment 相同的消息构建 API
 */
import type { ButtonItem, MessageSegment } from './types';

export const segment = {
  /** 纯文本 */
  text(text: string): MessageSegment {
    return { type: 'text', text };
  },

  /** @某人 */
  at(qq: string | number, text?: string): MessageSegment {
    return { type: 'at', qq: String(qq), text: text ?? '' };
  },

  /** 图片 (URL / Buffer / 本地路径) */
  image(file: string | Buffer): MessageSegment {
    if (Buffer.isBuffer(file)) {
      return { type: 'image', file };
    }

    return { type: 'image', url: String(file), file: String(file) };
  },

  /** 表情 */
  face(id: number): MessageSegment {
    return { type: 'face', data: id };
  },

  /** 语音 */
  record(file: string): MessageSegment {
    return { type: 'record', file };
  },

  /** 视频 */
  video(file: string): MessageSegment {
    return { type: 'video', file };
  },

  /** JSON 结构化消息 */
  json(data: any): MessageSegment {
    return { type: 'json', data };
  },

  /** XML 卡片 */
  xml(data: string): MessageSegment {
    return { type: 'xml', data };
  },

  /** 交互按钮 */
  button(buttons: ButtonItem[]): MessageSegment {
    return { type: 'button', buttons };
  }
};
