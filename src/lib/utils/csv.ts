/**
 * Minimal CSV parser for transaction import -- no dependency, because the
 * format we need to support is narrow (bank/card export CSVs: one header
 * row, comma-separated, optionally quoted fields with embedded commas).
 * Deliberately not a general-purpose CSV/RFC4180 implementation.
 */

export interface ParsedTransactionRow {
  date: string; // ISO yyyy-mm-dd
  merchantName: string;
  amount: number; // negative = spend, positive = income (Lava Finance convention)
}

export interface CsvImportResult {
  rows: ParsedTransactionRow[];
  skipped: number;
  /** Human-readable reasons a row was skipped, capped to a handful so the
   * preview UI doesn't turn into a wall of text on a badly-formed file. */
  warnings: string[];
}

/** Splits one CSV line into fields, honoring double-quoted fields that may
 * contain commas or escaped `""` quotes. */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields.map(f => f.trim());
}

const DATE_HEADER_HINTS = ['date', 'transaction date', 'posted date', 'posting date'];
const MERCHANT_HEADER_HINTS = ['merchant', 'description', 'name', 'payee', 'transaction', 'details'];
const AMOUNT_HEADER_HINTS = ['amount', 'value'];
const DEBIT_HEADER_HINTS = ['debit', 'withdrawal', 'money out', 'charge'];
const CREDIT_HEADER_HINTS = ['credit', 'deposit', 'money in', 'payment'];

function findColumn(headers: string[], hints: string[]): number {
  const lower = headers.map(h => h.toLowerCase());
  for (const hint of hints) {
    const idx = lower.findIndex(h => h === hint);
    if (idx !== -1) return idx;
  }
  for (const hint of hints) {
    const idx = lower.findIndex(h => h.includes(hint));
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseAmount(raw: string): number | null {
  if (!raw) return null;
  let s = raw.trim();
  if (!s) return null;
  const isParenNegative = /^\(.*\)$/.test(s);
  s = s.replace(/[()$,]/g, '').trim();
  if (!s) return null;
  const n = Number(s);
  if (Number.isNaN(n)) return null;
  return isParenNegative ? -Math.abs(n) : n;
}

function parseDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  // yyyy-mm-dd already
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // mm/dd/yyyy or m/d/yy — the common bank-export format
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    const [, m, d, y] = slash;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

/**
 * Parses raw CSV text into transaction rows, auto-detecting common bank
 * export layouts: a single signed "Amount" column, or separate
 * "Debit"/"Credit" columns (Debit is treated as spend, i.e. negated).
 * Rows that don't parse cleanly are skipped and counted rather than
 * aborting the whole import over one bad line.
 */
export function parseTransactionsCsv(text: string): CsvImportResult {
  const lines = text.split(/\r\n|\n|\r/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { rows: [], skipped: 0, warnings: ['The file is empty.'] };

  const headers = splitCsvLine(lines[0]);
  const dateCol = findColumn(headers, DATE_HEADER_HINTS);
  const merchantCol = findColumn(headers, MERCHANT_HEADER_HINTS);
  const amountCol = findColumn(headers, AMOUNT_HEADER_HINTS);
  const debitCol = findColumn(headers, DEBIT_HEADER_HINTS);
  const creditCol = findColumn(headers, CREDIT_HEADER_HINTS);

  const warnings: string[] = [];
  if (dateCol === -1) warnings.push('No date column found — expected a header like "Date".');
  if (merchantCol === -1) warnings.push('No merchant/description column found.');
  if (amountCol === -1 && debitCol === -1 && creditCol === -1) {
    warnings.push('No amount, debit, or credit column found.');
  }
  if (dateCol === -1 || merchantCol === -1 || (amountCol === -1 && debitCol === -1 && creditCol === -1)) {
    return { rows: [], skipped: lines.length - 1, warnings };
  }

  const rows: ParsedTransactionRow[] = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const fields = splitCsvLine(lines[i]);
    const date = parseDate(fields[dateCol] ?? '');
    const merchantName = (fields[merchantCol] ?? '').trim();

    let amount: number | null = null;
    if (amountCol !== -1) {
      amount = parseAmount(fields[amountCol] ?? '');
    } else {
      const debit = debitCol !== -1 ? parseAmount(fields[debitCol] ?? '') : null;
      const credit = creditCol !== -1 ? parseAmount(fields[creditCol] ?? '') : null;
      if (debit !== null && debit !== 0) amount = -Math.abs(debit);
      else if (credit !== null && credit !== 0) amount = Math.abs(credit);
    }

    if (!date || !merchantName || amount === null) {
      skipped++;
      continue;
    }
    rows.push({ date, merchantName, amount: Math.round(amount * 100) / 100 });
  }

  if (skipped > 0) {
    warnings.push(`Skipped ${skipped} row${skipped === 1 ? '' : 's'} that couldn't be read.`);
  }

  return { rows, skipped, warnings };
}

/** Serializes transactions back out to CSV text for the export feature --
 * the mirror image of the importer, and deliberately matches its own
 * column names so a round trip (export, re-import elsewhere) works. */
export function transactionsToCsv(
  rows: { date: string; merchantName: string; amount: number; categoryName: string; accountName: string }[]
): string {
  const escape = (v: string) => (v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v);
  const header = 'Date,Merchant,Amount,Category,Account';
  const lines = rows.map(r =>
    [r.date, escape(r.merchantName), r.amount.toFixed(2), escape(r.categoryName), escape(r.accountName)].join(',')
  );
  return [header, ...lines].join('\n');
}
