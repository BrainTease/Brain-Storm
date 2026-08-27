const store = {};

const mockSecureStore = {
  setItemAsync: jest.fn(async (key, value) => {
    store[key] = value;
  }),
  getItemAsync: jest.fn(async (key) => {
    return store[key] ?? null;
  }),
  deleteItemAsync: jest.fn(async (key) => {
    delete store[key];
  }),
  __reset() {
    Object.keys(store).forEach((k) => delete store[k]);
    jest.clearAllMocks();
  },
  __getStore() {
    return { ...store };
  },
};

module.exports = mockSecureStore;
