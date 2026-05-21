import { useState, useEffect, useRef } from 'react';
import { loadPreferences, savePreferences } from '@/services/storageService';

export function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [model, setModel] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const prefs = await loadPreferences();
    setApiKey(prefs.apiKey || '');
    setApiEndpoint(prefs.apiEndpoint || '');
    setModel(prefs.model || '');
  };

  const debouncedSave = (updates: Record<string, string>) => {
    setError(null);
    setSaved(false);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      try {
        const prefs = await loadPreferences();
        Object.assign(prefs, updates);
        await savePreferences(prefs);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch {
        setError('Could not save. Please try again.');
      }
    }, 600);
  };

  return (
    <div className="space-y-5">
      {/* API Endpoint */}
      <div>
        <label className="text-xs font-medium text-zaya-gray-500 uppercase tracking-wide mb-1.5 block">
          API Endpoint
        </label>
        <input
          type="text"
          value={apiEndpoint}
          onChange={(e) => {
            setApiEndpoint(e.target.value);
            debouncedSave({ apiEndpoint: e.target.value });
          }}
          placeholder="https://api.openai.com/v1"
          className="w-full py-2 px-3 text-sm border border-zaya-gray-100 rounded-lg outline-none focus:border-zaya-gray-300 transition-colors duration-150 font-mono text-xs"
        />
        <p className="text-[10px] text-zaya-gray-300 mt-1">
          Any OpenAI-compatible endpoint (OpenAI, Groq, Together, etc.)
        </p>
      </div>

      {/* API Key */}
      <div>
        <label className="text-xs font-medium text-zaya-gray-500 uppercase tracking-wide mb-1.5 block">
          API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            debouncedSave({ apiKey: e.target.value });
          }}
          placeholder="sk-... or your key"
          className="w-full py-2 px-3 text-sm border border-zaya-gray-100 rounded-lg outline-none focus:border-zaya-gray-300 transition-colors duration-150"
        />
      </div>

      {/* Model */}
      <div>
        <label className="text-xs font-medium text-zaya-gray-500 uppercase tracking-wide mb-1.5 block">
          Model
        </label>
        <input
          type="text"
          value={model}
          onChange={(e) => {
            setModel(e.target.value);
            debouncedSave({ model: e.target.value });
          }}
          placeholder="gpt-4o-mini"
          className="w-full py-2 px-3 text-sm border border-zaya-gray-100 rounded-lg outline-none focus:border-zaya-gray-300 transition-colors duration-150"
        />
      </div>

      {/* Status */}
      {saved && <p className="text-xs text-green-600">Saved ✓</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Privacy */}
      <div className="pt-3 border-t border-zaya-gray-100">
        <div className="p-3 bg-zaya-gray-50 rounded-zaya">
          <p className="text-xs text-zaya-gray-500 leading-relaxed">
            Zaya only processes text when you choose to use AI tools. Your key is stored locally in your browser and only sent to the endpoint you configure.
          </p>
        </div>
      </div>

      <p className="text-xs text-zaya-gray-300">Zaya v1.0.0</p>
    </div>
  );
}
