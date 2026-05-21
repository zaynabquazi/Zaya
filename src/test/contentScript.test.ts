import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { isValidSelection, computeButtonPosition } from '@/content/content';

describe('Content Script', () => {
  describe('Property 2: Text Selection Minimum Length Validation', () => {
    it('returns true if and only if string has ≥3 non-whitespace characters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 200 }),
          (text) => {
            const nonWhitespace = text.replace(/\s/g, '');
            const expected = nonWhitespace.length >= 3;
            expect(isValidSelection(text)).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('rejects empty string', () => {
      expect(isValidSelection('')).toBe(false);
    });

    it('rejects whitespace-only string', () => {
      expect(isValidSelection('   \t\n  ')).toBe(false);
    });

    it('rejects 2 non-whitespace characters', () => {
      expect(isValidSelection('ab')).toBe(false);
    });

    it('accepts 3 non-whitespace characters', () => {
      expect(isValidSelection('abc')).toBe(true);
    });

    it('accepts 3 non-whitespace chars with surrounding whitespace', () => {
      expect(isValidSelection('  a b c  ')).toBe(true);
    });

    it('rejects 2 non-whitespace chars with lots of whitespace', () => {
      expect(isValidSelection('  a     b     ')).toBe(false);
    });
  });

  describe('Property 1: Floating Button Positioning Stays Within Viewport', () => {
    // Arbitrary for a DOMRect-like object
    const rectArb = fc.record({
      top: fc.float({ min: 0, max: 2000, noNaN: true }),
      left: fc.float({ min: 0, max: 2000, noNaN: true }),
      width: fc.float({ min: 10, max: 800, noNaN: true }),
      height: fc.float({ min: 10, max: 200, noNaN: true }),
    }).map(({ top, left, width, height }) => ({
      top,
      left,
      width,
      height,
      bottom: top + height,
      right: left + width,
      x: left,
      y: top,
      toJSON: () => ({}),
    } as DOMRect));

    const buttonSizeArb = fc.record({
      width: fc.integer({ min: 100, max: 200 }),
      height: fc.integer({ min: 30, max: 50 }),
    });

    const viewportArb = fc.record({
      width: fc.integer({ min: 320, max: 2560 }),
      height: fc.integer({ min: 480, max: 1440 }),
    });

    it('computed position is fully within viewport boundaries', () => {
      fc.assert(
        fc.property(
          rectArb,
          buttonSizeArb,
          viewportArb,
          (selectionRect, btnSize, viewport) => {
            const pos = computeButtonPosition(
              selectionRect,
              btnSize.width,
              btnSize.height,
              viewport.width,
              viewport.height
            );

            // Button must be fully within viewport
            expect(pos.top).toBeGreaterThanOrEqual(0);
            expect(pos.left).toBeGreaterThanOrEqual(0);
            expect(pos.top + btnSize.height).toBeLessThanOrEqual(viewport.height);
            expect(pos.left + btnSize.width).toBeLessThanOrEqual(viewport.width);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('computed position is within 8px of selection bounding box when space allows', () => {
      fc.assert(
        fc.property(
          fc.record({
            top: fc.float({ min: 100, max: 500, noNaN: true }),
            left: fc.float({ min: 100, max: 500, noNaN: true }),
            width: fc.float({ min: 50, max: 300, noNaN: true }),
            height: fc.float({ min: 15, max: 50, noNaN: true }),
          }).map(({ top, left, width, height }) => ({
            top,
            left,
            width,
            height,
            bottom: top + height,
            right: left + width,
            x: left,
            y: top,
            toJSON: () => ({}),
          } as DOMRect)),
          (selectionRect) => {
            const btnWidth = 150;
            const btnHeight = 36;
            const vpWidth = 1920;
            const vpHeight = 1080;

            const pos = computeButtonPosition(
              selectionRect,
              btnWidth,
              btnHeight,
              vpWidth,
              vpHeight
            );

            // When there's plenty of space, button should be within 8px of selection
            const distToBottom = Math.abs(pos.top - selectionRect.bottom);
            const distToTop = Math.abs(pos.top + btnHeight - selectionRect.top);
            const minVerticalDist = Math.min(distToBottom, distToTop);

            // Should be positioned 8px from selection edge
            expect(minVerticalDist).toBe(8);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('does not overlap the selected text area', () => {
      fc.assert(
        fc.property(
          rectArb,
          buttonSizeArb,
          viewportArb,
          (selectionRect, btnSize, viewport) => {
            const pos = computeButtonPosition(
              selectionRect,
              btnSize.width,
              btnSize.height,
              viewport.width,
              viewport.height
            );

            const btnTop = pos.top;
            const btnBottom = pos.top + btnSize.height;
            const selTop = selectionRect.top;
            const selBottom = selectionRect.bottom;

            // Button should not vertically overlap the selection
            const overlaps = btnTop < selBottom && btnBottom > selTop;
            // If it overlaps, it means the viewport is too small — acceptable edge case
            // But in normal cases (enough space), it should not overlap
            if (viewport.height > selectionRect.height + btnSize.height + 20) {
              expect(overlaps).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
