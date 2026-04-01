const segment = {
    text(text) {
        return { type: 'text', text };
    },
    at(qq, text) {
        return { type: 'at', qq: String(qq), text: text ?? '' };
    },
    image(file) {
        if (Buffer.isBuffer(file)) {
            return { type: 'image', file };
        }
        return { type: 'image', url: String(file), file: String(file) };
    },
    face(id) {
        return { type: 'face', data: id };
    },
    record(file) {
        return { type: 'record', file };
    },
    video(file) {
        return { type: 'video', file };
    },
    json(data) {
        return { type: 'json', data };
    },
    xml(data) {
        return { type: 'xml', data };
    },
    button(buttons) {
        return { type: 'button', buttons };
    },
    share(url, title = '', content = '', image = '') {
        return { type: 'share', data: { url, title, content, image } };
    },
    music(type, id) {
        return { type: 'music', data: { type, id } };
    },
    poke(qq) {
        return { type: 'poke', qq: String(qq) };
    }
};

export { segment };
