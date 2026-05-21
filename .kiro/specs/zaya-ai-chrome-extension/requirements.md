# Requirements Document

## Introduction

Zaya is a modern AI-powered Chrome extension designed to help students and busy users write better, stay organized, summarize information faster, and reduce digital overwhelm while working online. The extension integrates naturally into a user's browsing workflow through a floating sidebar interface, content script interactions, and Chrome notifications. Zaya prioritizes simplicity, privacy, and emotional comfort over feature density.

## Glossary

- **Zaya_Extension**: The Chrome extension application built with Manifest V3, React, TypeScript, and Tailwind CSS
- **Content_Script**: The script injected into web pages that detects text selection and displays floating UI elements
- **Sidebar**: The main floating panel on the right side of the browser containing all Zaya tools and features
- **Popup**: The small Chrome extension popup accessed via the toolbar icon
- **Background_Script**: The service worker handling reminder timers, notifications, and extension lifecycle events
- **Writing_Assistant**: The AI-powered tool that improves highlighted text using OpenAI API
- **Summarization_Tool**: The AI-powered tool that condenses or reformats highlighted text
- **Floating_Button**: The small contextual button that appears near selected text on a webpage
- **Task_Organizer**: The minimal task list stored in Chrome local storage
- **Wellness_Reminder**: The notification system for hydration, stretch, and break reminders
- **Local_Storage**: Chrome's local storage API used to persist user data on-device
- **AI_Service**: The module that communicates with OpenAI API to process text improvement and summarization requests
- **Selected_Text**: Text highlighted by the user within the browser viewport

## Requirements

### Requirement 1: Text Selection Detection

**User Story:** As a user, I want Zaya to detect when I highlight text on a webpage, so that I can quickly access AI writing and summarization tools.

#### Acceptance Criteria

1. WHEN the user selects text on a webpage, THE Content_Script SHALL display the Floating_Button within 200ms of the selection event completing
2. THE Floating_Button SHALL appear positioned within 8px of the selection bounding box edge without overlapping the Selected_Text, and if the default position would render outside the visible viewport, THE Floating_Button SHALL reposition to the nearest fully visible location within the viewport
3. WHEN the user deselects text by clicking elsewhere, pressing Escape, or making a new selection, THE Content_Script SHALL hide the current Floating_Button within 100ms
4. THE Content_Script SHALL detect text selection on standard HTML pages, PDF viewers, Google Docs, and Canvas LMS pages
5. IF the Selected_Text contains fewer than 3 non-whitespace characters, THEN THE Content_Script SHALL not display the Floating_Button
6. WHEN the user makes a new text selection while the Floating_Button is already visible, THE Content_Script SHALL reposition the Floating_Button adjacent to the new selection within 200ms

### Requirement 2: Floating Button Interaction

**User Story:** As a user, I want to click the floating button to send my selected text to Zaya's tools, so that I can improve or summarize text without manual copy-pasting.

#### Acceptance Criteria

1. THE Floating_Button SHALL display the label "Improve with Zaya"
2. WHEN the user clicks the Floating_Button, THE Content_Script SHALL transmit the Selected_Text to the Sidebar using Chrome message passing, open the Sidebar, and place the Selected_Text into the Writing_Assistant input field
3. WHEN the user clicks the Floating_Button, THE Content_Script SHALL dismiss the Floating_Button from the page
4. IF the Sidebar is already open WHEN the user clicks the Floating_Button, THEN THE Content_Script SHALL replace the current content of the Writing_Assistant input field with the newly Selected_Text without reopening the Sidebar
5. IF the Chrome message passing fails to deliver the Selected_Text to the Sidebar, THEN THE Content_Script SHALL display a non-blocking notification indicating the text could not be sent, for no longer than 4 seconds
6. THE Floating_Button SHALL render with a border-radius of 8px, a box shadow with no more than 4px blur, and a white or light-gray background consistent with the Zaya design system

### Requirement 3: AI Writing Assistant

**User Story:** As a user, I want to improve my writing using AI-powered rewriting actions, so that I can produce clearer, more professional, and grammatically correct text.

#### Acceptance Criteria

1. THE Writing_Assistant SHALL provide the following rewrite actions: Proofread, Make Clearer, Make Academic, Make Professional, Make Shorter, Make Friendlier, Simplify, Fix Grammar
2. WHEN the user selects a rewrite action, THE AI_Service SHALL send the Selected_Text and the chosen action to the OpenAI API for processing
3. WHEN the AI_Service receives a response, THE Writing_Assistant SHALL display both the original text and the improved text in the Sidebar
4. THE AI_Service SHALL preserve the original meaning of the Selected_Text in all rewrite responses
5. THE AI_Service SHALL not introduce information that was not present or implied in the original Selected_Text
6. WHEN the AI_Service is processing a request, THE Writing_Assistant SHALL display a loading indicator in the Sidebar
7. IF the AI_Service receives an error response from OpenAI API, THEN THE Writing_Assistant SHALL display an error message in the Sidebar using non-technical language that indicates the nature of the failure and suggests the user try again
8. IF the AI_Service does not receive a response from the OpenAI API within 30 seconds, THEN THE Writing_Assistant SHALL cancel the request, remove the loading indicator, and display an error message indicating the request timed out
9. IF the user selects a rewrite action and the Selected_Text is empty or exceeds 5000 characters, THEN THE Writing_Assistant SHALL display a message indicating the text must be between 1 and 5000 characters and SHALL NOT send a request to the OpenAI API

### Requirement 4: AI Summarization Tools

**User Story:** As a student, I want to summarize and simplify highlighted text using AI, so that I can process information faster and reduce overwhelm.

#### Acceptance Criteria

1. THE Summarization_Tool SHALL provide the following actions: Summarize this, Explain this simply, Turn this into bullet points, Create study notes, Extract key points, Shorten this article, Explain like I'm new to this
2. WHEN the user selects a summarization action, THE AI_Service SHALL send the Selected_Text (up to 10,000 characters) and the chosen action to the OpenAI API for processing
3. WHILE the AI_Service is awaiting a response from the OpenAI API, THE Summarization_Tool SHALL display a loading indicator in the Sidebar output section
4. WHEN the AI_Service receives a summarization response, THE Summarization_Tool SHALL display the result in the Sidebar output section
5. THE AI_Service SHALL not introduce information that was not present in the original Selected_Text during summarization
6. IF the Selected_Text is empty or contains fewer than 20 characters, THEN THE Summarization_Tool SHALL display a message in the Sidebar indicating that more text must be selected before a summarization action can be performed
7. IF the AI_Service receives an error response or no response within 30 seconds during summarization, THEN THE Summarization_Tool SHALL display an error message in the Sidebar describing the failure in non-technical language and suggesting the user retry the action

### Requirement 5: Copy Result Functionality

**User Story:** As a user, I want to copy AI-generated results to my clipboard, so that I can paste improved or summarized text into other applications.

#### Acceptance Criteria

1. THE Sidebar SHALL display a copy button adjacent to each AI-generated result
2. WHEN the user clicks the copy button, THE Sidebar SHALL copy the full AI-generated result as plain text to the system clipboard
3. WHEN the text is copied successfully, THE Sidebar SHALL replace the copy button icon with a checkmark icon for 2 seconds before reverting to the default copy icon
4. IF the clipboard write operation fails, THEN THE Sidebar SHALL display an error message indicating the copy failed, visible for 5 seconds or until the user dismisses it
5. WHILE a copy operation is in progress, THE Sidebar SHALL disable the copy button for that result to prevent duplicate requests

### Requirement 6: Floating Sidebar UI

**User Story:** As a user, I want a clean and modern sidebar interface, so that I can access all Zaya tools without feeling overwhelmed.

#### Acceptance Criteria

1. THE Sidebar SHALL render as a floating panel on the right side of the browser viewport with a fixed width between 360px and 400px and a height that spans the full viewport height minus 16px top and bottom margin
2. THE Sidebar SHALL contain the following sections in top-to-bottom order: Zaya logo and name, Writing_Assistant section, Summarization_Tool section, AI output section, Task_Organizer section, Wellness_Reminder settings, and preferences area
3. THE Sidebar SHALL use a color palette limited to black, white, gray, and neutral accent colors with saturation no greater than 10%
4. THE Sidebar SHALL use border-radius between 8px and 12px on container edges, drop shadows with no more than 20% opacity, and sans-serif typography
5. WHEN the Sidebar opens, closes, or switches between sections, THE Sidebar SHALL apply transition animations with a duration between 150ms and 300ms using ease-in-out timing
6. WHEN the user clicks outside the Sidebar, THE Sidebar SHALL remain open until explicitly closed by the user via the close button
7. THE Sidebar SHALL provide a visible close button in the top area of the panel that hides the panel from view when activated
8. WHEN the user clicks the Zaya browser extension icon, THE Sidebar SHALL open and become visible if it is not already displayed
9. THE Sidebar SHALL render above all host page content at a z-index sufficient to prevent occlusion by page elements, and SHALL be scrollable vertically if section content exceeds the visible panel height

### Requirement 7: Popup Interface

**User Story:** As a user, I want a minimal popup when I click the extension icon, so that I can quickly open Zaya or toggle reminders.

#### Acceptance Criteria

1. WHEN the user clicks the Zaya_Extension toolbar icon, THE Popup SHALL display within 500ms containing an "Open Zaya" button, a reminder toggle reflecting the current enabled/disabled state of the Wellness_Reminder system, and a status text indicating whether the Wellness_Reminder is currently active or inactive
2. WHEN the user clicks the "Open Zaya" button in the Popup, THE Zaya_Extension SHALL open the Sidebar on the current page and close the Popup
3. IF the Sidebar is already open when the user clicks the "Open Zaya" button, THEN THE Zaya_Extension SHALL bring focus to the existing Sidebar without opening a duplicate
4. WHEN the user toggles the reminder switch to the on position in the Popup, THE Background_Script SHALL enable the Wellness_Reminder system and THE Popup SHALL update the status text to indicate reminders are active
5. WHEN the user toggles the reminder switch to the off position in the Popup, THE Background_Script SHALL disable the Wellness_Reminder system and THE Popup SHALL update the status text to indicate reminders are inactive
6. WHEN the Popup is opened, THE Popup SHALL retrieve and display the persisted Wellness_Reminder toggle state so that the toggle position matches the current system state

### Requirement 8: Wellness Reminder System

**User Story:** As a user, I want gentle reminders to drink water, stretch, and take breaks, so that I can maintain healthier habits while working online.

#### Acceptance Criteria

1. THE Wellness_Reminder SHALL support three reminder types: water reminders, stretch reminders, and break reminders
2. THE Wellness_Reminder SHALL support configurable intervals of 30 minutes, 60 minutes, and 90 minutes for each reminder type
3. WHEN a reminder interval elapses, THE Background_Script SHALL deliver a Chrome notification displaying one message selected from a predefined list for that reminder type (examples: "Water check 💧", "Take a quick stretch.", "Rest your eyes for a minute.", "You've been focused for a while.")
4. WHEN the user enables a reminder type for the first time after installation, THE Wellness_Reminder SHALL default to a 60-minute interval for that reminder type
5. WHEN the user disables a reminder type, THE Background_Script SHALL cancel the corresponding timer and stop delivering notifications for that type
6. WHEN the Background_Script service worker restarts after being terminated, THE Background_Script SHALL read persisted reminder settings from Local_Storage and re-establish active timers for all enabled reminder types
7. IF the browser notification permission is not granted, THEN THE Wellness_Reminder SHALL display an in-extension message indicating that notification permission is required and SHALL not schedule reminder timers until permission is granted
8. THE Wellness_Reminder settings SHALL persist in Local_Storage across browser sessions

### Requirement 9: Mini Task Organizer

**User Story:** As a user, I want a simple task list inside Zaya, so that I can stay lightly organized without switching to another app.

#### Acceptance Criteria

1. THE Task_Organizer SHALL allow the user to add a new task by entering text of 1 to 200 characters and confirming
2. IF the user attempts to add a task with empty or whitespace-only text, THEN THE Task_Organizer SHALL not create the task and SHALL keep the input field focused
3. THE Task_Organizer SHALL allow the user to mark a task as complete, displaying completed tasks with a visible strikethrough style to distinguish them from incomplete tasks
4. THE Task_Organizer SHALL allow the user to delete a task
5. THE Task_Organizer SHALL persist all tasks in Local_Storage, supporting up to 100 tasks
6. WHEN the user adds, completes, or deletes a task, THE Task_Organizer SHALL update the displayed task list immediately without requiring a page reload
7. THE Task_Organizer SHALL display tasks in a single-column list with each task on its own row, ordered with incomplete tasks above completed tasks, and newest tasks first within each group
8. IF the task list is empty, THEN THE Task_Organizer SHALL display a placeholder message indicating no tasks have been added

### Requirement 10: Settings and Preferences

**User Story:** As a user, I want to configure Zaya's behavior and view privacy information, so that I feel in control of the extension.

#### Acceptance Criteria

1. THE Sidebar SHALL include a settings section accessible via a dedicated settings control in the main navigation
2. THE settings section SHALL display a privacy statement: "Zaya only processes text when you choose to use AI tools. Tasks and reminder settings are stored locally in your browser."
3. THE Zaya_Extension SHALL allow the user to configure Wellness_Reminder intervals and toggle each available reminder type on or off from the settings section
4. WHEN the user changes a preference in the settings section, THE Zaya_Extension SHALL apply the change immediately and persist it in Local_Storage without requiring a separate save action
5. WHEN the Zaya_Extension is opened, THE Zaya_Extension SHALL load previously persisted preferences from Local_Storage and apply them, falling back to default values (interval: 60 minutes, all reminder types enabled) if no stored preferences exist
6. IF Local_Storage is unavailable or the write operation fails, THEN THE Zaya_Extension SHALL display an inline error message indicating that preferences could not be saved and SHALL retain the current in-session settings until the extension is closed

### Requirement 11: Privacy and Data Handling

**User Story:** As a user, I want Zaya to respect my privacy, so that I can trust the extension with my browsing activity.

#### Acceptance Criteria

1. THE Zaya_Extension SHALL not persist writing history or previously processed text beyond the duration of the active processing request
2. THE Zaya_Extension SHALL not collect analytics or usage tracking data
3. WHEN the user explicitly triggers a writing or summarization action, THE Zaya_Extension SHALL transmit only the selected or provided text to the OpenAI API and SHALL NOT transmit text at any other time
4. THE Zaya_Extension SHALL store all user data (tasks, preferences, reminder settings, API key) exclusively in Local_Storage on the user's device
5. WHEN the user uninstalls the Zaya_Extension, THE Zaya_Extension SHALL remove all data stored in Local_Storage

### Requirement 12: Chrome Extension Architecture

**User Story:** As a developer, I want the extension to follow Manifest V3 best practices, so that the extension is performant, secure, and publishable to the Chrome Web Store.

#### Acceptance Criteria

1. THE Zaya_Extension SHALL use Chrome Extension Manifest V3 format with a valid manifest.json that includes the required fields: manifest_version set to 3, name, version, permissions, and content_scripts
2. THE Zaya_Extension SHALL use React and TypeScript for all UI components including the Sidebar, Popup, and Floating_Button
3. THE Zaya_Extension SHALL use Tailwind CSS for styling
4. THE Background_Script SHALL run as a service worker as required by Manifest V3, and SHALL re-register any active Wellness_Reminder timers using the Chrome Alarms API so that reminders survive service worker termination
5. THE Content_Script SHALL communicate with the Sidebar and Background_Script using Chrome runtime message passing
6. WHEN the Zaya_Extension is installed locally via Chrome developer mode, THE Zaya_Extension SHALL load without manifest errors, inject the Content_Script into web pages, open the Sidebar on user action, and deliver Wellness_Reminder notifications
7. THE Zaya_Extension SHALL declare only the following permission categories in the manifest: storage, alarms, notifications, activeTab, and scripting
