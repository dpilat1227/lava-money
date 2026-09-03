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

## Note

None of the above should be pulled into the current plan unless Drew asks -- purely a reference list for "next time," so good ideas from these screenshots don't get lost.
