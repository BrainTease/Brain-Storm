const listeners = {};

const mockLinking = {
  createURL: jest.fn((path, options) => {
    const params = options?.queryParams
      ? '?' + Object.entries(options.queryParams).map(([k, v]) => `${k}=${v}`).join('&')
      : '';
    return `brainstorm://${path}${params}`;
  }),
  openURL: jest.fn(() => Promise.resolve()),
  addEventListener: jest.fn((event, callback) => {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
    return {
      remove: () => {
        const idx = listeners[event].indexOf(callback);
        if (idx !== -1) listeners[event].splice(idx, 1);
      },
    };
  }),
  parse: jest.fn((url) => {
    const [pathAndQuery] = url.split('?');
    const path = pathAndQuery.replace('brainstorm://', '');
    const queryString = url.split('?')[1] || '';
    const queryParams = {};
    if (queryString) {
      queryString.split('&').forEach((pair) => {
        const [key, value] = pair.split('=');
        queryParams[decodeURIComponent(key)] = decodeURIComponent(value || '');
      });
    }
    return { path, queryParams };
  }),
  __emitUrl(url) {
    if (listeners.url) {
      listeners.url.forEach((cb) => cb({ url }));
    }
  },
  __reset() {
    Object.keys(listeners).forEach((k) => delete listeners[k]);
    jest.clearAllMocks();
  },
};

module.exports = mockLinking;
