import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import {
  storageGet,
  storageSet,
  loadPreferences,
  loadTasks,
  saveTasks,
  savePreferences,
  getDefaultPreferences,
  type Task,
  type UserPreferences,
  type ReminderConfig,
} from '@/services/storageService';
import { storageMock } from './setup';

// Clear storage before each test
beforeEach(() => {
  Object.keys(storageMock).forEach((key) => delete storageMock[key]);
});

// Arbitrary generators
const taskArb = fc.record({
  id: fc.uuid(),
  text: fc.string({ minLength: 1, maxLength: 200 }).filter((s) => s.trim().length > 0),
  completed: fc.boolean(),
  createdAt: fc.integer({ min: 0, max: 2000000000000 }),
});

const reminderTypeArb = fc.constantFrom<ReminderConfig['type']>('water', 'stretch', 'break');
const intervalArb = fc.constantFrom<ReminderConfig['intervalMinutes']>(30, 60, 90);

const reminderConfigArb = fc.record({
  type: reminderTypeArb,
  enabled: fc.boolean(),
  intervalMinutes: intervalArb,
});

const preferencesArb: fc.Arbitrary<UserPreferences> = fc.record({
  remindersEnabled: fc.boolean(),
  reminders: fc.tuple(
    reminderConfigArb.map((r) => ({ ...r, type: 'water' as const })),
    reminderConfigArb.map((r) => ({ ...r, type: 'stretch' as const })),
    reminderConfigArb.map((r) => ({ ...r, type: 'break' as const }))
  ).map(([w, s, b]) => [w, s, b]),
  apiKey: fc.string({ maxLength: 100 }),
});

describe('Storage Service', () => {
  describe('basic operations', () => {
    it('should return null for non-existent keys', async () => {
      const result = await storageGet('tasks');
      expect(result).toBeNull();
    });

    it('should set and get a value', async () => {
      const tasks: Task[] = [
        { id: '1', text: 'Test task', completed: false, createdAt: Date.now() },
      ];
      await storageSet('tasks', tasks);
      const result = await storageGet('tasks');
      expect(result).toEqual(tasks);
    });
  });

  describe('Property 8: Task Persistence Round-Trip', () => {
    it('saving and loading tasks produces deeply equal results', () => {
      return fc.assert(
        fc.asyncProperty(
          fc.array(taskArb, { minLength: 0, maxLength: 100 }),
          async (tasks) => {
            // Clear storage
            Object.keys(storageMock).forEach((key) => delete storageMock[key]);

            await saveTasks(tasks);
            const loaded = await loadTasks();
            expect(loaded).toEqual(tasks);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('empty task array round-trips correctly', async () => {
      await saveTasks([]);
      const loaded = await loadTasks();
      expect(loaded).toEqual([]);
    });

    it('returns empty array when no tasks stored', async () => {
      const loaded = await loadTasks();
      expect(loaded).toEqual([]);
    });
  });

  describe('Property 10: Preferences Persistence Round-Trip with Defaults', () => {
    it('saving and loading preferences produces equivalent results', () => {
      return fc.assert(
        fc.asyncProperty(preferencesArb, async (prefs) => {
          Object.keys(storageMock).forEach((key) => delete storageMock[key]);

          await savePreferences(prefs);
          const loaded = await loadPreferences();
          expect(loaded).toEqual(prefs);
        }),
        { numRuns: 100 }
      );
    });

    it('returns default values when no preferences exist', async () => {
      const loaded = await loadPreferences();
      const defaults = getDefaultPreferences();
      expect(loaded).toEqual(defaults);
    });

    it('merges partial preferences with defaults', async () => {
      // Store preferences with missing apiKey
      const partial = {
        remindersEnabled: false,
        reminders: [
          { type: 'water' as const, enabled: false, intervalMinutes: 30 as const },
          { type: 'stretch' as const, enabled: true, intervalMinutes: 90 as const },
          { type: 'break' as const, enabled: false, intervalMinutes: 60 as const },
        ],
      };
      storageMock['preferences'] = partial;

      const loaded = await loadPreferences();
      expect(loaded.remindersEnabled).toBe(false);
      expect(loaded.apiKey).toBe(''); // default
      expect(loaded.reminders[0].intervalMinutes).toBe(30);
    });
  });
});
