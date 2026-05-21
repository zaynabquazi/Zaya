/**
 * Zaya Content Script
 * - Detects text selection and shows "Improve with Zaya" floating button
 * - Opens sidebar iframe on button click
 */

let sidebarOpen = false;
let floatingButton: HTMLElement | null = null;
let currentSelectedText = '';

// ─── Floating Button ────────────────────────────────────────────────────────

function createFloatingButton(): HTMLElement {
  const btn = document.createElement('div');
  btn.id = 'zaya-floating-btn';
  btn.textContent = 'Improve with Zaya';
  btn.style.cssText = `
    position: fixed;
    z-index: 2147483646;
    padding: 8px 14px;
    background: #ffffff;
    color: #0a0a0a;
    font-family: -apple-system, system-ui, sans-serif;
    font-size: 13px;
    font-weight: 500;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    cursor: pointer;
    user-select: none;
    opacity: 0;
    transform: translateY(4px);
    transition: opacity 150ms ease, transform 150ms ease;
    border: 1px solid #e5e5e5;
  `;

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onFloatingButtonClick();
  });

  return btn;
}

function showFloatingButton(rect: DOMRect) {
  if (!floatingButton) {
    floatingButton = createFloatingButton();
    document.body.appendChild(floatingButton);
  }

  // Position below selection, centered
  let top = rect.bottom + 8;
  let left = rect.left + rect.width / 2 - 75;

  // Keep within viewport
  if (top + 40 > window.innerHeight) {
    top = rect.top - 44;
  }
  if (left < 8) left = 8;
  if (left + 150 > window.innerWidth) left = window.innerWidth - 158;
  if (top < 8) top = 8;

  floatingButton.style.top = `${top}px`;
  floatingButton.style.left = `${left}px`;

  requestAnimationFrame(() => {
    if (floatingButton) {
      floatingButton.style.opacity = '1';
      floatingButton.style.transform = 'translateY(0)';
    }
  });
}

function hideFloatingButton() {
  if (floatingButton) {
    floatingButton.style.opacity = '0';
    floatingButton.style.transform = 'translateY(4px)';
    setTimeout(() => {
      floatingButton?.remove();
      floatingButton = null;
    }, 150);
  }
}

function onFloatingButtonClick() {
  const text = currentSelectedText;
  hideFloatingButton();
  openSidebar(text);
}

// ─── Selection Detection ────────────────────────────────────────────────────

function handleSelection() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    hideFloatingButton();
    currentSelectedText = '';
    return;
  }

  const text = selection.toString().trim();
  // Need at least 3 non-whitespace characters
  if (text.replace(/\s/g, '').length < 3) {
    hideFloatingButton();
    currentSelectedText = '';
    return;
  }

  currentSelectedText = text;
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  showFloatingButton(rect);
}

// Listen for text selection
document.addEventListener('mouseup', () => {
  setTimeout(handleSelection, 50);
});

document.addEventListener('keyup', (e) => {
  if (e.shiftKey) {
    setTimeout(handleSelection, 50);
  }
  if (e.key === 'Escape') {
    hideFloatingButton();
    currentSelectedText = '';
  }
});

// Hide when clicking away (but not on the button itself)
document.addEventListener('mousedown', (e) => {
  if (floatingButton && !floatingButton.contains(e.target as Node)) {
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        hideFloatingButton();
        currentSelectedText = '';
      }
    }, 50);
  }
});

// ─── Sidebar ────────────────────────────────────────────────────────────────

function openSidebar(initialText?: string) {
  if (sidebarOpen) return;
  if (!chrome.runtime?.id) return;

  const container = document.createElement('div');
  container.id = 'zaya-sidebar-container';
  container.style.cssText = `
    position: fixed;
    top: 16px;
    right: 16px;
    bottom: 16px;
    width: 380px;
    z-index: 2147483647;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    overflow: hidden;
    border: 1px solid rgba(0,0,0,0.06);
    transition: transform 200ms ease, opacity 200ms ease;
    transform: translateX(400px);
    opacity: 0;
  `;

  const sidebarUrl = chrome.runtime.getURL('src/sidebar/index.html');
  const iframe = document.createElement('iframe');
  iframe.src = initialText
    ? `${sidebarUrl}#text=${encodeURIComponent(initialText)}`
    : sidebarUrl;
  iframe.style.cssText = 'width:100%;height:100%;border:none;border-radius:12px;';
  iframe.id = 'zaya-sidebar-iframe';

  container.appendChild(iframe);
  document.body.appendChild(container);
  sidebarOpen = true;

  requestAnimationFrame(() => {
    container.style.transform = 'translateX(0)';
    container.style.opacity = '1';
  });

  // Listen for close from sidebar
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'ZAYA_CLOSE_SIDEBAR') {
      closeSidebar();
    }
  });
}

function closeSidebar() {
  const container = document.getElementById('zaya-sidebar-container');
  if (container) {
    container.style.transform = 'translateX(400px)';
    container.style.opacity = '0';
    setTimeout(() => {
      container.remove();
      sidebarOpen = false;
    }, 200);
  }
}

// ─── Messages from popup ────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'OPEN_SIDEBAR') {
    openSidebar(message.text);
    sendResponse({ success: true });
  }
  return true;
});

// Export for tests
export function isValidSelection(text: string): boolean {
  return text.replace(/\s/g, '').length >= 3;
}

export function computeButtonPosition(
  selectionRect: DOMRect,
  buttonWidth: number,
  buttonHeight: number,
  viewportWidth: number,
  viewportHeight: number
): { top: number; left: number } {
  const GAP = 8;
  let top = selectionRect.bottom + GAP;
  let left = selectionRect.left + (selectionRect.width - buttonWidth) / 2;

  if (top + buttonHeight > viewportHeight) {
    top = selectionRect.top - buttonHeight - GAP;
  }
  if (top < 0) top = GAP;
  if (top + buttonHeight > viewportHeight) top = viewportHeight - buttonHeight;
  if (left < 0) left = GAP;
  if (left + buttonWidth > viewportWidth) left = viewportWidth - buttonWidth - GAP;

  return { top, left };
}
