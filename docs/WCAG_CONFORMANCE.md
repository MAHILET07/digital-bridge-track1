# WCAG 2.2 AA Conformance Report
Product: accessible-onboarding v0.1 · Date: ____ · Tested by: ____
Automated: axe-core via `tests/a11y/axe.test.js` — result: ☐ PASS (0 critical/serious)

## Manual test matrix
| Method | Tool / browser | Result | Notes |
|---|---|---|---|
| Keyboard only | Chrome | ☐ | |
| Screen reader | NVDA + Firefox | ☐ | |
| Screen reader | TalkBack + Chrome Android | ☐ | |
| 200% zoom / 320px reflow | Chrome | ☐ | |
| Sound off | All voice features have text equivalent | ☐ | |
| Amharic (lang="am", Ethiopic font) | | ☐ | |

## Criteria mapping
| SC | How we meet it | Status |
|---|---|---|
| 1.3.1 Info & Relationships | label/legend/fieldset, headings | ☐ |
| 1.4.3 / 1.4.11 Contrast | ≥4.5:1 text, ≥3:1 controls | ☐ |
| 1.4.4 / 1.4.10 Resize, Reflow | rem units, flex-wrap | ☐ |
| 2.1.1 / 2.1.2 Keyboard | native controls, no traps; Esc stops dictation | ☐ |
| 2.2.1 Timing adjustable | no time limits exist | ☐ |
| 2.4.3 / 2.4.7 Focus order & visible | focus moves to heading each step | ☐ |
| 2.5.8 Target size (2.2) | ≥44×44px | ☐ |
| 3.1.1 / 3.1.2 Language | `lang` on component and on language toggle | ☐ |
| 3.3.1–3.3.3 Errors | role=alert, plain language | ☐ |
| 3.3.7 Redundant entry (2.2) | answers persisted, never re-asked | ☐ |
| 3.3.8 Accessible authentication (2.2) | no passwords/CAPTCHA/cognitive tests | ☐ |
| 4.1.3 Status messages | aria-live region | ☐ |

## Known issues
- ____
