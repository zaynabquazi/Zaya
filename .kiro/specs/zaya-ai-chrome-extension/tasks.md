# Implementation Plan: Zaya AI Chrome Extension

## Overview

This plan implements the Zaya Chrome extension using React, TypeScript, and Tailwind CSS with a Manifest V3 architecture. The implementation follows an incremental approach: project scaffolding → core services → UI components → integration and wiring. Property-based tests use fast-check with Vitest.

## Tasks

- [ ] 1. Set up project structure and build configuration
  - [ ] 1.1 Initialize project with Vite, React, TypeScript, and Tailwind CSS
    - Create project directory structure: `src/`, `src/components/`, `src/services/`, `src/background/`, `src/popup/`, `src/content/`, `public/`
    - Configure Vite for Chrome extension multi-entry build (content script, background service worker, popup, sidebar)
    - Install dependencies: react, react-dom, tailwindcss, postcss, autoprefixer, uuid
    - Install dev dependencies: typescript, vitest, @testing-library/react, fast-check, @types/chrome
    - Configure `tsconfig.json` with strict mode and Chrome extension type definitions
    - Configure Tailwind CSS with the Zaya design system (black, white, gray, neutral accents, sans-serif typography)
    - _Requirements: 12.2, 12.3_

  - [ ] 1.2 Create manifest.json and extension entry points
    - Create `public/manifest.json` with Manifest V3 format: `manifest_version: 3`, name "Zaya", version "1.0.0"
    - Declare permissions: `storage`, `alarms`, `notifications`, `activeTab`, `scripting`
    - Configure `content_scripts` entry with `matches: ["<all_urls>"]`, `run_at: "document_idle"`
    - Configure `background.service_worker` pointing to compiled background script
    - Configure `action.default_popup` pointing to popup HTML
    - Create placeholder icon files (16px, 48px, 128px)
    - _Requirements: 12.1, 12.7_

  - [ ] 1.3 Set up Vitest and fast-check testing infrastructure
    - Configure `vitest.config.ts` with jsdom environment and path aliases
    - Create test setup file with Chrome API mocks (`chrome.storage.local`, `chrome.runtime`, `chrome.alarms`, `chrome.notifications`)
    - Verify fast-check integration with a trivial property test
    - _Requirements: 12.2_

- [ ] 2. Implement storage service and data models
  - [ ] 2.1 Create storage service abstraction over chrome.storage.local
    - Implement `StorageService` class with typed `get<K>`, `set<K>`, `remove`, and `onChanged` methods matching the `StorageServiceAPI` interface
    - Define `StorageSchema` interface covering `tasks`, `preferences`, `reminders`, and `apiKey`
    - Implement error handling: catch write failures and return error state
    - Implement `Task` interface with `id` (UUID v4), `text`, `completed`, `createdAt` fields
    - Implement `UserPreferences` and `ReminderConfig` interfaces
    - _Requirements: 9.5, 10.4, 10.5, 11.4_

  - [ ]* 2.2 Write property test for task persistence round-trip
    - **Property 8: Task Persistence Round-Trip**
    - Generate arrays of up to 100 valid tasks with arbitrary id, text (1–200 chars), completed boolean, and createdAt timestamps
    - Verify that saving to mocked chrome.storage.local and reading back produces deeply equal results
    - **Validates: Requirements 9.5**

  - [ ]* 2.3 Write property test for preferences persistence round-trip with defaults
    - **Property 10: Preferences Persistence Round-Trip with Defaults**
    - Generate arbitrary preference objects with valid reminder configs
    - Verify save/load round-trip equality
    - Verify loading from empty storage returns defaults (all reminders enabled, 60-minute intervals)
    - Verify partial preferences are merged with defaults for missing fields
    - **Validates: Requirements 10.4, 10.5**

- [ ] 3. Implement task organizer logic
  - [ ] 3.1 Implement task organizer service with validation and sorting
    - Implement `addTask(text)`: validate non-empty, non-whitespace-only, ≤200 chars; generate UUID; persist to storage
    - Implement `toggleTask(id)`: flip `completed` boolean, persist
    - Implement `deleteTask(id)`: remove from array, persist
    - Implement `getTasks()`: return sorted list (incomplete before completed, newest first within each group)
    - Enforce 100-task limit with appropriate error message
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [ ]* 3.2 Write property test for task input validation
    - **Property 7: Task Input Validation**
    - Generate arbitrary strings including empty, whitespace-only, 1–200 chars, and >200 chars
    - Verify acceptance if and only if string has ≥1 non-whitespace char and total length ≤200
    - **Validates: Requirements 9.1, 9.2**

  - [ ]* 3.3 Write property test for task display sort order
    - **Property 9: Task Display Sort Order**
    - Generate arrays of tasks with mixed `completed` states and `createdAt` timestamps
    - Verify sort output: all incomplete tasks before completed, newest first within each group
    - **Validates: Requirements 9.7**

- [ ] 4. Implement AI service
  - [ ] 4.1 Create AI service with OpenAI API integration
    - Implement `AIService` class with `rewrite(text, action)` and `summarize(text, action)` methods
    - Map each `RewriteAction` and `SummarizationAction` to its system prompt template
    - Implement 30-second timeout using `AbortController`
    - Implement error handling: parse API errors, network errors, rate limiting (429), invalid API key
    - Return `AIResponse` with `success`, `result`, and `error` fields
    - Enforce text length limits: truncate to 5000 chars for rewrite, 10000 chars for summarization
    - _Requirements: 3.2, 3.4, 3.5, 3.7, 3.8, 4.2, 4.5, 4.7, 11.3_

  - [ ] 4.2 Implement input validation for writing assistant and summarization
    - Writing assistant: reject empty strings and strings >5000 characters with user-facing message
    - Summarization: reject strings with <20 characters with user-facing message
    - Return validation errors without making API calls
    - _Requirements: 3.9, 4.6_

  - [ ]* 4.3 Write property test for writing assistant input length validation
    - **Property 3: Writing Assistant Input Length Validation**
    - Generate strings of varying lengths (0 to 10000+ chars)
    - Verify acceptance if and only if length is between 1 and 5000 inclusive
    - **Validates: Requirements 3.9**

  - [ ]* 4.4 Write property test for summarization input length validation
    - **Property 4: Summarization Input Length Validation**
    - Generate strings of varying lengths (0 to 20000+ chars)
    - Verify acceptance if and only if length ≥20 characters
    - **Validates: Requirements 4.6**

  - [ ]* 4.5 Write property test for AI request construction correctness and privacy
    - **Property 5: AI Request Construction Correctness and Privacy**
    - Generate arbitrary text + action pairs for both rewrite and summarization
    - Verify request contains exactly the provided text (truncated appropriately) and correct system prompt
    - Verify no extraneous data (no URLs, browsing history, user metadata) in the request payload
    - **Validates: Requirements 3.2, 4.2, 11.3**

- [ ] 5. Checkpoint - Core services complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement content script and floating button
  - [ ] 6.1 Implement text selection detection in content script
    - Listen for `mouseup` and `selectionchange` events on the document
    - Extract selected text and bounding rectangle from `window.getSelection()`
    - Validate selection: require ≥3 non-whitespace characters
    - Handle deselection: click elsewhere, Escape key, new selection
    - Debounce selection events to meet 200ms response requirement
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6_

  - [ ] 6.2 Implement floating button component and positioning logic
    - Create `FloatingButton` React component with "Improve with Zaya" label
    - Style: border-radius 8px, box-shadow ≤4px blur, white/light-gray background
    - Implement positioning algorithm: place within 8px of selection bounding box edge, no overlap with selected text
    - Implement viewport boundary detection: reposition to nearest fully visible location if default position would overflow
    - Handle click: send selected text to sidebar via message passing, dismiss button
    - _Requirements: 1.2, 2.1, 2.2, 2.3, 2.6_

  - [ ]* 6.3 Write property test for floating button positioning
    - **Property 1: Floating Button Positioning Stays Within Viewport**
    - Generate random DOMRect values (selection bounds) and viewport dimensions
    - Verify computed position is within 8px of selection edge, does not overlap selection, and is fully within viewport
    - **Validates: Requirements 1.2**

  - [ ]* 6.4 Write property test for text selection minimum length validation
    - **Property 2: Text Selection Minimum Length Validation**
    - Generate arbitrary strings (including whitespace-heavy, empty, unicode)
    - Verify validation returns true if and only if string has ≥3 non-whitespace characters
    - **Validates: Requirements 1.5**

- [ ] 7. Implement sidebar with Shadow DOM injection
  - [ ] 7.1 Create Shadow DOM container and sidebar shell
    - Inject a `<div>` into the page DOM, attach Shadow DOM (mode: open)
    - Mount React app inside Shadow DOM with isolated Tailwind styles
    - Implement sidebar as floating panel: fixed position, right side, 360–400px width, full viewport height minus 16px margins
    - Set z-index high enough to prevent occlusion by page elements
    - Implement vertical scrolling for overflow content
    - Implement open/close animations (150–300ms, ease-in-out)
    - Implement close button in top area
    - _Requirements: 6.1, 6.4, 6.5, 6.6, 6.7, 6.9_

  - [ ] 7.2 Implement sidebar sections and navigation
    - Create section layout in order: Zaya logo/name, Writing Assistant, Summarization Tool, AI output, Task Organizer, Wellness Reminder settings, Preferences
    - Implement section transitions with 150–300ms ease-in-out animations
    - Apply Zaya design system: black/white/gray palette (≤10% saturation), border-radius 8–12px, drop shadows ≤20% opacity, sans-serif typography
    - Implement settings section accessible via dedicated settings control
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 10.1_

- [ ] 8. Implement Writing Assistant and Summarization UI components
  - [ ] 8.1 Create Writing Assistant component
    - Render input text area pre-filled with text received from floating button
    - Display 8 rewrite action buttons: Proofread, Make Clearer, Make Academic, Make Professional, Make Shorter, Make Friendlier, Simplify, Fix Grammar
    - Show loading indicator while AI processes request
    - Display both original and improved text in output area
    - Show validation error for empty or >5000 char input
    - Show user-friendly error messages for API failures and timeouts
    - _Requirements: 3.1, 3.2, 3.3, 3.6, 3.7, 3.8, 3.9_

  - [ ] 8.2 Create Summarization Tool component
    - Display 7 summarization action buttons: Summarize this, Explain this simply, Turn this into bullet points, Create study notes, Extract key points, Shorten this article, Explain like I'm new to this
    - Show loading indicator while AI processes request
    - Display summarization result in output section
    - Show validation error for <20 char input
    - Show user-friendly error messages for API failures and timeouts
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 4.7_

  - [ ] 8.3 Implement copy result functionality
    - Add copy button adjacent to each AI-generated result
    - Use `navigator.clipboard.writeText` to copy result as plain text
    - Show checkmark icon for 2 seconds on successful copy, then revert to copy icon
    - Disable copy button during operation to prevent duplicates
    - Show error message for 5 seconds if clipboard write fails
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 9. Implement Task Organizer UI component
  - [ ] 9.1 Create Task Organizer component
    - Render input field for new task text entry
    - Implement add task: validate input, create task, clear input, keep focus on empty/whitespace input
    - Render task list: single-column, each task on its own row
    - Implement complete toggle with strikethrough style for completed tasks
    - Implement delete button per task
    - Display placeholder message when task list is empty
    - Ensure immediate UI updates on add/complete/delete without page reload
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.6, 9.7, 9.8_

- [ ] 10. Implement background script and wellness reminder system
  - [ ] 10.1 Create background service worker with Chrome Alarms API
    - Implement `onInstalled` and `onStartup` listeners to re-register active alarms from persisted settings
    - Implement `setReminder(config)`: create Chrome alarm with specified interval
    - Implement `cancelReminder(type)`: clear alarm for given type
    - Implement `onAlarm` listener: select notification message from predefined list for the fired alarm's type
    - Use `chrome.notifications.create` to deliver reminder notifications
    - Default interval: 60 minutes for newly enabled reminders
    - Handle notification permission: check before scheduling, show in-extension message if denied
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [ ]* 10.2 Write property test for wellness notification message selection
    - **Property 6: Wellness Notification Message Selection**
    - Generate random reminder types (water, stretch, break)
    - Verify selected notification message belongs to the correct predefined list for that type
    - Verify message never comes from a different type's list
    - **Validates: Requirements 8.3**

- [ ] 11. Implement popup interface
  - [ ] 11.1 Create popup component with Open Zaya button and reminder toggle
    - Render "Open Zaya" button that sends message to content script to open sidebar, then closes popup
    - Render reminder toggle switch reflecting current enabled/disabled state from storage
    - Display status text indicating whether reminders are active or inactive
    - On toggle change: send message to background script to enable/disable all reminders
    - Load persisted toggle state on popup open
    - Handle case where sidebar is already open (bring focus, don't duplicate)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ] 12. Implement settings, preferences, and privacy
  - [ ] 12.1 Create settings section with preferences and privacy statement
    - Display privacy statement: "Zaya only processes text when you choose to use AI tools. Tasks and reminder settings are stored locally in your browser."
    - Render reminder interval selectors (30, 60, 90 minutes) for each reminder type
    - Render toggle switches for each reminder type (water, stretch, break)
    - Render API key input field (stored locally)
    - Apply changes immediately on user interaction, persist to storage without save button
    - Show inline error if storage write fails, retain in-session settings
    - Load persisted preferences on extension open, fall back to defaults if none exist
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 11.1, 11.2, 11.4_

- [ ] 13. Checkpoint - All components implemented
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Integration and message passing wiring
  - [ ] 14.1 Wire content script ↔ sidebar ↔ background message passing
    - Implement `chrome.runtime.sendMessage` / `chrome.runtime.onMessage` handlers in content script
    - Wire floating button click → open sidebar + send text flow
    - Wire popup "Open Zaya" → content script → open sidebar flow
    - Wire popup reminder toggle → background script → enable/disable alarms flow
    - Wire sidebar reminder settings changes → background script → update alarms flow
    - Handle message passing failures with 4-second non-blocking toast notification
    - Ensure extension icon click opens sidebar via content script injection
    - _Requirements: 2.2, 2.4, 2.5, 6.8, 7.2, 12.5_

  - [ ] 14.2 Implement privacy and data handling safeguards
    - Ensure no writing history or processed text persists beyond active request
    - Ensure no analytics or usage tracking data is collected
    - Ensure only user-triggered text is transmitted to OpenAI API
    - Implement `chrome.runtime.onSuspend` or uninstall URL to clear storage on uninstall
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ]* 14.3 Write integration tests for message passing flows
    - Test text selection → floating button → sidebar → AI response → copy flow
    - Test popup → open sidebar flow
    - Test reminder toggle → background → alarm creation flow
    - Test service worker restart → alarm re-registration flow
    - _Requirements: 12.5, 12.6_

- [ ] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using fast-check
- Unit tests validate specific examples and edge cases using Vitest + React Testing Library
- All Chrome APIs should be mocked in tests using the test setup file created in task 1.3
- The Shadow DOM approach isolates sidebar styles from host pages — ensure Tailwind is bundled inside the shadow root

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "4.1", "4.2"] },
    { "id": 3, "tasks": ["2.2", "2.3", "3.1", "4.3", "4.4", "4.5"] },
    { "id": 4, "tasks": ["3.2", "3.3", "6.1", "6.2", "10.1"] },
    { "id": 5, "tasks": ["6.3", "6.4", "7.1", "10.2", "11.1"] },
    { "id": 6, "tasks": ["7.2", "8.1", "8.2", "8.3"] },
    { "id": 7, "tasks": ["9.1", "12.1"] },
    { "id": 8, "tasks": ["14.1", "14.2"] },
    { "id": 9, "tasks": ["14.3"] }
  ]
}
```
