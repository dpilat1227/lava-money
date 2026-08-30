/**
 * Rules-based merchant categorizer -- the deliberate, explainable
 * alternative to Copilot Money's "black box" AI categorization (see
 * `docs/competitive-analysis-copilot.md`: their AI is a genuine strength,
 * but nobody can tell you *why* it picked a category, and it occasionally
 * gets it confidently wrong with no recourse). Every guess here traces back
 * to a specific rule, and that rule is exactly what gets shown in the UI --
 * "matched known merchant" or "matched keyword," never "trust me."
 *
 * Used in two places: CSV import (`FinanceContext`'s `IMPORT_TRANSACTIONS`)
 * categorizes rows as they come in, and the "Review suggestions" screen
 * (`app/review-categories.tsx`) re-runs this over already-imported/manual
 * transactions still sitting in the generic "Other" bucket to offer a
 * better guess after the fact.
 */
import type { CategoryGroup, Transaction } from '@/lib/types';

export type CategorizeConfidence = 'high' | 'medium' | 'low';

export interface CategorizeResult {
  categoryId: string;
  confidence: CategorizeConfidence;
  reason: string;
}

/** Exact merchant-name matches -- case-insensitive, matched after light
 * normalization. Covers the fictional merchants the mock generator invents
 * (real brand names on purpose, see `lib/mock/institutions.ts`'s note on
 * not faking real *banks*) and enough common real-world merchant strings
 * that a real bank CSV export has a decent shot at matching too. */
const MERCHANT_RULES: Record<string, string> = {
  // Groceries
  "trader joe's": 'groceries',
  'trader joes': 'groceries',
  'whole foods': 'groceries',
  'whole foods market': 'groceries',
  safeway: 'groceries',
  kroger: 'groceries',
  'costco wholesale': 'groceries',
  costco: 'groceries',
  walmart: 'groceries',
  'walmart supercenter': 'groceries',
  aldi: 'groceries',
  publix: 'groceries',
  'sprouts farmers market': 'groceries',

  // Dining
  'blue bottle coffee': 'dining',
  chipotle: 'dining',
  sweetgreen: 'dining',
  'local pizza co': 'dining',
  'thai basil': 'dining',
  'corner deli': 'dining',
  starbucks: 'dining',
  'starbucks coffee': 'dining',
  mcdonalds: 'dining',
  "mcdonald's": 'dining',
  'doordash': 'dining',
  grubhub: 'dining',
  'uber eats': 'dining',

  // Transport
  uber: 'transport',
  lyft: 'transport',
  'shell gas': 'transport',
  shell: 'transport',
  chevron: 'transport',
  exxon: 'transport',
  exxonmobil: 'transport',
  'city transit card': 'transport',

  // Shopping
  amazon: 'shopping',
  'amazon.com': 'shopping',
  target: 'shopping',
  'nike.com': 'shopping',
  nike: 'shopping',
  ikea: 'shopping',
  'best buy': 'shopping',
  etsy: 'shopping',

  // Entertainment
  'amc theatres': 'entertainment',
  amc: 'entertainment',
  steam: 'entertainment',
  ticketmaster: 'entertainment',
  'spotify concerts': 'entertainment',

  // Personal care
  'great clips': 'personal_care',
  sephora: 'personal_care',
  'local spa': 'personal_care',
  ulta: 'personal_care',

  // Health
  'cvs pharmacy': 'health',
  cvs: 'health',
  walgreens: 'health',
  'urgent care copay': 'health',
  'dental associates': 'health',
  'equinox fitness': 'health',
  equinox: 'health',
  planetfitness: 'health',
  'planet fitness': 'health',

  // Travel
  'united airlines': 'travel',
  airbnb: 'travel',
  'marriott hotels': 'travel',
  marriott: 'travel',
  'delta air lines': 'travel',
  delta: 'travel',
  expedia: 'travel',

  // Housing
  'skyline apartments': 'housing',

  // Utilities
  'pacific power & light': 'utilities',
  'metro fiber internet': 'utilities',
  'wireless carrier': 'utilities',
  comcast: 'utilities',
  xfinity: 'utilities',
  'at&t': 'utilities',
  verizon: 'utilities',
  't-mobile': 'utilities',

  // Subscriptions
  netflix: 'subscriptions',
  'spotify premium': 'subscriptions',
  spotify: 'subscriptions',
  'icloud+': 'subscriptions',
  icloud: 'subscriptions',
  'the new york times': 'subscriptions',
  nytimes: 'subscriptions',
  'notion plus': 'subscriptions',
  notion: 'subscriptions',
  hulu: 'subscriptions',
  'adobe creative cloud': 'subscriptions',
  adobe: 'subscriptions',
  'disney+': 'subscriptions',
  'apple.com/bill': 'subscriptions',
  'amazon prime': 'subscriptions',
  'youtube premium': 'subscriptions',

  // Income
  'employer payroll': 'income',
  'client payment': 'income',
  'year-end bonus': 'income',

  // Fees
  'interest charge': 'fees',
};

/** Substring rules, checked against the merchant name AND raw description
 * (banks often put the useful signal -- "PHARMACY," "GYM" -- in the raw
 * description rather than a clean merchant name). Checked only when no
 * exact merchant match was found, in the order listed -- first match wins,
 * so more specific keywords are listed before more generic ones that might
 * otherwise shadow them (e.g. "market" before a hypothetical generic
 * "store"). */
const KEYWORD_RULES: { keyword: string; categoryId: string }[] = [
  { keyword: 'pharmacy', categoryId: 'health' },
  { keyword: 'urgent care', categoryId: 'health' },
  { keyword: 'dental', categoryId: 'health' },
  { keyword: 'medical', categoryId: 'health' },
  { keyword: 'fitness', categoryId: 'health' },
  { keyword: 'gym', categoryId: 'health' },

  { keyword: 'grocery', categoryId: 'groceries' },
  { keyword: 'groceries', categoryId: 'groceries' },
  { keyword: 'supermarket', categoryId: 'groceries' },
  { keyword: 'market', categoryId: 'groceries' },

  { keyword: 'restaurant', categoryId: 'dining' },
  { keyword: 'coffee', categoryId: 'dining' },
  { keyword: 'cafe', categoryId: 'dining' },
  { keyword: 'diner', categoryId: 'dining' },

  { keyword: 'airline', categoryId: 'travel' },
  { keyword: 'airlines', categoryId: 'travel' },
  { keyword: 'hotel', categoryId: 'travel' },
  { keyword: 'resort', categoryId: 'travel' },

  { keyword: 'apartment', categoryId: 'housing' },
  { keyword: 'property mgmt', categoryId: 'housing' },
  { keyword: 'property management', categoryId: 'housing' },
  { keyword: 'rent', categoryId: 'housing' },

  { keyword: 'electric', categoryId: 'utilities' },
  { keyword: 'power co', categoryId: 'utilities' },
  { keyword: 'water dept', categoryId: 'utilities' },
  { keyword: 'internet', categoryId: 'utilities' },
  { keyword: 'wireless', categoryId: 'utilities' },
  { keyword: 'cable', categoryId: 'utilities' },
  { keyword: 'utility', categoryId: 'utilities' },
  { keyword: 'utilities', categoryId: 'utilities' },

  { keyword: 'gas station', categoryId: 'transport' },
  { keyword: 'fuel', categoryId: 'transport' },
  { keyword: 'parking', categoryId: 'transport' },
  { keyword: 'taxi', categoryId: 'transport' },
  { keyword: 'transit', categoryId: 'transport' },

  { keyword: 'salon', categoryId: 'personal_care' },
  { keyword: 'spa', categoryId: 'personal_care' },
  { keyword: 'barber', categoryId: 'personal_care' },

  { keyword: 'theatre', categoryId: 'entertainment' },
  { keyword: 'theater', categoryId: 'entertainment' },
  { keyword: 'cinema', categoryId: 'entertainment' },
  { keyword: 'concert', categoryId: 'entertainment' },

  { keyword: 'payroll', categoryId: 'income' },
  { keyword: 'direct dep', categoryId: 'income' },
  { keyword: 'salary', categoryId: 'income' },

  { keyword: 'interest charge', categoryId: 'fees' },
  { keyword: 'overdraft', categoryId: 'fees' },
  { keyword: 'atm fee', categoryId: 'fees' },
  { keyword: 'service fee', categoryId: 'fees' },
  { keyword: 'annual fee', categoryId: 'fees' },
];

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Guesses a category for one merchant/amount pair. Always returns
 * *something* (falls back to "other," or "income" for positive amounts) so
 * callers never have to handle a null case -- the `confidence` field is
 * what signals "this is a real guess" vs. "this is just the sign of the
 * amount talking."
 */
export function categorizeMerchant(
  merchantName: string,
  amount: number,
  rawDescription = ''
): CategorizeResult {
  const merchantKey = normalize(merchantName);
  const exact = MERCHANT_RULES[merchantKey];
  if (exact) {
    return { categoryId: exact, confidence: 'high', reason: `Matched known merchant "${merchantName.trim()}"` };
  }

  const haystack = normalize(`${merchantName} ${rawDescription}`);
  for (const rule of KEYWORD_RULES) {
    if (haystack.includes(rule.keyword)) {
      return { categoryId: rule.categoryId, confidence: 'medium', reason: `Matched keyword "${rule.keyword}" in the description` };
    }
  }

  if (amount > 0) {
    return { categoryId: 'income', confidence: 'low', reason: 'Positive amount, no expense pattern matched -- defaulted to Income' };
  }

  return { categoryId: 'other', confidence: 'low', reason: 'No known merchant or keyword matched' };
}

/** Category group a guess belongs to, only used so the "review suggestions"
 * screen can avoid ever suggesting a swap into "transfer" (there's no
 * transfer rule above, but this keeps the invariant explicit if one is
 * added later). */
export function categorizeGroup(categoryId: string): CategoryGroup {
  return categoryId === 'income' ? 'income' : categoryId === 'transfer' ? 'transfer' : 'expense';
}

export interface CategorySuggestion {
  transaction: Transaction;
  result: CategorizeResult;
}

/**
 * Re-runs the categorizer over transactions currently sitting in the
 * generic "Other" bucket -- the review pass this module exists to power.
 * Only surfaces a suggestion when the categorizer would actually pick
 * something *other* than "Other" (re-suggesting the bucket it's already in
 * would be a no-op the user can't do anything useful with), and only
 * considers manual/imported transactions -- linked-account "Other"
 * transactions aren't a case a real product would have (a real bank
 * adapter would categorize at ingestion, same as the CSV import path does
 * here), so including them would just be reviewing this app's own mock
 * data generator, not a workflow a user's real data would encounter.
 */
export function findCategorySuggestions(transactions: Transaction[]): CategorySuggestion[] {
  return transactions
    .filter(t => t.categoryId === 'other' && t.entrySource !== 'linked')
    .map(t => ({ transaction: t, result: categorizeMerchant(t.merchantName, t.amount, t.rawDescription) }))
    .filter(s => s.result.categoryId !== 'other');
}
