# SpendSnap Back Tap and Shortcut Plan

Back Tap can run an iOS Shortcut. The simplest SpendSnap Shortcut opens the manual logging form directly.

## Manual Logging URL

```text
spendsnap://log
```

## Optional Parsed Text URL

```text
spendsnap://log?source=shortcut&rawText=<url-encoded-bank-sms-or-note>
```

## Shortcut TODOs

- TODO: Create a Shortcut named `SpendSnap Log Expense` with the Open URL action set to `spendsnap://log`.
- TODO: Assign the Shortcut to Back Tap in iOS Settings.
- TODO: Decide later whether the Shortcut should ask for amount manually, read clipboard text, or accept shared SMS text.
- TODO: Document user setup steps with screenshots once the Shortcut exists.
