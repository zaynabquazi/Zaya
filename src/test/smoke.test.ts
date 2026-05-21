import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

describe('Zaya test infrastructure', () => {
  it('should have chrome mock available', () => {
    expect(chrome).toBeDefined();
    expect(chrome.storage.local).toBeDefined();
    expect(chrome.alarms).toBeDefined();
    expect(chrome.notifications).toBeDefined();
    expect(chrome.runtime).toBeDefined();
  });

  it('should support fast-check property tests', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        return typeof s === 'string';
      }),
      { numRuns: 100 }
    );
  });

  it('chrome.storage.local mock should work', () => {
    return new Promise<void>((resolve) => {
      chrome.storage.local.set({ testKey: 'testValue' }, () => {
        chrome.storage.local.get('testKey', (result) => {
          expect(result.testKey).toBe('testValue');
          resolve();
        });
      });
    });
  });
});
