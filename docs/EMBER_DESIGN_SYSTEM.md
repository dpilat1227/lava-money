# Ember — Lava Money's design philosophy

This is the rulebook, not a token dump. `src/constants/theme.ts` already has good, specific doc comments on *what* each token is (`Elevation`, `AccentUsage`, `Colors`) — this doc is the layer above that: *why* those rules exist, stated once so the next component someone builds can be checked against a written standard instead of a feeling. It exists because the same class of bug kept recurring even after being fixed once (see "Numbers are typography too" below for the concrete example) — a one-off patch doesn't stick without a rule behind it.

Written after actual research into design methodology, not from vibes: Tufte/Few's data-ink ratio and chartjunk theory, Apple's 2026 "Principles of Great Design," Pentagram's shift from "design a logo" to "design the rules that generate a logo's behavior," the standard 3-tier design-token architecture (primitive → semantic → component), and Copilot Money's own documented history of retrofitting a design system after growing without one — the exact moment Lava Money is in right now.

Intended to outlive this one app. When LavaMesh or LavaNotes need their own pass, the tenets below should transfer even though the components won't.

---

## The six tenets

### 1. Show the real number, organized — don't hide it

2026 fintech design swung back toward data density after a decade of hiding numbers behind whitespace out of fear of overwhelming people — see the "rehabilitation of data density" research. People who manage money want to see it; the craft is typographic hierarchy and grouping, not deletion. **When a screen feels cluttered, the fix is almost never "remove data" — it's "which one number is the hero, and which are supporting detail."** `CashFlowCard`'s rebuild (five equal-weight text rows → one hero stat + one demoted line + a chart) is the reference example.

### 2. Color is a signal, not decoration — and one color means one thing everywhere

Few: color should be used sparingly enough that red only ever means "needs attention" — the instant it's used decoratively anywhere, it stops working as a signal everywhere. `AccentUsage` in `theme.ts` already codifies this for orange. Extending it to the full palette:

| Color | Means | Never used for |
|---|---|---|
| Orange | Brand identity, the single primary action, the one hero metric, active/selected state | Ambient decoration, default/resting state of anything not selected |
| Green | Good / under budget / asset / income / on-track | A regular category's default color |
| Red | Bad / over budget / liability-side emphasis / a broken connection | A regular category's default color |
| Amber | Caution / near a threshold / due soon | Anything without a real threshold behind it |
| Grey (`text3`/`text4`) | Genuinely inert, secondary information | The only color on a screen that has real status to convey |

A chart's status-color logic being internally consistent isn't enough on its own — see `SpendCeilingChart`'s new legend (`LegendDot` row, only rendered when `colorMode="status"` is actually active). **If a color-coded element ships without a legend or an obvious key, that's a gap, not a nice-to-have.**

### 3. Every element must earn its place; every tappable element must look tappable

Apple's 2026 Simplicity principle: *"not minimalism — every element earns its place, and sometimes adding context makes an interface simpler."* Paired with the basic affordance/signifier rule: an interactive element has to visibly look interactive, or people won't find it. `BudgetHero`'s tap target being a 13px `(i)` icon next to a hero-sized static-looking number is the canonical violation — fixed by making the whole region visibly tappable, not by shrinking the number.

### 4. One elevation grammar, applied by rule, not by feel

`theme.ts`'s `Elevation` (`flat`/`resting`/`raised`/`glass`) already exists — the rule this tenet adds is *when* each applies, so a screen doesn't accidentally mix three different visual weights with no stated reason (Home's hero → bare stat tiles → boxed `SpendingCard` was exactly this before the round-3 pass):

- **Full-bleed, no card**: the one hero number+chart per screen, maximum one per screen. Never two "loudest" elements competing.
- **`resting`**: secondary single-purpose cards that aren't a list and aren't the hero (`SpendingCard`, `CashFlowCard`, `NeedsAttentionCard`).
- **No card, row dividers only**: list-shaped groupings (Settings sections, Accounts, `BudgetList`) — a repeated card per row reads as "card soup," not a coherent list.
- **`glass`**: anything presented *above* the whole screen (modals, sheets) — never used for in-page content.

### 5. The system is the brand — tokens over screens

Pentagram's own account of their shift: the old model designed a fixed logo; the current model designs *the rule that generates* a logo's behavior across contexts nobody fully predicted in advance. Applied here: `theme.ts` is already informally tiered (primitives like `Colors.orange` → semantic-ish tokens like `surfaceCardRaised` → component-specific values), which matches the industry-standard primitive → semantic → component structure. **Future direction, not in scope for this pass:** once Ember is proven out in this app, extract the primitive+semantic tiers into a shared package (`@lava/ember` or similar) that LavaMesh and LavaNotes both consume, so a rebrand decision changes one file instead of three apps independently drifting.

### 6. Numbers are typography too

Copilot treats its hero figures as "architecture" — scale and weight do real communicative work, and every peer number on a screen should follow one precision rule, not a per-call-site judgment. **The concrete rule** (implemented in `src/lib/utils/currency.ts`'s `formatCurrency`):

- **Hero numbers & individual transaction amounts** → full precision, cents, always. (`formatCurrency(value)`, the default — unchanged from before this doc existed.)
- **Secondary stats & chart labels, once big enough to abbreviate** → `compact: true` (`$4.4k`) once `abs >= 1000`.
- **Derived aggregates under $1,000** (averages, rates — anything that's already an approximation, so cent-level precision is false confidence) → `precision: 'whole'` (`$254`, no cents, and *not* `compact` — that flag is silently a no-op below $1,000, which is exactly how Category Detail's "$2.3k Total spent" ended up next to "$254.12 Average per month" as mismatched peers).

Concretely, for any new aggregate under $1,000: `Math.abs(value) >= 1000 ? formatCurrency(value, { compact: true }) : formatCurrency(value, { precision: 'whole' })` — see `formatAggregate` in `src/app/category/[id].tsx` for the reference implementation.

---

## Why this doc exists, in one sentence

Every "inconsistency" found in the design-audit-round-4 pass had the same shape: a decision made once, locally, with no rule for the next component to check itself against. This is that rule, written down once instead of re-derived per screen.
