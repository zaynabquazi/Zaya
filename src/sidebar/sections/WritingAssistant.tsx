import { useState } from 'react';
import { rewrite, validateRewriteInput, type RewriteAction } from '@/services/aiService';
import { loadPreferences } from '@/services/storageService';
import { CopyButton } from '../components/CopyButton';

interface WritingAssistantProps {
  inputText: string;
  onInputChange: (text: string) => void;
}

const ACTIONS: { id: RewriteAction; label: string }[] = [
  { id: 'proofread', label: 'Proofread' },
  { id: 'make-clearer', label: 'Make Clearer' },
  { id: 'make-academic', label: 'Make Academic' },
  { id: 'make-professional', label: 'Make Professional' },
  { id: 'make-shorter', label: 'Make Shorter' },
  { id: 'make-friendlier', label: 'Make Friendlier' },
  { id: 'simplify', label: 'Simplify' },
  { id: 'fix-grammar', label: 'Fix Grammar' },
];

export function WritingAssistant({ inputText, onInputChange }: WritingAssistantProps) {
  const [outputText, setOutputText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (action: RewriteAction) => {
    const validation = validateRewriteInput(inputText);
    if (!validation.valid) {
      setError(validation.error || 'Invalid input.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setOutputText(null);

    const prefs = await loadPreferences();
    if (!prefs.apiKey) {
      setError("Please add your API key in Settings.");
      setIsLoading(false);
      return;
    }

    const response = await rewrite(inputText, action, prefs.apiKey, prefs.apiEndpoint, prefs.model);
    setIsLoading(false);

    if (response.success && response.result) {
      setOutputText(response.result);
    } else {
      setError(response.error || 'Something went wrong.');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-zaya-gray-500 uppercase tracking-wide mb-2 block">
          Your Text
        </label>
        <textarea
          value={inputText}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Highlight text on any page, or paste text here..."
          className="w-full min-h-[100px] p-3 border border-zaya-gray-100 rounded-zaya text-sm text-zaya-black bg-white resize-y outline-none focus:border-zaya-gray-300 transition-colors duration-zaya"
        />
        <p className="text-xs text-zaya-gray-300 mt-1">{inputText.length}/5,000</p>
      </div>

      <div>
        <label className="text-xs font-medium text-zaya-gray-500 uppercase tracking-wide mb-2 block">
          Actions
        </label>
        <div className="grid grid-cols-2 gap-2">
          {ACTIONS.map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action.id)}
              disabled={isLoading}
              className="py-2 px-3 text-xs font-medium rounded-lg border border-zaya-gray-100 text-zaya-gray-600 hover:bg-zaya-gray-50 hover:border-zaya-gray-200 transition-all duration-zaya disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 py-3">
          <div className="w-4 h-4 border-2 border-zaya-gray-200 border-t-zaya-gray-500 rounded-full animate-spin" />
          <span className="text-xs text-zaya-gray-400">Improving your text...</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-zaya">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {outputText && (
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-zaya-gray-500 uppercase tracking-wide">
                Original
              </label>
            </div>
            <p className="text-xs text-zaya-gray-400 p-3 bg-zaya-gray-50 rounded-zaya leading-relaxed">
              {inputText}
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-zaya-gray-500 uppercase tracking-wide">
                Improved
              </label>
              <CopyButton text={outputText} />
            </div>
            <p className="text-sm text-zaya-black p-3 bg-white border border-zaya-gray-100 rounded-zaya leading-relaxed">
              {outputText}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
