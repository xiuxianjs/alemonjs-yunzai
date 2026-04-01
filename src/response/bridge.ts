/**
 * 消息分发桥接 — catch-all 路由处理器
 *
 * 将所有未被管理指令匹配的消息转发给 Yunzai 插件加载器处理。
 */
import { EventsEnum, Next } from 'alemonjs';
import { loader } from '../loader';
import { createYunzaiEvent } from '../loader/event';

export default async (e: EventsEnum, next: Next) => {
  const yunzaiEvent = createYunzaiEvent(e);
  const handled = await loader.deal(yunzaiEvent);

  if (!handled) {
    next();
  }
};
