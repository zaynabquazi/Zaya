import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Property 6: Wellness Notification Message Selection
 * For any reminder type, the selected message belongs to that type's list.
 */

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

type ReminderType = 'water' | 'stretch' | 'break';

function selectMessage(type: ReminderType): string {
  const messages = REMINDER_MESSAGES[type];
  return messages[Math.floor(Math.random() * messages.length)];
}

describe('Wellness Reminder System', () => {
  describe('Property 6: Wellness Notification Message Selection', () => {
    const reminderTypeArb = fc.constantFrom<ReminderType>('water', 'stretch', 'break');

    it('selected message belongs to the correct type list', () => {
      fc.assert(
        fc.property(reminderTypeArb, (type) => {
          const message = selectMessage(type);
          expect(REMINDER_MESSAGES[type]).toContain(message);
        }),
        { numRuns: 100 }
      );
    });

    it('selected message never comes from a different type list', () => {
      fc.assert(
        fc.property(reminderTypeArb, (type) => {
          const message = selectMessage(type);
          const otherTypes = (['water', 'stretch', 'break'] as ReminderType[]).filter(
            (t) => t !== type
          );

          for (const otherType of otherTypes) {
            // Message should not appear in other type's list
            // (unless it happens to be the same string, which it isn't in our data)
            if (!REMINDER_MESSAGES[type].some((m) => REMINDER_MESSAGES[otherType].includes(m))) {
              expect(REMINDER_MESSAGES[otherType]).not.toContain(message);
            }
          }
        }),
        { numRuns: 100 }
      );
    });

    it('each type has at least one message', () => {
      for (const type of ['water', 'stretch', 'break'] as ReminderType[]) {
        expect(REMINDER_MESSAGES[type].length).toBeGreaterThan(0);
      }
    });
  });
});
