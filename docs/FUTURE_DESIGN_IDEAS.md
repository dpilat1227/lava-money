# Future design ideas (parking lot)

Not part of the current redesign pass (see the active plan for that scope). This is a running list of specific visual ideas from screenshots Drew has sent, to revisit if we're not happy with how the current update lands, or whenever we next do a design pass. Each entry names the concrete idea and where it'd apply -- not "look at app X" in general.

## Draft "Home v2 / v3" screens

Drew's suggestion: instead of debating in the abstract, build 1-2 actual alternate Home screens as drafts (`HomeV2`, `HomeV3` or similar -- not wired into the real tab, just reachable for comparison) so we can look at real screens side by side instead of imagining them. Good container for trying the ideas below without disturbing the shipped Home.

## Ramp -- subtabs within a page

Screenshot: Ramp's "Cash & Treasury" page has a row of subtabs directly under the page title -- `Overview | Forecast (New) | Automations | Documents` -- rather than cramming everything into one scroll.

Where this could help us: if any of our tabs get too busy as we add features (Trends combining spend + recurring + category views is the most likely candidate, or an Account detail page growing Overview/Activity/Documents), a subtab row like this is a clean way to split it up instead of stacking more cards vertically. Worth revisiting if the "fold the donut into the hero as a tab" idea in the current plan doesn't feel like enough room.

## Robinhood -- chart toggle (line vs. bar/allocation view)

Robinhood's portfolio overview lets you toggle the hero chart between a line chart (performance over time) and a bar/allocation view (holdings breakdown, e.g. "100% cash" shown as a single bar). Two small icon buttons top-right of the chart switch between them.

Where this could help us: net worth hero (Home / dashboard) or an investment-account detail page -- toggle between "net worth over time" (line) and "breakdown by account type" (bar), instead of only ever showing the line chart.

## Robinhood -- investment account list with mini sparklines

Marketing screenshot shows a list of individual stock holdings, each row with name, a tiny inline sparkline, and current value. If we ever show a breakdown of linked investment accounts/holdings (not just one lump balance), this row pattern -- name + mini chart + value, all in one compact row -- is worth reusing instead of a plain text list.

## Robinhood Wallet -- glowing ambient chart background

Robinhood Wallet's dark-mode hero: big balance number uncontained above a full-width line chart, and behind the chart line sits a soft, blurred multi-color glow (green -> blue -> purple gradient blob) that looks like it subtly animates/shifts. The number and chart otherwise sit directly on black, no card.

Where this could help us: this is a fancier version of the "number floats, chart bleeds into background" treatment already in the current plan (Brex-inspired). The glow-behind-the-line detail specifically is a nice-to-have polish pass for the net worth hero (Home/dashboard) once the plainer full-bleed version ships -- could tie the glow color to trend direction (green glow when up, could still use our orange/ember palette instead of literally copying Robinhood's green/purple).

## Robinhood -- dark splash/intro screen

Robinhood's app intro is just their logo mark on a plain black screen. Worth checking what Lava Money's current splash screen looks like and whether a similarly minimal dark screen (flame mark on black, no wordmark/tagline) reads cleaner than whatever we have now.

## Robinhood / Cash App / Coinbase / Acorns -- App Store listing screenshots

Several screenshots sent are literally App Store marketing screenshot sets (Robinhood's vibrant green "Trade on your terms / Start with $1 / Own your crypto" set, Cash App's set, Coinbase's, Acorns'). These are good reference for our own `docs/app-store-listing.md` screenshot set whenever we produce final App Store Connect marketing images -- vibrant flat-color backgrounds, one big claim per slide, a single clean device mockup, not a busy collage.

## Cash App -- Savings tab (ring + icon + goal)

Cash App's Savings screen: big circular progress ring (green), a custom colorful icon centered inside the ring (a little illustrated plant/palm icon, not a generic glyph), big dollar amount below the icon, "Savings balance" label, then "$X to goal" as a secondary line, with Transfer in / Transfer out pill buttons underneath, and plain list rows below ("Set a goal", "Save automatically") with chevrons.

Where this could help us: if/when we add savings goals to Budgets or a dedicated goals feature, this ring + custom icon + big number + short list-of-settings-rows pattern is a strong template -- warmer and more "designed" than a plain progress bar.

## Cash App -- flat vibrant color-block screens

Cash App's own marketing screenshots use full-bleed flat color blocks (bright green, black) per feature rather than dark cards on a neutral background. Not proposing we go this bright, but the "one flat saturated background per screen/section, big confident white text" idea could inform a future onboarding or marketing-carousel pass.

## Signature visual device ("most outstanding/unique/memorable" gap)

Flagged during the Ember philosophy discussion (design-audit-round-4): consistency + correctness gets us to "as good as Copilot," not "more distinctive than Copilot." Today "Ember" mostly means orange accent + dark background -- a palette, copyable in an afternoon, not a signature. Concrete direction worth prototyping: make the ember/warmth metaphor an actual **data encoding**, not decoration -- e.g. an account or category that's heating up (spending velocity increasing, a bill about to lapse) genuinely glows hotter, one consistent rule applied everywhere it appears, not an illustration bolted onto one hero screen. Agreed approach: ship the current consistency/correctness pass first, then give this its own dedicated follow-up plan -- likely prototyped in a separate "labs" git branch + Expo dev-client preview channel so wild experiments never risk the shipping build, cherry-picking winners back into `main`.

## Copilot gap-closing ideas (from another agent's review, Sep 4)

Sent to discuss after the current update ships -- captured here so they're not lost. Five ideas: (1) an actionable "To Review" loop at the top of Home (frictionless swipe/tap to confirm-or-recategorize newly-synced transactions, shifting Home from passive reporting toward active daily tasks); (2) a modular/reorderable dashboard (user-configurable section order -- e.g. pin Budgets or Upcoming above the net worth chart -- stored in local JSON, framed as fitting the local-first/power-user ethos); (3) more expressive category iconography/gestalt (circular progress rings for top-level budget health + color-coded left accent lines on category rows, breaking up uniform dark card blocks); (4) a dedicated Recurring timeline styled as a monthly calendar checklist (explicit dates with paid/unpaid checkmarks, not just a sorted list); (5) leaning harder into local-first as a marketed feature (a visible "local processing" indicator/insight, positioning Lava as "the sovereign, privacy-first evolution of Copilot" rather than just an alternative).

## AI leverage ideas (from another agent, Sep 4)

Also sent to discuss after the current update ships. Five ideas, all framed around on-device/local inference to stay consistent with the local-first positioning: (1) on-device semantic transaction enrichment -- a small local model (MLX/ONNX-style quantized on-device inference) cleaning up cryptic merchant strings ("SQ *LOCALCAFE") into real names + accurate categories, no cloud call; (2) behavioral baseline anomaly detection -- alert on a category deviating sharply from *that user's own* rolling average, not just a static monthly cap; (3) a natural-language local query engine -- a search bar answering things like "how much did I spend on travel last quarter" directly against local storage, zero network round-trip; (4) predictive cash-flow runway -- model upcoming recurring bills + historical variance into a "safe to spend today" number and a runway estimate, instead of only backward-looking charts; (5) marketing angle -- position local-first as an explicit anti-cloud wedge against Copilot/Monarch ("zero-trust financial sovereignty"), not just a footnote feature.

## Note

None of the above should be pulled into the current plan unless Drew asks -- purely a reference list for "next time," so good ideas from these screenshots don't get lost.
