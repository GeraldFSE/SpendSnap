# SpendSnap Product Brief

## Problem

Most budgeting apps fail because recording expenses is inconvenient. People forget, skip entries, and eventually stop tracking. SpendSnap should make logging feel automatic and lightweight.

## Core Features

- Back Tap logging: Double-tap the back of the iPhone to open a quick expense capture flow.
- Auto SMS parsing: Bank SMS text is parsed into structured expense records before the user pockets the phone.
- Dynamic Island budget status: Remaining daily budget is visible at a glance on supported devices.
- Spending summaries: Daily, weekly, and monthly totals help users understand spending trends and avoid overspending.

## Product TODOs

- TODO: Validate the exact iOS SMS intake path. iOS apps cannot freely read SMS in the background, so the implementation likely needs Shortcuts, share sheet, notification actions, manual paste, or another user-approved flow.
- TODO: Define the minimum useful logging flow. Decide whether Back Tap opens a manual form, runs a Shortcut, receives clipboard text, or combines these paths.
- TODO: Decide the first budget model. Start with daily spending limits, then expand to weekly/monthly/category budgets if needed.
- TODO: Define the launch metrics. Suggested metrics: logs per user per day, percentage of parsed SMS accepted without edits, and alert usefulness.
