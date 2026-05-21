import { useState, useEffect } from 'react';
import { WritingAssistant } from './sections/WritingAssistant';
import { SummarizationTool } from './sections/SummarizationTool';
import { TaskOrganizer } from './sections/TaskOrganizer';
import { WellnessReminders } from './sections/WellnessReminders';
import { Settings } from './sections/Settings';

export type SidebarSection = 'write' | 'summarize' | 'tasks' | 'wellness' | 'settings';

interface SidebarProps {
  initialText?: string;
  onClose?: () => void;
}

const NAV_ITEMS: { id: SidebarSection; label: string; icon: string }[] = [
  { id: 'write', label: 'Write', icon: '✍️' },
  { id: 'summarize', label: 'Summarize', icon: '📝' },
  { id: 'tasks', label: 'Tasks', icon: '☑️' },
  { id: 'wellness', label: 'Wellness', icon: '🌿' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export function Sidebar({ initialText = '', onClose }: SidebarProps) {
  const [activeSection, setActiveSection] = useState<SidebarSection>('write');
  const [inputText, setInputText] = useState(initialText);

  // Read initial text from URL hash (passed by content script)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#text=')) {
      const text = decodeURIComponent(hash.slice(6));
      if (text) setInputText(text);
    }
  }, []);

  // Listen for text messages from the content script
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'ZAYA_SET_TEXT') {
        setInputText(event.data.text);
        setActiveSection('write');
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      // Post message to parent (content script) to close the iframe
      window.parent.postMessage({ type: 'ZAYA_CLOSE_SIDEBAR' }, '*');
    }
  };

  return (
    <div className="w-full h-screen bg-zaya-white text-zaya-black font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h1 className="text-lg font-semibold tracking-tight">Zaya</h1>
        <button
          onClick={handleClose}
          className="text-zaya-gray-400 hover:text-zaya-black hover:bg-zaya-gray-100 transition-all duration-zaya text-base p-1.5 rounded-lg"
          aria-label="Close sidebar"
        >
          ✕
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex px-4 pb-3 gap-1 border-b border-zaya-gray-100">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg text-xs font-medium transition-all duration-zaya ${
              activeSection === item.id
                ? 'bg-zaya-gray-100 text-zaya-black'
                : 'text-zaya-gray-400 hover:text-zaya-gray-600 hover:bg-zaya-gray-50'
            }`}
            aria-label={item.label}
          >
            <span className="text-sm">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 transition-opacity duration-zaya ease-zaya">
        {activeSection === 'write' && (
          <WritingAssistant inputText={inputText} onInputChange={setInputText} />
        )}
        {activeSection === 'summarize' && (
          <SummarizationTool inputText={inputText} onInputChange={setInputText} />
        )}
        {activeSection === 'tasks' && <TaskOrganizer />}
        {activeSection === 'wellness' && <WellnessReminders />}
        {activeSection === 'settings' && <Settings />}
      </div>
    </div>
  );
}
