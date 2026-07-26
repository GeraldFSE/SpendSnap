# SpendSnap — Design Diagrams

UML design diagrams for SpendSnap, written in **PlantUML** so they live in version control
next to the code they describe and can be re-rendered deterministically.

| # | Diagram | Type | What it answers |
| --- | --- | --- | --- |
| 1 | [01-system-architecture.puml](01-system-architecture.puml) | Deployment / component | How the client, the Firebase server tier, and the AI Quick Log function split, and what crosses each boundary |
| 2 | [02-component-diagram.puml](02-component-diagram.puml) | Component | The layered client (screens → service → backend, pure utilities beneath) plus the Cloud Function source |
| 3 | [03-data-model.puml](03-data-model.puml) | Class | The Firestore document shapes and how expenses are tagged into selected groups |
| 4 | [04-sequence-add-expense.puml](04-sequence-add-expense.puml) | Sequence | Logging an expense, the budget-alert side effect, real-time fan-out to group members |
| 5 | [05-sequence-join-group.puml](05-sequence-join-group.puml) | Sequence | Joining by invite code, and how the rules constrain it to a self-join |
| 6 | [06-activity-budget-alert.puml](06-activity-budget-alert.puml) | Activity | `checkBudgetAndNotify()` — thresholds and per-month de-duplication |
| 7 | [07-use-case.puml](07-use-case.puml) | Use case | Actors and the features they reach |
| 8 | [08-navigation-state.puml](08-navigation-state.puml) | State machine | The auth gate and the tab navigation it unlocks |

Rendered output is committed alongside the sources: [`png/`](png) for embedding in the
README and reports, [`svg/`](svg) for slides and printing (scales without blurring).

## Re-rendering

```bash
./render.sh                 # all diagrams → png/ and svg/
./render.sh 03-data-model   # just one
```

The script downloads `plantuml.jar` into a git-ignored `.cache/` on first run; it needs a
JDK. It also needs Graphviz for the non-sequence diagrams:

```bash
brew install graphviz
```

The committed images were rendered with Graphviz, which is also what
plantuml.com uses — so what you see here is what these sources look like anywhere else.
Without `dot` the script still works, falling back to PlantUML's built-in Smetana engine,
but the layouts differ and are generally worse.

Alternatives to the script: the **PlantUML** extension for VS Code (Alt+D previews the file
under the cursor), or pasting a `.puml` file into <https://www.plantuml.com/plantuml>.

## Editing conventions

- **No `skinparam defaultFontName`.** Naming a font (Helvetica in particular) makes the
  Smetana engine drop `b` and `k` glyphs on macOS. The default font renders correctly.
- **A `<size:N>…</size>` span must not cross a `\n`.** The tag closes at the line break and
  the closing tag then renders literally; open and close it on each line instead.
- Use `//italic//` and `**bold**` (creole), not `*asterisks*`.
- If a diagram frame is drawn flush against the title, end the `title` line with `\n` to
  add a blank line of padding (see `07-use-case.puml`).
- Prefer a `legend` block over many `note`s on a crowded diagram — notes anchor to their
  element and drag long leader lines across the layout.
- Keep each diagram answering **one** question; add a new file rather than overloading one.

Three habits that keep the layouts readable, learned the hard way on `07-use-case.puml`:

- **Never draw a package-to-package dependency.** Graphviz routes it around the entire
  cluster, and the result reads as a stray boundary floating over the diagram. Pick one
  representative node in each package and connect those instead.
- **Drop an actor association when an `<<include>>` already reaches the use case**, and
  avoid `<<include>>` edges that cross package boundaries. Both stretch single edges across
  the whole canvas. State what you dropped in the legend.
- **Long parenthetical labels set the width** of their package and therefore of everything
  around it. Move the detail into the legend and keep the bubble short.
