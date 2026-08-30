# Strategy audit — night 3

Written unprompted, before building anything else tonight, per instruction to
"critically re-evaluate" before continuing. Short version: **the core bet
from night 2 holds and got more validated, not less, by tonight's research.
No reversal. Two adjustments below, plus a sharper reason to prioritize what
comes next.**

## What we agreed Friday night, restated

1. Real product path, not just a portfolio piece.
2. Identity: data-ownership / local-first. Bank-linking (Plaid-shaped) is
   optional, never required.
3. Sync-status / connection-health UI, built ahead of any real provider.
4. Impause-style behavioral features deferred to v1.1.

## What's changed in the market since the last research pass (mid-2026)

Checked tonight, current as of Aug 30, 2026:

1. **Copilot still has no Android app** — confirmed across three
   independent 2026 sources. But: Copilot's own Series A announcement
   explicitly earmarks the raise for "Web and Android efforts." That's a
   stated intent with money behind it, not vaporware speculation anymore.
   **Read on this: the Android wedge is real today, but it has a clock on
   it now that it didn't clearly have before.** Shipping Android at parity
   isn't a "someday" advantage — it's a window that a well-funded
   competitor is actively working to close. Doesn't change the plan, raises
   the priority of actually finishing polish work rather than treating
   "we're on Android" as sufficient by itself.
2. **Rocket Money shipped "Rowan" five days ago (Aug 25, 2026)** — an
   agentic AI financial assistant (built with Anthropic) that doesn't just
   analyze, it *acts*: cancels subscriptions, renegotiates bills, sets up
   automated savings rules, all via a text-message conversation loop. This
   is a meaningfully different product category than Copilot's
   categorization AI — it's the "agent with your bank credentials and your
   permission to act" pattern, and Rocket Money isn't alone: ChatGPT
   shipped a read-only Plaid-connected personal-finance surface earlier in
   2026 with 200M+ people already asking it money questions before that
   existed. **This is the most important new signal.** The frontier of the
   category is visibly moving from "dashboard that shows me things" toward
   "agent that watches and nudges (or acts) for me." Lava Finance should
   not try to out-build Rowan's action-taking (that requires being a
   licensed, trusted financial actor with real bank credentials, real
   liability, and a real AI-agent-with-your-money trust bar Lava Finance
   has no basis to clear right now) — but the *shape* of the win, "surface
   an opportunity before I have to go looking for it," is buildable today
   without any agent, any LLM call, or any bank action. That's what
   tonight's "Insights" build (below) is actually for: get the *value* of
   the trend (proactive surfacing) without the *risk* (an agent that moves
   money).
3. **The local-first/privacy-first finance niche is bigger and more
   active than last time's research surfaced** — SenticMoney, Actual
   Budget (self-hosted), Securo, Picsou, BudgetVault, and others all
   explicitly compete on "no Plaid, your data never leaves your device," as
   an established, named category now, not a fringe idea one or two apps
   are trying. **This both validates and complicates the data-ownership
   bet:** validates it (real demand, real competitors making a living on
   it), complicates it (it's not an empty position anymore — it's a
   crowded one, just a different crowd than Copilot/Monarch compete in).
   Looking at those competitors' actual execution: they're almost all
   utilitarian-looking (self-hosted dashboards, spreadsheet-adjacent UI,
   aimed at a technical/homelab audience). **None of them are also
   design-forward, Copilot-tier polish.** That's still the actual gap:
   not "local-first" alone (taken), not "beautiful" alone (taken by
   Copilot/Monarch, and Plaid-required), but the specific combination of
   both plus real Android parity. That combination remains unclaimed.

## Net read: does anything get reversed?

No. If anything, the local-first research argues for leaning in *harder* on
manual/local as a first-class experience (already true) and for being
honest that "local-first" by itself won't be the headline for long — it has
to be paired with the design bar, or Lava Finance just becomes "one of the
utilitarian local-first apps," which is a smaller, less differentiated
market than "the good-looking finance app that also respects your data and
works on your Android phone."

The Rowan news is the one thing that changes near-term prioritization: it
raises the value of shipping *some* proactive-surfacing feature soon (an
"Insights" pass over recurring charges — cheap, no AI required, ships
tonight) over waiting for a "real" AI feature later. It does **not** argue
for building a chat/agent interface now — that's a multi-quarter trust and
regulatory investment for an established fintech, not a good use of a solo
beta's next work session.

## Adjustments to the roadmap (executing on these tonight, where marked)

- **[Tonight]** Ship a lightweight, non-AI "Insights" surface: detected
  recurring charges, a running subscriptions total, and simple flags (e.g.
  "still charging you, matched no purchase-adjacent category in 60+ days"
  style heuristics) — the *proactive surfacing* value of the Rowan/ChatGPT
  trend, without an agent, an LLM call, or any bank-action capability Lava
  Finance has no business attempting yet.
- **[Tonight]** Recurring-series detection needs to actually be a
  *detection* pass over real transaction data (merchant + amount tolerance
  + interval clustering), not baked into the mock generator's own
  templates. This was already flagged as a known gap in
  `docs/ARCHITECTURE.md`; it's now also a prerequisite for the Insights
  feature above, and for manual/CSV-imported accounts to ever show
  recurring charges at all (today only generator-linked accounts do).
- **[Tonight]** Rules-based categorization with visible "why" (e.g.
  "categorized as Dining because 'CHIPOTLE' matched a known merchant") —
  this was already the explicit "don't try to out-AI Copilot, but do this
  instead" recommendation from the Copilot competitive analysis, and it's
  also the direct fix for the current real gap where CSV-imported and
  many manual transactions land in a generic bucket with no explanation.
- **[Tonight]** Custom categories — unblocks the categorizer (a rule can
  now point at a category the user actually created) and closes a
  known limitation that had no dependency on any product decision I'd
  need you for.
- **[Tonight]** Real app icon/splash — still flagged two nights running as
  "the most visible unfinished signal," now actually fixed instead of
  carried forward a third time.
- **[Unchanged, still v1.1+, still needs your input before building]**:
  actual Impause-style spend-pause interaction design (what triggers it,
  what it looks/feels like, whether it should be able to be dismissed
  permanently per-category) — a real UX decision, not something to
  unilaterally invent at 5am. Tonight's Insights feature covers the
  "proactive surfacing" value without needing that decision made yet.
- **[New, explicitly not doing tonight, flagging for you]**: whether Lava
  Finance ever wants a "connect a real bank" step (Plaid or a
  SimpleFIN-style read-only aggregator, which multiple 2026 privacy-focused
  competitors use specifically *because* it's a lighter-trust, read-only
  open protocol vs. Plaid) is still the single biggest undecided fork in
  the whole roadmap, and tonight's research didn't resolve it — it just
  raised the stakes on deciding deliberately rather than by default. See
  "Open questions" at the bottom of `docs/HANDOFF.md`.

## What tonight's build session covers, concretely

See `docs/HANDOFF.md` for the "what actually shipped" writeup once done;
this doc is the reasoning, that doc is the receipt. Build order: app icon →
custom categories → recurring detection → rules-based categorizer → Insights
surface → verify/docs/commit.
