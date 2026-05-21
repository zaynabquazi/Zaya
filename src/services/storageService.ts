/**
 * Storage Service — typed abstraction over chrome.storage.local
 */

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export interface ReminderConfig {
  type: 'water' | 'stretch' | 'break';
  enabled: boolean;
  intervalMinutes: number;
}

export interface UserPreferences {
  remindersEnabled: boolean;
  reminders: ReminderConfig[];
  apiKey: string;
  apiEndpoint: string;
  model: string;
}

export interface StorageSchema {
  tasks: Task[];
  preferences: UserPreferences;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  remindersEnabled: true,
  reminders: [
    { type: 'water', enabled: true, intervalMinutes: 60 },
    { type: 'stretch', enabled: true, intervalMinutes: 60 },
    { type: 'break', enabled: true, intervalMinutes: 60 },
  ],
  apiKey: '',
  apiEndpoint: '',
  model: '',
};

export function getDefaultPreferences(): UserPreferences {
  return structuredClone(DEFAULT_PREFERENCES);
}

export async function storageGet<K extends keyof StorageSchema>(
  key: K
): Promise<StorageSchema[K] | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      const value = result[key];
      if (value === undefined) {
        resolve(null);
      } else {
        resolve(value as StorageSchema[K]);
      }
    });
  });
}

export async function storageSet<K extends keyof StorageSchema>(
  key: K,
  value: StorageSchema[K]
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

export async function storageRemove(key: keyof StorageSchema): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(key, () => {
      resolve();
    });
  });
}

export async function loadPreferences(): Promise<UserPreferences> {
  const stored = await storageGet('preferences');
  if (!stored) {
    return getDefaultPreferences();
  }
  const defaults = getDefaultPreferences();
  return {
    remindersEnabled: stored.remindersEnabled ?? defaults.remindersEnabled,
    apiKey: stored.apiKey ?? defaults.apiKey,
    apiEndpoint: stored.apiEndpoint ?? defaults.apiEndpoint,
    model: stored.model ?? defaults.model,
    reminders: stored.reminders?.length
      ? stored.reminders.map((r, i) => ({
          ...defaults.reminders[i],
          ...r,
        }))
      : defaults.reminders,
  };
}

export async function loadTasks(): Promise<Task[]> {
  const stored = await storageGet('tasks');
  return stored ?? [];
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  return storageSet('tasks', tasks);
}

export async function savePreferences(prefs: UserPreferences): Promise<void> {
  return storageSet('preferences', prefs);
}
