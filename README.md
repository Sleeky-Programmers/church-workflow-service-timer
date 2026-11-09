# Service Timer

A countdown timer for church services that keeps running when the internet drops. Built by Sleeky Programmers as a standalone product and an entry point to Church Workflow.

Read **Service Timer — Product Plan** and **Service Timer — Developer Handoff** first. This app is the hosted version of the prototype `Service Timer.html`.

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # timing rules and actions
npm run typecheck
npm run lint
```

- `/control` is the control panel (laptop, and later phones).
- `/display` is the display screen. Open it with **Open display** and drag the window to the extended screen. Press F or double-click for full screen.

## Branches

- `main` and `develop` only take merges from feature branches.
- Every feature is built on `feature/<feature-name>`, branched from `develop`.

## How it is built

| Path | What it is |
|---|---|
| `src/lib/timer/timing.ts` | The timing rules from section 5 of the handoff, as pure functions. Change them only with tests. |
| `src/lib/timer/actions.ts` | Every change to the timer (start, next, +1 min, templates …) as a pure function on a draft state. |
| `src/lib/timer/store.ts` | The local-first store. `dispatch()` applies an action, saves it on this device and broadcasts it to the display window over `BroadcastChannel`, which needs no network. |
| `src/lib/timer/clock.ts` | The shared clock, corrected by the server's time once sync arrives. |
| `src/components/display` | The display screen. |
| `src/components/control` | The control panel. |
| `src/styles/timer.css` | The prototype's stylesheet, ported unchanged so the screens match what has run in live services. |

Rules from live use that the code keeps (handoff, section 6):

- The timer stores a start moment, never a ticking number.
- `extraMs` holds +1 / −1 for this run only; templates stay clean.
- Loading a template copies it; editing the program never changes the template.
- Keyboard shortcuts are off by default and never act while a field has focus.
- A field someone is typing in is never redrawn (`SyncedInput`).
- "Time up" and the over-time count always show together.

## Deployment

Built as a standalone Next.js server (`output: "standalone"`) with the `Dockerfile`, for Dokploy.

## Roadmap

- **Phase 0:** prototype parity, running locally on one laptop with the display window.
- **Phase 1:** sign-up and sign-in with Church Workflow accounts, settings and templates in the API, live phone control over Socket.IO, display links, operator PIN, roles.
- **Phase 2:** offline-first (service worker, sync on reconnect, status indicators).
- **Phase 3:** smart import from PDF, Word or photo.
- **Phase 4:** plans and billing in naira.
- **Phase 5:** programs from Church Workflow.
