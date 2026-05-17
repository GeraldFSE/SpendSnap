# SpendSnap Back Tap and Shortcut Plan

Back Tap can run an iOS Shortcut. The first SpendSnap Shortcut should collect an amount or receive shared text, then open the app with a URL payload.

## Proposed URL Shape

```text
spendsnap://log?source=shortcut&rawText=<url-encoded-bank-sms-or-note>
```

## Shortcut TODOs

- TODO: Create a Shortcut named `SpendSnap Log Expense` that can be assigned to Back Tap in iOS Settings.
- TODO: Decide whether the Shortcut asks for amount/merchant manually, reads clipboard text, or accepts shared SMS text.
- TODO: Add a URL scheme or App Intent in the iOS app so the Shortcut can hand off raw expense text.
- TODO: Document user setup steps with screenshots once the Shortcut exists.
