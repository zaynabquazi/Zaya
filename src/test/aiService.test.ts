import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  validateRewriteInput,
  validateSummarizationInput,
  buildRequestPayload,
  getSystemPrompt,
  type RewriteAction,
  type SummarizationAction,
} from '@/services/aiService';

const rewriteActions: RewriteAction[] = [
  'proofread', 'make-clearer', 'make-academic', 'make-professional',
  'make-shorter', 'make-friendlier', 'simplify', 'fix-grammar',
];

const summarizationActions: SummarizationAction[] = [
  'summarize', 'explain-simply', 'bullet-points', 'study-notes',
  'extract-key-points', 'shorten-article', 'explain-new',
];

describe('AI Service', () => {
  describe('Property 3: Writing Assistant Input Length Validation', () => {
    it('accepts strings with length between 1 and 5000 inclusive', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 7000 }),
          (text) => {
            const result = validateRewriteInput(text);
            if (text.length >= 1 && text.length <= 5000) {
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
      expect(validateRewriteInput('').valid).toBe(false);
    });

    it('accepts single character', () => {
      expect(validateRewriteInput('a').valid).toBe(true);
    });

    it('accepts exactly 5000 characters', () => {
      expect(validateRewriteInput('x'.repeat(5000)).valid).toBe(true);
    });

    it('rejects 5001 characters', () => {
      expect(validateRewriteInput('x'.repeat(5001)).valid).toBe(false);
    });
  });

  describe('Property 4: Summarization Input Length Validation', () => {
    it('accepts strings with length ≥20', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 15000 }),
          (text) => {
            const result = validateSummarizationInput(text);
            if (text.length >= 20) {
              expect(result.valid).toBe(true);
            } else {
              expect(result.valid).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('rejects 19 characters', () => {
      expect(validateSummarizationInput('a'.repeat(19)).valid).toBe(false);
    });

    it('accepts exactly 20 characters', () => {
      expect(validateSummarizationInput('a'.repeat(20)).valid).toBe(true);
    });

    it('rejects empty string', () => {
      expect(validateSummarizationInput('').valid).toBe(false);
    });
  });

  describe('Property 5: AI Request Construction Correctness and Privacy', () => {
    const rewriteActionArb = fc.constantFrom(...rewriteActions);
    const summarizationActionArb = fc.constantFrom(...summarizationActions);

    it('rewrite request contains only text and correct system prompt, no extraneous data', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 6000 }),
          rewriteActionArb,
          (text, action) => {
            const payload = buildRequestPayload(text, action, 'rewrite');

            // Should have exactly model, messages, max_tokens, temperature
            const keys = Object.keys(payload).sort();
            expect(keys).toEqual(['max_tokens', 'messages', 'model', 'temperature']);

            // Messages should be exactly 2: system + user
            expect(payload.messages.length).toBe(2);
            expect(payload.messages[0].role).toBe('system');
            expect(payload.messages[1].role).toBe('user');

            // System prompt matches the action
            const expectedPrompt = getSystemPrompt(action, 'rewrite');
            expect(payload.messages[0].content).toBe(expectedPrompt);

            // User content is the text, truncated to 5000 chars
            const expectedText = text.slice(0, 5000);
            expect(payload.messages[1].content).toBe(expectedText);

            // No URLs, browsing history, or user metadata
            const payloadStr = JSON.stringify(payload);
            expect(payloadStr).not.toContain('http://');
            expect(payloadStr).not.toContain('https://');
            expect(payloadStr).not.toContain('browsing');
            expect(payloadStr).not.toContain('history');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('summarization request contains only text and correct system prompt, no extraneous data', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 20, maxLength: 12000 }),
          summarizationActionArb,
          (text, action) => {
            const payload = buildRequestPayload(text, action, 'summarize');

            const keys = Object.keys(payload).sort();
            expect(keys).toEqual(['max_tokens', 'messages', 'model', 'temperature']);

            expect(payload.messages.length).toBe(2);
            expect(payload.messages[0].role).toBe('system');
            expect(payload.messages[1].role).toBe('user');

            const expectedPrompt = getSystemPrompt(action, 'summarize');
            expect(payload.messages[0].content).toBe(expectedPrompt);

            // Truncated to 10000 chars for summarization
            const expectedText = text.slice(0, 10000);
            expect(payload.messages[1].content).toBe(expectedText);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('every rewrite action has a defined system prompt mentioning meaning preservation', () => {
      for (const action of rewriteActions) {
        const prompt = getSystemPrompt(action, 'rewrite');
        expect(prompt).toBeDefined();
        expect(prompt.length).toBeGreaterThan(0);
        const lower = prompt.toLowerCase();
        expect(lower.includes('preserve meaning') || lower.includes('preserving')).toBe(true);
      }
    });

    it('every summarization action has a defined system prompt', () => {
      for (const action of summarizationActions) {
        const prompt = getSystemPrompt(action, 'summarize');
        expect(prompt).toBeDefined();
        expect(prompt.length).toBeGreaterThan(0);
      }
    });
  });
});
