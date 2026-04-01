import { loader } from '../loader/index.js';
import { createYunzaiEvent } from '../loader/event.js';

var bridge = async (e, next) => {
    const yunzaiEvent = createYunzaiEvent(e);
    const handled = await loader.deal(yunzaiEvent);
    if (!handled) {
        next();
    }
};

export { bridge as default };
