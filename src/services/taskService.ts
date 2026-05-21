/**
 * Task Organizer Service — manages task CRUD with validation and sorting
 */

import { v4 as uuidv4 } from 'uuid';
import { loadTasks, saveTasks, type Task } from './storageService';

const MAX_TASKS = 100;
const MAX_TASK_LENGTH = 200;

export interface TaskValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate task input text.
 * Accepts if: has ≥1 non-whitespace char AND total length ≤200.
 */
export function validateTaskInput(text: string): TaskValidationResult {
  if (!text || text.trim().length === 0) {
    return { valid: false, error: 'Task text cannot be empty.' };
  }
  if (text.length > MAX_TASK_LENGTH) {
    return { valid: false, error: `Task text must be ${MAX_TASK_LENGTH} characters or fewer.` };
  }
  return { valid: true };
}

/**
 * Sort tasks: incomplete before completed, newest first within each group.
 */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    // Incomplete tasks first
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    // Newest first within each group
    return b.createdAt - a.createdAt;
  });
}

/**
 * Add a new task. Returns the created task or null if validation fails.
 */
export async function addTask(text: string): Promise<{ task?: Task; error?: string }> {
  const validation = validateTaskInput(text);
  if (!validation.valid) {
    return { error: validation.error };
  }

  const tasks = await loadTasks();
  if (tasks.length >= MAX_TASKS) {
    return { error: `Task limit reached (${MAX_TASKS} tasks). Delete some tasks to add more.` };
  }

  const task: Task = {
    id: uuidv4(),
    text: text.trim(),
    completed: false,
    createdAt: Date.now(),
  };

  tasks.push(task);
  await saveTasks(tasks);
  return { task };
}

/**
 * Toggle a task's completed state.
 */
export async function toggleTask(id: string): Promise<void> {
  const tasks = await loadTasks();
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.completed = !task.completed;
    await saveTasks(tasks);
  }
}

/**
 * Delete a task by id.
 */
export async function deleteTask(id: string): Promise<void> {
  const tasks = await loadTasks();
  const filtered = tasks.filter((t) => t.id !== id);
  await saveTasks(filtered);
}

/**
 * Get all tasks, sorted (incomplete first, newest first within each group).
 */
export async function getTasks(): Promise<Task[]> {
  const tasks = await loadTasks();
  return sortTasks(tasks);
}
