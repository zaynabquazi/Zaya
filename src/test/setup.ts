import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock chrome APIs
const storageMock: Record<string, unknown> = {};

const chromeStorageLocal = {
  get: (keys: string | string[], callback: (result: Record<string, unknown>) => void) => {
    const result: Record<string, unknown> = {};
    const keyArray = typeof keys === 'string' ? [keys] : keys;
    for (const key of keyArray) {
      if (storageMock[key] !== undefined) {
        result[key] = storageMock[key];
      }
    }
    callback(result);
  },
  set: (items: Record<string, unknown>, callback?: () => void) => {
    Object.assign(storageMock, items);
    callback?.();
  },
  remove: (keys: string | string[], callback?: () => void) => {
    const keyArray = typeof keys === 'string' ? [keys] : keys;
    for (const key of keyArray) {
      delete storageMock[key];
    }
    callback?.();
  },
  clear: (callback?: () => void) => {
    Object.keys(storageMock).forEach((key) => delete storageMock[key]);
    callback?.();
  },
};

const chromeAlarms = {
  create: vi.fn(),
  clear: vi.fn(),
  clearAll: vi.fn(),
  get: vi.fn(),
  getAll: vi.fn(),
  onAlarm: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
};

const chromeNotifications = {
  create: vi.fn(),
  clear: vi.fn(),
  onClicked: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
};

const chromeRuntime = {
  sendMessage: vi.fn(),
  onMessage: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
  onInstalled: {
    addListener: vi.fn(),
  },
};

const chromeTabs = {
  query: vi.fn(),
  sendMessage: vi.fn(),
};

// Assign chrome mock to global (partial mock — only what Zaya uses)
Object.assign(globalThis, {
  chrome: {
    storage: { local: chromeStorageLocal },
    alarms: chromeAlarms,
    notifications: chromeNotifications,
    runtime: chromeRuntime,
    tabs: chromeTabs,
  },
});

// Export for test access
export { storageMock };
