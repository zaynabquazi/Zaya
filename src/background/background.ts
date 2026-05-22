/**
 * Zaya Background Service Worker
 * - Manages wellness reminder alarms via Chrome Alarms API
 * - Delivers Chrome notifications
 * - Handles extension lifecycle events
 */

interface ReminderConfig {
  type: 'water' | 'stretch' | 'break';
  enabled: boolean;
  intervalMinutes: 30 | 60 | 90;
}

const REMINDER_MESSAGES: Record<string, string[]> = {
  water: [
    'Water check 💧',
    'Time for a sip of water.',
    'Stay hydrated!',
    'Have you had water recently?',
  ],
  stretch: [
    'Take a quick stretch.',
    'Stretch your shoulders.',
    'Move your body for a moment.',
    'Roll your neck gently.',
  ],
  break: [
    'Rest your eyes for a minute.',
    "You've been focused for a while.",
    'Take a short break.',
    'Step away for a moment.',
  ],
};

// ─── Installation ───────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  console.log('Zaya extension installed');
  chrome.storage.local.get('preferences', (result) => {
    if (!result.preferences) {
      const defaultPrefs = {
        remindersEnabled: true,
        reminders: [
          { type: 'water' as const, enabled: true, intervalMinutes: 60 as const },
          { type: 'stretch' as const, enabled: true, intervalMinutes: 60 as const },
          { type: 'break' as const, enabled: true, intervalMinutes: 60 as const },
        ],
        apiKey: '',
      };
      chrome.storage.local.set({ preferences: defaultPrefs });
      registerAlarms(defaultPrefs.reminders);
    } else {
      // Re-register alarms from existing settings
      if (result.preferences.remindersEnabled) {
        registerAlarms(result.preferences.reminders);
      }
    }
  });
});

// ─── Message Handling ───────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'TOGGLE_REMINDERS':
      handleToggleReminders(message.enabled);
      sendResponse({ success: true });
      break;

    case 'UPDATE_REMINDERS':
      handleUpdateReminders(message.reminders);
      sendResponse({ success: true });
      break;

    case 'GET_REMINDER_STATUS':
      chrome.storage.local.get('preferences', (result) => {
        sendResponse({
          remindersEnabled: result.preferences?.remindersEnabled ?? true,
          reminders: result.preferences?.reminders ?? [],
        });
      });
      return true; // Keep channel open for async response
  }
  return true;
});

// ─── Alarm Management ───────────────────────────────────────────────────────

function registerAlarms(reminders: ReminderConfig[]) {
  for (const reminder of reminders) {
    const alarmName = `zaya-${reminder.type}`;
    // Always clear existing alarm first to reset the timer
    chrome.alarms.clear(alarmName, () => {
      if (reminder.enabled) {
        // Chrome enforces minimum 1 minute for periodInMinutes
        const interval = Math.max(1, reminder.intervalMinutes);
        chrome.alarms.create(alarmName, {
          delayInMinutes: interval, // First fire after this delay
          periodInMinutes: interval, // Then repeat at this interval
        });
        console.log(`Zaya: Alarm set for ${reminder.type} every ${interval} min`);
      }
    });
  }
}

function handleToggleReminders(enabled: boolean) {
  chrome.storage.local.get('preferences', (result) => {
    const prefs = result.preferences || {};
    prefs.remindersEnabled = enabled;
    chrome.storage.local.set({ preferences: prefs });

    if (enabled) {
      registerAlarms(prefs.reminders || []);
    } else {
      chrome.alarms.clearAll();
    }
  });
}

function handleUpdateReminders(reminders: ReminderConfig[]) {
  chrome.storage.local.get('preferences', (result) => {
    const prefs = result.preferences || {};
    prefs.reminders = reminders;
    chrome.storage.local.set({ preferences: prefs });

    if (prefs.remindersEnabled !== false) {
      registerAlarms(reminders);
    }
  });
}

// ─── Alarm Fired → Notification + Sound ─────────────────────────────────────

function playPingSound() {
  // Play sound by injecting into the active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    if (tabId) {
      chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const audio = new Audio(chrome.runtime.getURL('sounds/ping.wav'));
          audio.volume = 0.5;
          audio.play().catch(() => {});
        },
      }).catch(() => {});
    }
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  const type = alarm.name.replace('zaya-', '');
  const messages = REMINDER_MESSAGES[type];

  if (messages) {
    const message = messages[Math.floor(Math.random() * messages.length)];
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Zaya',
      message,
      requireInteraction: true,
    });
    playPingSound();
  }
});

// ─── Service Worker Startup (re-register alarms) ────────────────────────────

chrome.storage.local.get('preferences', (result) => {
  if (result.preferences?.remindersEnabled) {
    registerAlarms(result.preferences.reminders || []);
  }
});
