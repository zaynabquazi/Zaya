import { useState, useEffect, useRef, useCallback } from 'react';
import { loadPreferences, savePreferences, type ReminderConfig } from '@/services/storageService';

const REMINDER_LABELS: Record<ReminderConfig['type'], { label: string; icon: string }> = {
  water: { label: 'Water', icon: '💧' },
  stretch: { label: 'Stretch', icon: '🧘' },
  break: { label: 'Break', icon: '☕' },
};

const MIN_MINUTES = 1;
const MAX_MINUTES = 120;

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
}

function TimeSlider({ value, onChange }: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const getValueFromPosition = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return value;
    const rect = track.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(MIN_MINUTES + percent * (MAX_MINUTES - MIN_MINUTES));
  }, [value]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    onChange(getValueFromPosition(e.clientX));
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging.current) {
      onChange(getValueFromPosition(e.clientX));
    }
  }, [getValueFromPosition, onChange]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleTouchStart = (e: React.TouchEvent) => {
    isDragging.current = true;
    onChange(getValueFromPosition(e.touches[0].clientX));
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging.current) {
      onChange(getValueFromPosition(e.touches[0].clientX));
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
  };

  const percent = ((value - MIN_MINUTES) / (MAX_MINUTES - MIN_MINUTES)) * 100;

  return (
    <div className="space-y-1.5">
      <div
        ref={trackRef}
        className="relative h-6 flex items-center cursor-pointer select-none"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Track background */}
        <div className="absolute left-0 right-0 h-1 bg-zaya-gray-100 rounded-full" />
        {/* Filled track */}
        <div
          className="absolute left-0 h-1 bg-zaya-black rounded-full transition-none"
          style={{ width: `${percent}%` }}
        />
        {/* Draggable dot */}
        <div
          className="absolute w-4 h-4 bg-zaya-black rounded-full shadow-sm -translate-x-1/2 transition-none hover:scale-110"
          style={{ left: `${percent}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-zaya-gray-300">
        <span>1m</span>
        <span className="text-xs font-medium text-zaya-black">{value} min</span>
        <span>120m</span>
      </div>
    </div>
  );
}

export function WellnessReminders() {
  const [reminders, setReminders] = useState<ReminderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const prefs = await loadPreferences();
    setReminders(prefs.reminders);
    setLoading(false);
  };

  const updateReminder = (type: ReminderConfig['type'], updates: Partial<ReminderConfig>) => {
    const updated = reminders.map((r) =>
      r.type === type ? { ...r, ...updates } : r
    );
    setReminders(updated);

    // Debounce the save so dragging doesn't spam storage
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      const prefs = await loadPreferences();
      prefs.reminders = updated;
      await savePreferences(prefs);
      chrome.runtime.sendMessage({
        type: 'UPDATE_REMINDERS',
        reminders: updated,
      });
    }, 300);
  };

  if (loading) {
    return <p className="text-xs text-zaya-gray-300">Loading...</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-zaya-gray-400 leading-relaxed">
        Gentle reminders to help you stay healthy while working online.
      </p>

      {reminders.map((reminder) => {
        const meta = REMINDER_LABELS[reminder.type];
        return (
          <div
            key={reminder.type}
            className="p-3 border border-zaya-gray-100 rounded-zaya space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {meta.icon} {meta.label}
              </span>
              <button
                onClick={() => updateReminder(reminder.type, { enabled: !reminder.enabled })}
                className={`relative w-9 h-5 rounded-full transition-colors duration-zaya ${
                  reminder.enabled ? 'bg-zaya-black' : 'bg-zaya-gray-200'
                }`}
                aria-label={`Toggle ${meta.label}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-zaya ${
                    reminder.enabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {reminder.enabled && (
              <TimeSlider
                value={reminder.intervalMinutes}
                onChange={(val) => updateReminder(reminder.type, { intervalMinutes: val })}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
