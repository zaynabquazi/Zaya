import { useEffect, useState } from 'react';

export function Popup() {
  const [remindersEnabled, setRemindersEnabled] = useState(false);

  useEffect(() => {
    chrome.storage.local.get('preferences', (result) => {
      if (result.preferences?.remindersEnabled !== undefined) {
        setRemindersEnabled(result.preferences.remindersEnabled);
      }
    });
  }, []);

  const handleOpenZaya = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) return;

      // Try sending message to content script
      chrome.tabs.sendMessage(tabId, { type: 'OPEN_SIDEBAR' }, (response) => {
        if (chrome.runtime.lastError || !response) {
          // Content script not injected yet — inject it first, then send message
          chrome.scripting.executeScript(
            {
              target: { tabId },
              files: ['content.js'],
            },
            () => {
              // Small delay to let the script initialize
              setTimeout(() => {
                chrome.tabs.sendMessage(tabId, { type: 'OPEN_SIDEBAR' });
              }, 100);
            }
          );
        }
        window.close();
      });
    });
  };

  const handleToggleReminders = () => {
    const newState = !remindersEnabled;
    setRemindersEnabled(newState);
    chrome.runtime.sendMessage({
      type: 'TOGGLE_REMINDERS',
      enabled: newState,
    });
  };

  return (
    <div className="p-4 font-sans bg-zaya-white text-zaya-black">
      <h1 className="text-lg font-semibold mb-3">Zaya</h1>
      <p className="text-sm text-zaya-gray-400 mb-4">
        Your AI writing companion
      </p>

      <button
        onClick={handleOpenZaya}
        className="w-full py-2 px-4 bg-zaya-black text-zaya-white rounded-zaya text-sm font-medium hover:opacity-90 transition-opacity duration-zaya"
      >
        Open Zaya
      </button>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm">Wellness Reminders</span>
        <button
          onClick={handleToggleReminders}
          className={`relative w-10 h-5 rounded-full transition-colors duration-zaya ${
            remindersEnabled ? 'bg-zaya-black' : 'bg-zaya-gray-200'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-zaya ${
              remindersEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <p className="mt-2 text-xs text-zaya-gray-300">
        {remindersEnabled ? 'Reminders active' : 'Reminders paused'}
      </p>
    </div>
  );
}
