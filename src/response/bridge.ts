/**
 * 消息分发桥接 — catch-all 路由处理器
 *
 * 将所有未被管理指令匹配的消息转发给 Yunzai 插件加载器处理。
 */
import { isMaster } from '@src/utils';
import { EventsEnum, Next } from 'alemonjs';
import { loader } from '../loader';
import { createYunzaiEvent } from '../loader/event';

export default (e: EventsEnum, next: Next) => {
  e.IsMaster = e?.IsMaster ?? isMaster(e?.UserId, e?.Platform);

  const yunzaiEvent = createYunzaiEvent(e);

  void loader.deal(yunzaiEvent);

  // 不阻塞后续路由，允许其他插件继续处理
  next();
};
