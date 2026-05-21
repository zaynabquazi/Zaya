import { useState, useEffect, useRef } from 'react';
import { addTask, toggleTask, deleteTask, getTasks } from '@/services/taskService';
import { type Task } from '@/services/storageService';

export function TaskOrganizer() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTaskList();
  }, []);

  const loadTaskList = async () => {
    const loaded = await getTasks();
    setTasks(loaded);
  };

  const handleAddTask = async () => {
    setError(null);
    const result = await addTask(newTaskText);
    if (result.error) {
      setError(result.error);
      inputRef.current?.focus();
      return;
    }
    setNewTaskText('');
    await loadTaskList();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTask();
    }
  };

  const handleToggle = async (id: string) => {
    await toggleTask(id);
    await loadTaskList();
  };

  const handleDelete = async (id: string) => {
    await deleteTask(id);
    await loadTaskList();
  };

  return (
    <div className="space-y-4">
      {/* Add task input */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a task..."
          maxLength={200}
          className="flex-1 py-2 px-3 text-sm border border-zaya-gray-100 rounded-lg outline-none focus:border-zaya-gray-300 transition-colors duration-zaya"
        />
        <button
          onClick={handleAddTask}
          className="py-2 px-3 text-sm font-medium bg-zaya-black text-zaya-white rounded-lg hover:opacity-90 transition-opacity duration-zaya"
        >
          Add
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {/* Task list */}
      {tasks.length === 0 ? (
        <p className="text-xs text-zaya-gray-300 text-center py-6">
          No tasks yet. Add one above to get started.
        </p>
      ) : (
        <ul className="space-y-1">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-zaya-gray-50 transition-colors duration-zaya group"
            >
              <button
                onClick={() => handleToggle(task.id)}
                className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all duration-zaya ${
                  task.completed
                    ? 'bg-zaya-black border-zaya-black'
                    : 'border-zaya-gray-200 hover:border-zaya-gray-400'
                }`}
                aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
              >
                {task.completed && (
                  <span className="text-white text-[10px]">✓</span>
                )}
              </button>
              <span
                className={`flex-1 text-sm transition-all duration-zaya ${
                  task.completed
                    ? 'line-through text-zaya-gray-300'
                    : 'text-zaya-black'
                }`}
              >
                {task.text}
              </span>
              <button
                onClick={() => handleDelete(task.id)}
                className="text-zaya-gray-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-zaya text-xs"
                aria-label="Delete task"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
