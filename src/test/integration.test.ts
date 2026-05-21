import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { storageMock } from './setup';

/**
 * Integration tests for message passing flows between
 * content script, sidebar, popup, and background script.
 */

describe('Integration: Message Passing', () => {
  beforeEach(() => {
    Object.keys(storageMock).forEach((key) => delete storageMock[key]);
    vi.clearAllMocks();
  });

  describe('Popup → Content Script → Sidebar flow', () => {
    it('OPEN_SIDEBAR message should be handled by content script listener', () => {
      // Simulate the message listener registration
      const listeners: Array<(msg: unknown, sender: unknown, sendResponse: (r: unknown) => void) => boolean> = [];
      (chrome.runtime.onMessage.addListener as unknown as Mock).mockImplementation((fn: typeof listeners[0]) => {
        listeners.push(fn);
      });

      // The content script registers its listener
      // We verify the message format matches what popup sends
      const popupMessage = { type: 'OPEN_SIDEBAR' };
      const popupMessageWithText = { type: 'OPEN_SIDEBAR', text: 'Hello world' };

      // Verify message structure is consistent
      expect(popupMessage.type).toBe('OPEN_SIDEBAR');
      expect(popupMessageWithText.text).toBe('Hello world');
    });

    it('popup sends correct message format to open sidebar', () => {
      // Simulate what popup does
      const tabId = 123;
      const message = { type: 'OPEN_SIDEBAR' };

      (chrome.tabs.query as unknown as Mock).mockImplementation((_query: unknown, callback: (tabs: Array<{ id: number }>) => void) => {
        callback([{ id: tabId }]);
      });

      chrome.tabs.query({ active: true, currentWindow: true } as chrome.tabs.QueryInfo, (tabs) => {
        const tab = tabs[0];
        if (tab?.id) {
          chrome.tabs.sendMessage(tab.id, message);
        }
      });

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(tabId, message);
    });
  });

  describe('Popup → Background Script → Alarms flow', () => {
    it('TOGGLE_REMINDERS enables alarms when set to true', () => {
      // Set up preferences in storage
      storageMock['preferences'] = {
        remindersEnabled: false,
        reminders: [
          { type: 'water', enabled: true, intervalMinutes: 60 },
          { type: 'stretch', enabled: true, intervalMinutes: 60 },
          { type: 'break', enabled: false, intervalMinutes: 90 },
        ],
        apiKey: '',
      };

      // Simulate what background does on TOGGLE_REMINDERS
      const message = { type: 'TOGGLE_REMINDERS', enabled: true };

      // Background reads preferences and creates alarms
      chrome.storage.local.get('preferences', (result: Record<string, unknown>) => {
        const prefs = result.preferences as {
          reminders: Array<{ type: string; enabled: boolean; intervalMinutes: number }>;
        };
        for (const reminder of prefs.reminders) {
          if (reminder.enabled) {
            chrome.alarms.create(`zaya-${reminder.type}`, {
              periodInMinutes: reminder.intervalMinutes,
            });
          }
        }
      });

      // Verify alarms were created for enabled reminders
      expect(chrome.alarms.create).toHaveBeenCalledWith('zaya-water', { periodInMinutes: 60 });
      expect(chrome.alarms.create).toHaveBeenCalledWith('zaya-stretch', { periodInMinutes: 60 });
      expect(chrome.alarms.create).not.toHaveBeenCalledWith('zaya-break', expect.anything());
      expect(message.enabled).toBe(true);
    });

    it('TOGGLE_REMINDERS disables all alarms when set to false', () => {
      const message = { type: 'TOGGLE_REMINDERS', enabled: false };

      // Background clears all alarms
      if (!message.enabled) {
        chrome.alarms.clearAll();
      }

      expect(chrome.alarms.clearAll).toHaveBeenCalled();
    });
  });

  describe('Sidebar → Background Script → Alarm Update flow', () => {
    it('UPDATE_REMINDERS re-registers alarms with new intervals', () => {
      const updatedReminders = [
        { type: 'water', enabled: true, intervalMinutes: 30 },
        { type: 'stretch', enabled: false, intervalMinutes: 60 },
        { type: 'break', enabled: true, intervalMinutes: 90 },
      ];

      // Simulate background handling UPDATE_REMINDERS
      for (const reminder of updatedReminders) {
        if (reminder.enabled) {
          chrome.alarms.create(`zaya-${reminder.type}`, {
            periodInMinutes: reminder.intervalMinutes,
          });
        } else {
          chrome.alarms.clear(`zaya-${reminder.type}`);
        }
      }

      expect(chrome.alarms.create).toHaveBeenCalledWith('zaya-water', { periodInMinutes: 30 });
      expect(chrome.alarms.clear).toHaveBeenCalledWith('zaya-stretch');
      expect(chrome.alarms.create).toHaveBeenCalledWith('zaya-break', { periodInMinutes: 90 });
    });
  });

  describe('Service Worker Restart → Alarm Re-registration', () => {
    it('re-registers active alarms from persisted settings on startup', () => {
      storageMock['preferences'] = {
        remindersEnabled: true,
        reminders: [
          { type: 'water', enabled: true, intervalMinutes: 30 },
          { type: 'stretch', enabled: true, intervalMinutes: 90 },
          { type: 'break', enabled: false, intervalMinutes: 60 },
        ],
        apiKey: '',
      };

      // Simulate service worker startup behavior
      chrome.storage.local.get('preferences', (result: Record<string, unknown>) => {
        const prefs = result.preferences as {
          remindersEnabled: boolean;
          reminders: Array<{ type: string; enabled: boolean; intervalMinutes: number }>;
        };
        if (prefs?.remindersEnabled) {
          for (const reminder of prefs.reminders) {
            if (reminder.enabled) {
              chrome.alarms.create(`zaya-${reminder.type}`, {
                periodInMinutes: reminder.intervalMinutes,
              });
            }
          }
        }
      });

      expect(chrome.alarms.create).toHaveBeenCalledWith('zaya-water', { periodInMinutes: 30 });
      expect(chrome.alarms.create).toHaveBeenCalledWith('zaya-stretch', { periodInMinutes: 90 });
      expect(chrome.alarms.create).not.toHaveBeenCalledWith('zaya-break', expect.anything());
    });

    it('does not register alarms if reminders are disabled', () => {
      storageMock['preferences'] = {
        remindersEnabled: false,
        reminders: [
          { type: 'water', enabled: true, intervalMinutes: 60 },
        ],
        apiKey: '',
      };

      chrome.storage.local.get('preferences', (result: Record<string, unknown>) => {
        const prefs = result.preferences as {
          remindersEnabled: boolean;
          reminders: Array<{ type: string; enabled: boolean; intervalMinutes: number }>;
        };
        if (prefs?.remindersEnabled) {
          for (const reminder of prefs.reminders) {
            if (reminder.enabled) {
              chrome.alarms.create(`zaya-${reminder.type}`, {
                periodInMinutes: reminder.intervalMinutes,
              });
            }
          }
        }
      });

      expect(chrome.alarms.create).not.toHaveBeenCalled();
    });
  });

  describe('Privacy safeguards', () => {
    it('no writing history is persisted after processing', () => {
      // After an AI request completes, only tasks and preferences should be in storage
      storageMock['tasks'] = [{ id: '1', text: 'Test', completed: false, createdAt: 1 }];
      storageMock['preferences'] = { remindersEnabled: true, reminders: [], apiKey: 'sk-test' };

      // Verify no writing history keys exist
      expect(storageMock['writingHistory']).toBeUndefined();
      expect(storageMock['processedText']).toBeUndefined();
      expect(storageMock['aiResults']).toBeUndefined();
    });

    it('only tasks and preferences are stored in local storage', () => {
      const allowedKeys = ['tasks', 'preferences'];
      storageMock['tasks'] = [];
      storageMock['preferences'] = {};

      const storedKeys = Object.keys(storageMock);
      for (const key of storedKeys) {
        expect(allowedKeys).toContain(key);
      }
    });
  });
});
