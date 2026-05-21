/**
 * AI Service — calls any OpenAI-compatible API endpoint
 * Works with: OpenAI, Groq, Together, Ollama, LMStudio, or any /chat/completions endpoint
 */

export type RewriteAction =
  | 'proofread'
  | 'make-clearer'
  | 'make-academic'
  | 'make-professional'
  | 'make-shorter'
  | 'make-friendlier'
  | 'simplify'
  | 'fix-grammar';

export type SummarizationAction =
  | 'summarize'
  | 'explain-simply'
  | 'bullet-points'
  | 'study-notes'
  | 'extract-key-points'
  | 'shorten-article'
  | 'explain-new';

export interface AIResponse {
  success: boolean;
  result?: string;
  error?: string;
}

export interface AIValidationResult {
  valid: boolean;
  error?: string;
}

const REWRITE_MAX_CHARS = 5000;
const SUMMARIZATION_MIN_CHARS = 20;
const SUMMARIZATION_MAX_CHARS = 10000;
const TIMEOUT_MS = 30000;

const REWRITE_PROMPTS: Record<RewriteAction, string> = {
  'proofread': 'Proofread the following text. Fix errors. Preserve meaning. Return only the improved text.',
  'make-clearer': 'Rewrite to be clearer and easier to understand. Preserve meaning. Return only the improved text.',
  'make-academic': 'Rewrite in academic tone. Preserve meaning. Return only the improved text.',
  'make-professional': 'Rewrite in professional tone. Preserve meaning. Return only the improved text.',
  'make-shorter': 'Make this text shorter while preserving key meaning. Return only the improved text.',
  'make-friendlier': 'Rewrite in a warm, friendly tone. Preserve meaning. Return only the improved text.',
  'simplify': 'Simplify this text for easy reading. Preserve meaning. Return only the improved text.',
  'fix-grammar': 'Fix all grammar issues. Preserve meaning and tone. Return only the improved text.',
};

const SUMMARIZATION_PROMPTS: Record<SummarizationAction, string> = {
  'summarize': 'Summarize the following text concisely.',
  'explain-simply': 'Explain this text in simple terms anyone can understand.',
  'bullet-points': 'Convert this text into clear bullet points.',
  'study-notes': 'Create study notes from this text with key concepts highlighted.',
  'extract-key-points': 'Extract the key points from this text as a list.',
  'shorten-article': 'Shorten this article while preserving the main ideas.',
  'explain-new': 'Explain this as if the reader is completely new to the topic.',
};

export function validateRewriteInput(text: string): AIValidationResult {
  if (!text || text.length === 0) {
    return { valid: false, error: 'Please enter some text to improve (1–5,000 characters).' };
  }
  if (text.length > REWRITE_MAX_CHARS) {
    return { valid: false, error: `Text is too long. Please use ${REWRITE_MAX_CHARS.toLocaleString()} characters or fewer.` };
  }
  return { valid: true };
}

export function validateSummarizationInput(text: string): AIValidationResult {
  if (!text || text.length < SUMMARIZATION_MIN_CHARS) {
    return { valid: false, error: 'Please select more text (at least 20 characters) to summarize.' };
  }
  return { valid: true };
}

export function getSystemPrompt(action: RewriteAction | SummarizationAction, type: 'rewrite' | 'summarize'): string {
  if (type === 'rewrite') {
    return REWRITE_PROMPTS[action as RewriteAction];
  }
  return SUMMARIZATION_PROMPTS[action as SummarizationAction];
}

export function buildRequestPayload(
  text: string,
  action: RewriteAction | SummarizationAction,
  type: 'rewrite' | 'summarize',
  model: string = 'gpt-4o-mini'
) {
  const maxChars = type === 'rewrite' ? REWRITE_MAX_CHARS : SUMMARIZATION_MAX_CHARS;
  const truncatedText = text.slice(0, maxChars);
  const systemPrompt = getSystemPrompt(action, type);

  return {
    model,
    messages: [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: truncatedText },
    ],
    max_tokens: 2048,
    temperature: 0.3,
  };
}

/**
 * Call any OpenAI-compatible chat completions endpoint.
 */
async function callAPI(
  text: string,
  action: RewriteAction | SummarizationAction,
  type: 'rewrite' | 'summarize',
  apiKey: string,
  endpoint: string,
  model: string
): Promise<AIResponse> {
  if (!endpoint) {
    return { success: false, error: 'Please set your API endpoint in Settings.' };
  }
  if (!apiKey) {
    return { success: false, error: 'Please set your API key in Settings.' };
  }

  const payload = buildRequestPayload(text, action, type, model);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  // Build URL — append /chat/completions if not already there
  let url = endpoint.replace(/\/+$/, '');
  if (!url.endsWith('/chat/completions')) {
    url += '/chat/completions';
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: "Your API key doesn't seem to be working. Check your settings." };
      }
      if (response.status === 429) {
        return { success: false, error: 'Too many requests. Please wait a moment and try again.' };
      }
      return { success: false, error: `API error (${response.status}). Please try again.` };
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content?.trim();

    if (!result) {
      return { success: false, error: 'No response received. Please try again.' };
    }

    return { success: true, result };
  } catch (err) {
    clearTimeout(timeoutId);

    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        return { success: false, error: 'The request took too long. Please try again.' };
      }
    }

    return { success: false, error: 'Could not connect. Check your endpoint and try again.' };
  }
}

export async function rewrite(text: string, action: RewriteAction, apiKey: string, endpoint: string, model: string): Promise<AIResponse> {
  const validation = validateRewriteInput(text);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  return callAPI(text, action, 'rewrite', apiKey, endpoint, model);
}

export async function summarize(text: string, action: SummarizationAction, apiKey: string, endpoint: string, model: string): Promise<AIResponse> {
  const validation = validateSummarizationInput(text);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  return callAPI(text, action, 'summarize', apiKey, endpoint, model);
}
