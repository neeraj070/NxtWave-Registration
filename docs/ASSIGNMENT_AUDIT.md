# NxtWave Growth Intern assignment audit

Work is checked sequentially against the original assignment. A requirement is marked VERIFIED only with the evidence recorded below.

## Requirement 1 — Understand the student

**Objective:** Identify exactly who the target students are, why final-year engineering students would care about the workshop, and what would motivate them to register.

- **Inspected:** `docs/GROWTH_PLAN.md` audience and value section; `public/register.html` hero, benefits, audience copy, and registration call to action; live `/register` page.
- **Already correct:** The plan names final-year engineering students across India, describes likely barriers (not knowing where to start, assuming advanced experience is needed, and low confidence choosing a project), and positions the free 60-minute workshop as a practical first step. The landing page communicates the same audience and value, lists what students can expect, and offers a clear free registration action without promising unconfirmed event details.
- **Missing or broken:** None found for this requirement.
- **Changes made:** None; existing content was sufficient.
- **Verification:** `GET http://localhost:3000/register` returned HTTP 200. Source review confirmed the stated audience, workshop value, benefits, and CTA on the served page and in the growth plan.
- **Final status: VERIFIED**

## Requirement 2 — Create the marketing campaign plan

**Objective:** Explain channel actions and rationale, the 500-registration model, ₹2,000 allocation, daily actions, and channel priorities; label figures as assumptions and verify totals.

- **Inspected:** `docs/GROWTH_PLAN.md` and `docs/SLIDE_OUTLINE.md`.
- **Already correct:** The existing plan had six channels, seven dated activity rows, a target model totaling 500, a ₹2,000 budget table, and clear labels that reach and conversion are unvalidated assumptions. It warned that recovery must not double-count.
- **Missing or broken:** Low severity. `docs/GROWTH_PLAN.md` listed channel actions but left the reasons for prioritizing each channel implicit and did not address email where no opted-in list is documented. Recommended fix: state channel rationale and make email conditional on consent. Applied below.
- **Changes made:** Added concise rationale to each prioritized channel and clarified that email is conditional on an existing consented list. Made the model's capacity assumptions and peer-channel priority explicit.
- **Verification:** A Node check read the plan tables and verified planned registrations = 500, budget allocation = ₹2,000, and exactly seven day rows. Growth plan is 828 words, keeping it concise for the two-page limit. All reach/conversion figures remain labeled illustrative and unvalidated.
- **Final status: VERIFIED**

## Requirement 3 — Build one working asset

**Objective:** Verify the registration, referral, dashboard, ambassador, channel, budget, and demo journeys; support a referral-flow demonstration without mixing simulated submissions into genuine campaign records.

- **Inspected:** Live `/register`, `/api/public/config`, `/health`, authenticated `/api/admin/dashboard`; `public/register.html`, `public/register.js`, `public/admin.html`, `public/admin.js`, `public/styles.css`; `src/server.js`, `src/db.js`, `src/campaign.js`, and `test/app.test.js`.
- **Already correct:** Required fields and final-year eligibility are validated client and server side; email is normalized and unique; recognized referral codes are saved once and unknown codes do not claim attribution. Dashboard totals, channels, daily counts, ambassadors, spend, and recommendations derive from SQLite. Demo records have a visible dashboard banner; reset is protected. Responsive CSS has breakpoints at 760px and 390px.
- **Missing or broken:** High severity. `public/register.js` disabled the public form and `src/server.js` rejected `/api/register` when demo records were loaded, blocking the requested end-to-end referral demo. Recommended fix: accept simulated entries into a separate store and include them only in labeled demo metrics. Applied below.
- **Changes made:** Added an indexed, separate `demo_registrations` table and `all_registrations` view. The same validated form now saves to the separate table during demo mode. Demo dashboard totals, recent registrations, channel metrics, ambassador attribution, and CSVs include these simulated submissions; campaign rows remain separate. Demo reset/load clear the isolated simulation rows, and the public page explains the demo behavior. Updated the README walkthrough.
- **Verification:** `npm.cmd test` passed all 17 tests. The demo-flow test loads the 48 sample rows in the isolated test DB, registers via `AMB102`, verifies a single extra attributed dashboard registration while the campaign table stays at 48, checks admin listing and CSV inclusion, rejects a normalized duplicate, then resets both demo sets. Live server check: `/health` and `/register` returned successfully; login returned 200, dashboard returned 200, and unauthenticated dashboard returned 401. Live metrics reported demo mode, 48 synthetic registrations, target 500, ₹1,250 spend, ₹2,000 budget, ₹750 remaining, 7 channels, 7 daily points, and 5 ambassadors. No live database rows were added. Responsive CSS was inspected, but layout was not rendered at device viewports because no browser automation tool is available.
- **Final status: VERIFIED**

## Requirement 4 — Explain how my thinking changed

**Objective:** Explain the change between initial idea and final solution; if actual development history is unavailable, keep a code-grounded reflection draft and flag it for personal verification.

- **Inspected:** `docs/AI_LEARNING_NOTES.md`; attribution, recommendation, and demo-mode logic in `src/campaign.js`, `src/server.js`, and `src/db.js`.
- **Already correct:** The notes were explicitly labeled draft reflections and avoided claiming user research or AI experiments occurred.
- **Missing or broken:** Low severity. `docs/AI_LEARNING_NOTES.md` contained individual decision examples but did not summarize the overall change in approach. Recommended fix: add an explicitly reconstructed, code-grounded summary and mark personal history for review. Applied below.
- **Changes made:** Added a reconstructed, code-grounded paragraph describing the movement toward single-source attribution, evidence thresholds, and separate demo submissions. It explicitly says this is not verified personal memory and asks the author to revise it.
- **Verification:** Confirmed each described design choice against the relevant implementation; checked that the caveat appears alongside the draft reflection.
- **Final status: VERIFIED**

## Requirement 5 — Explain what I would improve with another 24 hours

**Objective:** Describe specific, realistic next steps that could improve campaign effectiveness or asset quality without claiming they were completed.

- **Inspected:** Existing next-step language in `docs/VIDEO_SCRIPT.md` and the measurement risks in `docs/GROWTH_PLAN.md`.
- **Already correct:** The video script mentioned validating assumptions and improving deployment security, consent, and measurement.
- **Missing or broken:** Low severity. `docs/GROWTH_PLAN.md` and `docs/VIDEO_SCRIPT.md` had no concrete, time-bounded 24-hour improvement section. Recommended fix: specify the next mobile/accessibility checks and a measured channel pilot while labeling them as future work. Applied below.
- **Changes made:** Added mobile and keyboard-only funnel checks, a consented small channel pilot with unique links and reach/visit denominators, and one alternate workshop message test. The section explicitly says these are proposed steps, not completed experiments.
- **Verification:** Confirmed the section exists in the growth plan, is specific to campaign and asset effectiveness, and the plan is 904 words (still concise for the two-page deliverable).
- **Final status: VERIFIED**

## Requirement 6 — Explain what AI suggested that I rejected

**Objective:** Include two or three examples covering the question, suggestion, change, and rationale; explicitly identify a rejected suggestion and avoid inventing history.

- **Inspected:** Existing AI notes and current attribution, recommendation, and demo-registration implementation.
- **Already correct:** The earlier notes had three code-aligned product decisions, but no rejected suggestion and no “what I asked” prompts.
- **Missing or broken:** Medium severity. `docs/AI_LEARNING_NOTES.md` had no explicit rejected suggestion or “what I asked” prompts. Recommended fix: add two or three structured, explicitly reconstructed examples and identify one rejection. Applied below.
- **Changes made:** Rewrote the notes with three structured examples. The demo-flow example rejects pausing the registration page and records the implemented separate-table alternative. The header and the example explicitly label the dialogue as reconstructed draft material, not verified AI conversation history.
- **Verification:** A Node check found exactly three examples, three reconstructed question prompts, one explicit rejection, and an explicit caveat that no actual AI suggestion is claimed. Code checks confirmed the described thresholds and table separation exist.
- **Final status: VERIFIED**

## Requirement 7 — Growth plan deliverable

**Objective:** Verify a concise growth plan and submission outline with audience/motivation, channel priorities, seven-day plan, budget, and a defensible 500-registration model.

- **Inspected:** `docs/GROWTH_PLAN.md` and `docs/SLIDE_OUTLINE.md`.
- **Already correct:** The growth plan covers target students and motivation, prioritized channel roles, seven activity days, the 500-registration model, budget, attribution, risks, and unvalidated assumptions. The slide outline contains the same core story with recommended visuals and speaker notes.
- **Missing or broken:** None found after the additions in Requirements 2 and 5.
- **Changes made:** None in this requirement; retained the existing outline and updated growth plan.
- **Verification:** PowerShell counted exactly five slide headings. The growth plan has 904 words and includes all required sections. The plan model and budget totals were verified under Requirement 2 as 500 and ₹2,000 respectively. Page count is not directly rendered here; the concise word count and five-slide alternative satisfy the submission-length check.
- **Final status: VERIFIED**

## Requirement 8 — Working asset deliverable

**Objective:** Verify startup, environment configuration, database setup, demo setup, registration, and dashboard; document whether a public deployment exists and what it needs.

- **Inspected:** `README.md`, `.env.example`, `.gitignore`, `package.json`, `src/server.js`, and the live application.
- **Already correct:** README has PowerShell install/run/test commands, describes environment variables, notes that SQLite initializes on startup, explains demo load/reset and registration, and documents the current simulation. `.env.example` contains placeholders; `.gitignore` excludes `.env` and SQLite files. The app accepts `PORT`, `APP_URL`, and `DATABASE_PATH`; production requires `SESSION_SECRET` and sets secure cookies. Local `npm.cmd start` ran successfully; `/health`, `/register`, and authenticated dashboard responded.
- **Missing or broken:** Low severity. `README.md` did not state whether a public deployment exists or what a public demo requires. Recommended fix: explicitly state no URL exists and list host, persistent storage, environment, and security needs. Applied below.
- **Changes made:** Added a README section stating no public host or URL is configured, with environment, persistent SQLite disk, HTTPS origin, secret, and hardening requirements for a future deployment.
- **Verification:** Matched the new deployment notes to server configuration and confirmed live `/health` returned `{"ok":true}`. Reviewed placeholders without exposing local secret values.
- **Final status: VERIFIED**

## Requirement 9 — AI and learning notes deliverable

**Objective:** Verify that AI learning notes exist, contain two or three examples, and address a rejected suggestion without fabricating conversation history.

- **Inspected:** `docs/AI_LEARNING_NOTES.md` and its supporting code references.
- **Already correct:** The revised notes contain exactly three examples, each with a reconstructed question, suggestion, change, decision, rationale, and implemented result. One explicitly rejects pausing the demo registration flow. The document says no reliable transcript exists and the examples require personal verification.
- **Missing or broken:** None found after the Requirement 6 revision.
- **Changes made:** None in this requirement.
- **Verification:** File-existence and heading checks returned true and three examples; source review confirmed each described decision is implemented.
- **Final status: VERIFIED**

## Requirement 10 — Three-minute video deliverable

**Objective:** Provide a roughly three-minute script explaining the approach, build, rationale, AI contribution, and a rejected AI suggestion.

- **Inspected:** Existing `docs/VIDEO_SCRIPT.md` and AI learning notes.
- **Already correct:** The earlier script covered the problem, strategy, and working product, but was short and did not describe a rejected suggestion.
- **Missing or broken:** Medium severity. `docs/VIDEO_SCRIPT.md` was about 260 spoken words and lacked the rejection story and AI-history caveat. Recommended fix: prepare a roughly three-minute timed script with the rejected suggestion and a clear reconstruction warning. Applied below.
- **Changes made:** Rewrote it into five timed sections covering the student problem, channel plan, live asset walkthrough, measurement, reconstructed AI decisions (including the rejected pause), and next steps. Kept the script explicit that the AI examples need confirmation and that results are simulated.
- **Verification:** PowerShell counted 412 spoken words across five timestamped sections, a plausible three-minute pace with room for pauses and the screen walkthrough. Checks confirmed audience, strategy, build, AI, and rejection topics are present.
- **Final status: VERIFIED**

## Requirement 11 — Final project verification

**Objective:** Rerun the full test suite after Requirements 1–10; verify registration/referral, demo separation/reset, dashboard calculations, required documents, and report remaining issues.

- **Inspected:** Complete app test suite, live local routes, configuration, growth plan, AI notes, video script, slide outline, README, and this audit.
- **Already correct:** Isolated tests cover valid and invalid registrations, final-year eligibility, duplicates, valid/invalid referral attribution, code uniqueness, auth and unauthorized routes, dashboard/budget calculations, zero-registration CPR, demo reset, CSV, and empty-database behavior.
- **Missing or broken:** No new regression found. Browser-based viewport rendering and a real public deployment remain unverified/unavailable.
- **Changes made:** Added isolated checks that demo registration appears in authorized admin listing and CSV export.
- **Verification:** Final `npm.cmd test`: 17 passed, 0 failed. Live `/health` returned `{"ok":true}`; public config reports local `http://localhost:3000` and demo mode. Requirements document check found README, growth plan, AI notes, video script, slide outline, and audit. A separate consistency check confirmed planned registrations = 500, budget = ₹2,000, three AI examples with a rejection, five slide headings, and five timed video sections. The live dev database still reports its existing 48 synthetic demo records; no test or manual flow wrote to it.
- **Final status: VERIFIED**

## Final follow-up checks — browser testing, deployment preparation, and document consistency

- **Browser automation availability:** No browser/playwright/puppeteer tool is available in the current environment, and `npm ls --depth=0 playwright @playwright/test puppeteer puppeteer-core` showed no installed browser automation package. Live HTTP checks confirm `/register` returns 200 and `/health` returns `{"ok":true}`, but they do not verify the rendered UI.
- **Manual checklist:** Added `docs/BROWSER_TEST_CHECKLIST.md` with isolated-database instructions and desktop 1440×900, mobile 390×844/360×800, registration, invalid/duplicate input, referral attribution, admin navigation, dashboard update, reset, keyboard, and console/network checks. Visual verification remains incomplete until this checklist is run in a browser.
- **Deployment inspection:** No deployment files or public host existed; `git rev-parse --is-inside-work-tree` confirms the workspace is not a Git repository. Added a Render Blueprint (`render.yaml`) and `docs/DEPLOYMENT.md`. It configures Node, `npm ci`/`npm start`, `/health`, one persistent SQLite mount, runtime URL reference, a generated session secret, prompted admin password, and `autoDeployTrigger: "off"`. No account, external service, or deployment was created.
- **Hosting evidence:** Render's current docs state that persistent disks attach to paid web services and persist only data under the mount path; disks are single-instance and prevent scaling beyond one instance. Free web services have ephemeral filesystems. This supports the selected Render disk-backed option for this SQLite app: [Render persistent disk docs](https://render.com/docs/disks), [Render free service limits](https://render.com/docs/free), [Render Blueprint reference](https://render.com/docs/blueprint-spec).
- **Config verification:** PyYAML parsed `render.yaml`; assertions confirmed the disk path equals the parent directory of `DATABASE_PATH`, `autoDeployTrigger` remains the string `off`, admin password is an unsynced secret, and session secret generation is enabled. Render's own validator was not run because no external Render account/service is authorized or configured.
- **Submission consistency:** Re-read the growth plan, slide outline, AI notes, and video script. Plan figures and reach/conversion are explicitly assumptions; the total model remains 500 and planned spend ₹2,000. Changed the slide 4 title to “Dashboard measures and decision rules” so it does not imply measured campaign results. The AI notes and video script label their AI examples as reconstructed drafts needing personal confirmation; neither claims actual AI chat history or real campaign outcomes.
- **Final test run:** `npm.cmd test` completed after the changes above: 17 passed, 0 failed.
