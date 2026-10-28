# Manual browser test checklist

Browser automation is not installed in this project or available in the current tool environment. The app has only been checked over HTTP and through isolated API tests; its visual layout and interactive browser behavior have not been verified. Use this checklist before presenting the UI.

## Isolated test setup

Use a disposable SQLite database so the existing `data/campusai.sqlite` is not changed. Stop the current server with Ctrl+C, then open a PowerShell terminal in the project and start a second local instance with a separate database path:

```powershell
$env:DATABASE_PATH = Join-Path $env:TEMP 'campusai-browser-check.sqlite'
npm.cmd start
```

The project `.env` still supplies the local admin password. Open `http://localhost:3000/admin`, sign in, and select **Load demo data**. This database is disposable. Use invented details and `example.test` email addresses only.

## Desktop — 1440 × 900

- [ ] Open `/register`; confirm the workshop headline, value proposition, audience, benefits, privacy notice, and form are readable.
- [ ] Use a valid final-year record with `?ref=AMB102`; verify success includes a registration ID.
- [ ] In `/admin`, open Overview and verify the DEMO DATA banner remains visible; confirm the unique count, channel chart, daily chart, and ambassador count each reflect the simulated registration.
- [ ] Open Registrations; verify the invented email appears once with ambassador attribution. Export the CSV and check that it includes that demo record.
- [ ] Resubmit the same email with different casing; verify a duplicate error and no metric increase.
- [ ] Submit a malformed email and a non-final-year value (where testable through the UI); verify clear validation and no record is created.
- [ ] Open `/register?ref=NOTREAL`; submit with a unique invented email. Verify the registration succeeds with a warning and no ambassador credit.
- [ ] Visit each admin navigation item: Overview, Registrations, Ambassadors, Channels, and Campaign Plan. Check filter/search controls, spend save feedback, CSV actions, and the copy-link button.
- [ ] Use **Reset demo data**; verify confirmation, zero registrations, no ambassadors, zero demo spend, and no DEMO DATA banner. Reload demo data once if you need to repeat the sequence.

## Mobile — 390 × 844 and 360 × 800

- [ ] Repeat the registration page inspection at both widths. Confirm there is no horizontal page scroll, form labels and controls fit, and the CTA and error/success messages remain visible.
- [ ] Open the admin page. Confirm the mobile menu opens and closes, all five navigation items are reachable, and navigation closes or remains usable after selection.
- [ ] Check dashboard cards, charts, tables, recommendation text, demo banner, and reset control for clipping or overlap. Use horizontal table scrolling only where intended.
- [ ] Complete one demo referral registration and verify success feedback and dashboard changes at mobile width.

## Keyboard and feedback

- [ ] Complete the registration form using only Tab, Shift+Tab, arrow keys, and Enter. Confirm focus is visible and field labels are announced/associated.
- [ ] Trigger validation, duplicate, unknown referral, and success states; confirm each message is visible, understandable, and announced as appropriate.
- [ ] Navigate the admin sections with the keyboard and confirm buttons have clear names and the current section is apparent.
- [ ] Check browser console and network panel for uncaught errors, failed local Chart.js requests, or unexpected external requests.

## Cleanup

Stop the test server with Ctrl+C. The checklist uses a TEMP database instead of the existing development database; keep or remove only the named temporary test files when finished. Do not run the demo reset against the existing development database if you want to preserve its current sample dashboard.
