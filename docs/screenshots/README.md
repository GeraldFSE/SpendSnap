# Screenshots

App captures embedded in [§4 of the main README](../../README.md#4-screenshots--demo).

Use these exact filenames — the README already links to them, so a correctly named PNG
appears with no edit to the README at all.

| File | Screen | What the shot should show |
| --- | --- | --- |
| `quick-log-input.png` | Add Expense | The AI Quick Log box with a natural-language description typed in, before parsing |
| `quick-log-filled.png` | Add Expense | The same screen after parsing: merchant, amount, category and date filled in for review |
| `home.png` | Home | Month-to-date total, today's spend, budget progress bar, recent expenses |
| `add-expense.png` | Add Expense | The manual path: amount, category, notes, editable date, and the "Also show in" group tickboxes |
| `summary.png` | Summary | The weekly bar chart with total, average and peak |
| `history.png` | History | Period filters plus the category breakdown chart |
| `group.png` | Group | An expanded group card: invite code, members by email, per-member pie chart, owner controls |

## Tips

- **Set the data up first.** Log a handful of expenses across several categories and dates
  so the charts have something to show — empty states make poor screenshots.
- **One device, one size.** Capture every shot on the same simulator so the images share
  a resolution and sit evenly in the README.
- **Watch what's on screen.** Real email addresses appear in the group member list, and the
  status bar carries the time and battery. Use a throwaway account for the group shots.
- **PNG, not JPEG.** UI screenshots stay sharp in PNG and compress well; JPEG blurs text.
- **A GIF beats stills** for the Quick Log round trip. Record with
  `xcrun simctl io booted recordVideo demo.mov`, then convert. Name it `quick-log.gif`
  and embed it in place of the two stills if you prefer.
