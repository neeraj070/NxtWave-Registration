# AI-assisted growth decision notes

**Draft reflections. Verify these against your actual development process before submitting.** I do not have a reliable transcript of the AI conversations. The questions and suggestions below are reconstructed examples based on observable project decisions; do not present them as exact prompts or conversation history unless you confirm they are accurate.

## How the approach changed (reconstructed from the implementation)

The observable solution moved from a simple campaign showcase toward a measurable and safer simulation. The final implementation uses one attribution result per registration, gates recommendations on minimum observed counts, and separates user-entered demo submissions from campaign records. These are code-backed design changes, not a verified memory of my initial thinking; revise this reflection to match what actually changed for you.

## Example 1 — Give each registration one source

- **What I asked AI (reconstructed):** How should the dashboard credit a registration when it has both an ambassador referral code and a UTM source?
- **AI suggestion (reconstructed):** Use one precedence rule instead of counting the same registration for two channels.
- **What I changed:** I made a valid ambassador code take precedence, then use a recognized UTM source, then Direct or unknown.
- **My decision:** Accepted.
- **Why:** A unique registration should contribute once to campaign totals, while a valid referral is the strongest direct signal in this model.
- **What is implemented:** The server validates the code and stores a single channel plus optional ambassador attribution on the registration row.

## Example 2 — Avoid scaling from tiny samples

- **What I asked AI (reconstructed):** What should the recommendation engine do when one channel or ambassador has only a few registrations?
- **AI suggestion (reconstructed):** Use minimum observed counts and show the evidence status before recommending scale.
- **What I changed:** I set the strong ambassador-channel rule at 10 registrations and an individual ambassador prompt at five attributed registrations.
- **My decision:** Accepted.
- **Why:** Small counts can be accidental; the dashboard should say when it needs more evidence.
- **What is implemented:** Deterministic rules use those thresholds and label evidence. These are product rules, not learned model behavior.

## Example 3 — Keep the referral demo open without mixing campaign data

- **What I asked AI (reconstructed):** How can I show an end-to-end referral registration while synthetic records are loaded?
- **AI suggestion (reconstructed):** Keep the public form paused until the synthetic dataset is reset, avoiding any chance of mixing records.
- **What I changed:** I rejected the pause as the only safe option and added a separate `demo_registrations` table. Demo submissions appear in the labeled demo dashboard while genuine campaign registrations stay in `registrations`.
- **My decision:** Rejected the suggested pause; accepted the data-isolation goal.
- **Why:** The original pause protected separation but blocked the assignment's working referral demonstration. A separate table supports the demo and preserves the distinction.
- **What is implemented:** Demo-mode submissions are validated, attributed, duplicate-checked, shown in demo metrics, and cleared by the protected reset action. This reconstructed exchange is a draft, not a claim that an AI system actually made that suggestion.
