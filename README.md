# Service Timer

A countdown timer for church services that keeps running when the internet drops. Built by Sleeky Programmers as a standalone product and an entry point to Church Workflow.

Read **Service Timer — Product Plan** and **Service Timer — Developer Handoff** first. This app is the hosted version of the prototype `Service Timer.html`.

## Running it

```bash
cp .env.sample .env.local   # set NEXT_PUBLIC_API_URL
npm install
npm run dev        # http://localhost:3000
npm test           # timing rules, actions and API mapping
npm run typecheck
npm run lint
```

The API side lives in `churchWorkflow-api` (`src/modules/service-timer`, with its own README).

## Pages

| Page | Who | What |
|---|---|---|
| `/login`, `/signup`, `/verify`, `/setup` | church admins | Church Workflow accounts. Sign-up creates the church as a Service Timer church. "Use on this computer only" skips the account. |
| `/control` | signed in, or local mode | The control panel. Signed in, it syncs live with every phone and display. |
| `/display` | the control laptop | The extended-screen window, fed by the laptop over `BroadcastChannel`. Works with no internet. Press F or double-click for full screen. |
| `/d/<link>` | any screen | A display link. No login. |
| `/c/<link>` | volunteers' phones | The operator PIN unlocks control for 12 hours. |

## Online and offline

- Every change saves on the device first, then goes to the server. The laptop and its display window keep running with no internet.
- Changes made offline are kept (even across a reload) and sent when the connection returns; a device with unsent changes sends them instead of taking the server's copy.
- Templates are saved over REST and only while connected.
- The badge at the top shows Local mode, Connecting, Live, Syncing or Offline.
- Viewers see the controls disabled; PIN operators can run the timer but not change the display's design.

## Branches

- `main` and `develop` only take merges from feature branches.
- Every feature is built on `feature/<feature-name>`, branched from `develop`.

## How it is built

| Path | What it is |
|---|---|
| `src/lib/timer/timing.ts` | The timing rules from section 5 of the handoff, as pure functions. Change them only with tests. |
| `src/lib/timer/actions.ts` | Every change to the timer (start, next, +1 min, templates …) as a pure function on a draft state. |
| `src/lib/timer/store.ts` | The local-first store. `dispatch()` applies an action, saves it on this device and broadcasts it to the display window over `BroadcastChannel`, which needs no network. |
| `src/lib/timer/clock.ts` | The shared clock, corrected by the server's time on every message. |
| `src/lib/timer/sync.ts` | Live sync over Socket.IO: sends local changes, applies other devices' changes, keeps unsent changes across reloads. |
| `src/lib/timer/remote.ts` | Maps the screens' one state object to the API's settings, templates and live session. |
| `src/lib/api` | The API client (same tokens and refresh as Church Workflow) and its endpoints. |
| `src/components/display` | The display screen. |
| `src/components/control` | The control panel, in the Church Workflow style (Tailwind). |
| `src/components/ui` | Button, Card, Badge and Switch copied from `church-workflow-fe-app`, plus Input/Select with the same look. |
| `src/app/globals.css`, `tailwind.config.ts` | Theme tokens copied from `church-workflow-fe-app`. Keep them in step with that app. |
| `src/styles/display.css` | The display screen's stylesheet, ported unchanged from the prototype. The display follows each church's own colours, logo and font, not the Church Workflow theme. |

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

- **Phase 0 (done):** prototype parity, running locally on one laptop with the display window.
- **Phase 1 (done):** sign-up and sign-in with Church Workflow accounts, settings and templates in the API, live phone control over Socket.IO, display links, operator PIN, roles.
- **Phase 2:** offline-first (service worker, sync on reconnect, status indicators).
- **Phase 3:** smart import from PDF, Word or photo.
- **Phase 4:** plans and billing in naira.
- **Phase 5:** programs from Church Workflow.
