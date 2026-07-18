## ADDED Requirements

### Requirement: Action feedback never blocks the canonical apply action
The system SHALL display review feedback without intercepting the sticky Apply approved changes control or mobile navigation.

#### Scenario: Evaluator reviews proposals rapidly
- **WHEN** multiple Accept, Edit, Reject, Escalate, or Defer actions create Toasts in quick succession
- **THEN** the Apply approved changes control remains visible and clickable
- **AND** Toasts remain keyboard-dismissible and do not overflow the viewport

### Requirement: Review progress remains understandable at realistic density
The system SHALL summarize completion, outstanding high-materiality work, and approved changes without removing proposal evidence or review history.

#### Scenario: Some proposals are completed
- **WHEN** the evaluator has reviewed part of the proposal set
- **THEN** the page shows completed/total progress, pending approvals, and unresolved PM-required items
- **AND** completed cards may collapse but remain expandable with their evidence and decision history intact

### Requirement: Dialogs, drawers, and search provide complete keyboard behavior
The system SHALL trap focus within open modal surfaces, prevent background interaction, restore focus on close, and expose global search results with correct combobox/listbox semantics.

#### Scenario: Modal is used without a pointer
- **WHEN** the evaluator opens a review modal and navigates with Tab, Shift+Tab, Enter, and Escape
- **THEN** focus remains inside the modal until it closes
- **AND** focus returns to the invoking control

#### Scenario: Global search is used with a keyboard
- **WHEN** the evaluator types a query and uses Arrow keys, Enter, or Escape
- **THEN** the active result is announced and selectable through combobox/listbox/option semantics
- **AND** closing search returns focus predictably

### Requirement: Published assets load without credibility defects
The system SHALL publish intended typography and the above-fold website hero without missing asset requests or avoidable deferred loading.

#### Scenario: Production site loads
- **WHEN** the deployed Change Inbox and public website are inspected on desktop and mobile
- **THEN** all selected font and application media requests return successfully
- **AND** the hero screenshot is requested eagerly while below-fold screenshots remain lazy

#### Scenario: Intended font cannot be packaged reliably
- **WHEN** the Sites build cannot serve the Geist assets from a stable public path
- **THEN** the application intentionally uses and documents the system font stack
- **AND** it makes no request to a known-missing font URL
