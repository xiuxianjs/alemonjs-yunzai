import { loader } from '../loader/index.js';
import { createYunzaiEvent } from '../loader/event.js';

var bridge = (e, next) => {
    const yunzaiEvent = createYunzaiEvent(e);
    void loader.deal(yunzaiEvent);
    next();
};

export { bridge as default };
