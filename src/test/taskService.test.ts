import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import {
  validateTaskInput,
  sortTasks,
  addTask,
  toggleTask,
  deleteTask,
  getTasks,
} from '@/services/taskService';
import { type Task } from '@/services/storageService';
import { storageMock } from './setup';

beforeEach(() => {
  Object.keys(storageMock).forEach((key) => delete storageMock[key]);
});

describe('Task Service', () => {
  describe('Property 7: Task Input Validation', () => {
    it('accepts strings with ≥1 non-whitespace char and length ≤200', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 300 }),
          (text) => {
            const result = validateTaskInput(text);
            const hasNonWhitespace = text.trim().length > 0;
            const withinLength = text.length <= 200;

            if (hasNonWhitespace && withinLength) {
              expect(result.valid).toBe(true);
            } else {
              expect(result.valid).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('rejects empty string', () => {
      expect(validateTaskInput('').valid).toBe(false);
    });

    it('rejects whitespace-only string', () => {
      expect(validateTaskInput('   \t\n  ').valid).toBe(false);
    });

    it('rejects string over 200 characters', () => {
      const longText = 'a'.repeat(201);
      expect(validateTaskInput(longText).valid).toBe(false);
    });

    it('accepts string at exactly 200 characters', () => {
      const text = 'a'.repeat(200);
      expect(validateTaskInput(text).valid).toBe(true);
    });

    it('accepts single character', () => {
      expect(validateTaskInput('x').valid).toBe(true);
    });
  });

  describe('Property 9: Task Display Sort Order', () => {
    const taskArb = fc.record({
      id: fc.uuid(),
      text: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
      completed: fc.boolean(),
      createdAt: fc.integer({ min: 0, max: 2000000000000 }),
    });

    it('all incomplete tasks appear before all completed tasks', () => {
      fc.assert(
        fc.property(
          fc.array(taskArb, { minLength: 0, maxLength: 50 }),
          (tasks) => {
            const sorted = sortTasks(tasks);

            let seenCompleted = false;
            for (const task of sorted) {
              if (task.completed) {
                seenCompleted = true;
              } else if (seenCompleted) {
                // Found incomplete after completed — violation
                return false;
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('within each group, tasks are ordered newest first (descending createdAt)', () => {
      fc.assert(
        fc.property(
          fc.array(taskArb, { minLength: 0, maxLength: 50 }),
          (tasks) => {
            const sorted = sortTasks(tasks);

            // Check incomplete group
            const incomplete = sorted.filter((t) => !t.completed);
            for (let i = 1; i < incomplete.length; i++) {
              if (incomplete[i].createdAt > incomplete[i - 1].createdAt) {
                return false;
              }
            }

            // Check completed group
            const completed = sorted.filter((t) => t.completed);
            for (let i = 1; i < completed.length; i++) {
              if (completed[i].createdAt > completed[i - 1].createdAt) {
                return false;
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('sort preserves all original tasks (no additions or removals)', () => {
      fc.assert(
        fc.property(
          fc.array(taskArb, { minLength: 0, maxLength: 50 }),
          (tasks) => {
            const sorted = sortTasks(tasks);
            expect(sorted.length).toBe(tasks.length);

            const originalIds = new Set(tasks.map((t) => t.id));
            const sortedIds = new Set(sorted.map((t) => t.id));
            expect(sortedIds).toEqual(originalIds);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('CRUD operations', () => {
    it('addTask creates a task and persists it', async () => {
      const result = await addTask('Buy groceries');
      expect(result.task).toBeDefined();
      expect(result.task!.text).toBe('Buy groceries');
      expect(result.task!.completed).toBe(false);

      const tasks = await getTasks();
      expect(tasks.length).toBe(1);
      expect(tasks[0].text).toBe('Buy groceries');
    });

    it('addTask trims whitespace from text', async () => {
      const result = await addTask('  Hello world  ');
      expect(result.task!.text).toBe('Hello world');
    });

    it('addTask rejects empty text', async () => {
      const result = await addTask('');
      expect(result.error).toBeDefined();
      expect(result.task).toBeUndefined();
    });

    it('addTask enforces 100-task limit', async () => {
      // Pre-fill storage with 100 tasks
      const tasks: Task[] = Array.from({ length: 100 }, (_, i) => ({
        id: `id-${i}`,
        text: `Task ${i}`,
        completed: false,
        createdAt: i,
      }));
      storageMock['tasks'] = tasks;

      const result = await addTask('One more');
      expect(result.error).toContain('limit');
      expect(result.task).toBeUndefined();
    });

    it('toggleTask flips completed state', async () => {
      const result = await addTask('Test toggle');
      const id = result.task!.id;

      let tasks = await getTasks();
      expect(tasks[0].completed).toBe(false);

      await toggleTask(id);
      tasks = await getTasks();
      const toggled = tasks.find((t) => t.id === id);
      expect(toggled!.completed).toBe(true);
    });

    it('deleteTask removes the task', async () => {
      const r1 = await addTask('Task A');
      const r2 = await addTask('Task B');

      await deleteTask(r1.task!.id);
      const tasks = await getTasks();
      expect(tasks.length).toBe(1);
      expect(tasks[0].id).toBe(r2.task!.id);
    });
  });
});
