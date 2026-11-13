# Digital Bridge: Accessible Onboarding & Career Gateway (Track 1)
Drop-in sign-up, profile, and job-application module. One question per screen, voice in/out, Amharic + English, offline-first, no paid APIs.

## Run (≈5 minutes)
```bash
docker compose up --build          # → http://localhost:3000  (demo page)
docker compose --profile test run --rm axe   # axe-core gate (must print PASS)
```
Needs only Docker. No keys, no accounts.

## 3 levels of adoption
| Level | How | Try it |
|---|---|---|
| 1 | `<script src="accessible-onboarding.js"></script><accessible-onboarding api="/api/v1">` (Shadow DOM, no CSS clashes) | `/` |
| 2 | REST API, spec in [`openapi.yaml`](openapi.yaml) | `/openapi.yaml`, `curl localhost:3000/api/v1/jobs?support=screen_reader` |
| 3 | schema.org/JobPosting JSON-LD | `curl localhost:3000/api/v1/jobs.jsonld` |

## 10-minute judge checklist
1. Keyboard only: Tab/Enter/Space through all questions; focus lands on each new question heading.
2. Screen reader (NVDA/TalkBack): progress and question are announced via live region.
3. 200% zoom (Ctrl +): no horizontal scroll, nothing clipped.
4. Sound off: every feature has a visible text equivalent; nothing is audio-only.
5. Click **አማርኛ**: whole UI switches. **Read aloud** speaks the question; 🎤 dictates, shows the text, never auto-submits.
6. Go offline (DevTools → Offline), keep answering, reload: progress remains; it syncs when back online.
7. No session time-out: leave it open for as long as you like.
8. Pick **Refer me through a partner**, check private support options: no proof asked.

## Layout
```
frontend/accessible-onboarding.js   Web Component: state machine, i18n, TTS, dictation, offline queue
backend/src/server.js, schema.sql   REST API + SQLite
backend/openapi.yaml                (copied to ./openapi.yaml)
tests/a11y/axe.test.js              axe-core gate
docs/WCAG_CONFORMANCE.md            conformance report
```
## Team split
Frontend/A11y: component UI, focus, contrast · Backend: API, SMS resume, JSON-LD · Offline/Voice/Amharic: I18N, queue, STT/TTS fallbacks, Ethiopian calendar · DevOps/Testing: compose, axe, manual NVDA/TalkBack runs.

## Known gaps (fill before submission)
Job-application flow + employer form UI (API is done: `POST /jobs`, `GET /jobs?support=`), Ethiopian-calendar date step (use `Intl.DateTimeFormat('am-ET-u-ca-ethiopic')`), partner-assisted consent screen, SMS delivery, service worker for full offline shell.
