import { useState } from 'react';

interface CopyButtonProps {
  text: string;
}

export function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const [disabled, setDisabled] = useState(false);

  const handleCopy = async () => {
    if (disabled) return;
    setDisabled(true);
    setError(false);

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setDisabled(false);
      }, 2000);
    } catch {
      setError(true);
      setTimeout(() => {
        setError(false);
        setDisabled(false);
      }, 5000);
    }
  };

  if (error) {
    return (
      <span className="text-xs text-red-500">Copy failed</span>
    );
  }

  return (
    <button
      onClick={handleCopy}
      disabled={disabled}
      className="text-xs text-zaya-gray-400 hover:text-zaya-black transition-colors duration-zaya disabled:opacity-50"
      aria-label="Copy to clipboard"
    >
      {copied ? '✓ Copied' : '📋 Copy'}
    </button>
  );
}
