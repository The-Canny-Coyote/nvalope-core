/**
 * Budget data types for Nvalope. All data stays on-device (localStorage).
 */

import { budgetStateSchema, budgetValidationErrorMessage } from './budgetSchema';

export interface Envelope {
  id: string;
  name: string;
  limit: number; // monthly limit in dollars
  spent: number;
}

export interface Transaction {
  id: string;
  amount: number;
  /** Envelope (category) for this transaction. Omitted when uncategorized (e.g. receipt saved before envelopes exist). */
  envelopeId?: string;
  description: string;
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO string for ordering
  /** Optional metadata from bank statement import (backward compatible when absent). */
  importHash?: string;
  importSourceFile?: string;
  importConfidence?: number;
  payeeNormalized?: string;
  matchedReceiptId?: string;
}

export interface IncomeEntry {
  id: string;
  amount: number;
  source: string;
  date: string;
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string;
  monthlyContribution: number;
  currentAmount: number;
  createdAt: string;
}

/** Bill due date: optional amount and envelope; can repeat monthly. */
export interface BillDueDate {
  id: string;
  name: string;
  amount?: number; // optional reminder amount
  dueDate: string; // YYYY-MM-DD
  repeatMonthly?: boolean; // show on this day of every month
  envelopeId?: string; // optional link to envelope
}

/** Calendar view event: transaction, income, or bill for a given date. */
export type CalendarEvent =
  | { type: 'transaction'; id: string; date: string; amount: number; description: string; envelopeId?: string; envelopeName: string }
  | { type: 'income'; id: string; date: string; amount: number; source: string }
  | { type: 'bill'; id: string; billId: string; date: string; name: string; amount?: number; envelopeId?: string };

export interface BudgetState {
  envelopes: Envelope[];
  transactions: Transaction[];
  income: IncomeEntry[];
  savingsGoals: SavingsGoal[];
  bills: BillDueDate[];
}

export const BUDGET_STORAGE_KEY = 'nvalope-budget';

/** Default envelopes for new users (empty — all screens start with no data). */
export const DEFAULT_ENVELOPES: Envelope[] = [];

/** Backup file may include export metadata */
export interface BudgetBackup {
  exportDate?: string;
  version?: number;
  data: BudgetState;
}

// ─── Multi-budget backup format (version 4) ──────────────────────────────────

/** Minimal budget metadata stored inside a multi-budget backup file. Matches BudgetMeta shape. */
export interface BackupBudgetMeta {
  id: string;
  name: string;
  createdAt: string;
  lastModifiedAt: string;
}

export interface MultiBudgetBackupEntry {
  meta: BackupBudgetMeta;
  state: BudgetState;
}

/**
 * Multi-budget export format (version 4). Contains all budgets with their metadata.
 * Included in auto-backup when
 * more than one budget exists.
 */
export interface MultiBudgetBackup {
  format: 'multi-budget';
  version: 4;
  exportDate?: string;
  budgets: MultiBudgetBackupEntry[];
}

/** Type guard — returns true when raw looks like a multi-budget backup file. */
export function isMultiBudgetBackup(raw: unknown): raw is MultiBudgetBackup {
  if (!raw || typeof raw !== 'object') return false;
  const obj = raw as Record<string, unknown>;
  return obj.format === 'multi-budget' && Array.isArray(obj.budgets);
}

/**
 * Validate and parse a multi-budget backup file.
 * Returns an array of validated `MultiBudgetBackupEntry` objects.
 * Throws a user-facing error string if any entry is invalid.
 */
export function parseMultiBudgetBackup(raw: unknown): MultiBudgetBackupEntry[] {
  if (!isMultiBudgetBackup(raw)) {
    throw new Error('Not a multi-budget backup file.');
  }
  if (raw.budgets.length === 0) {
    throw new Error('This multi-budget backup file contains no budgets.');
  }
  // Cast to unknown[] for defensive runtime validation — entries may be malformed in user-provided JSON
  const rawBudgets = raw.budgets as unknown as unknown[];
  return rawBudgets.map((rawEntry, i) => {
    if (!rawEntry || typeof rawEntry !== 'object') {
      throw new Error(`Budget entry ${i + 1} is malformed.`);
    }
    const e = rawEntry as Record<string, unknown>;
    if (!e.meta || typeof e.meta !== 'object') {
      throw new Error(`Budget entry ${i + 1} is missing metadata.`);
    }
    const meta = e.meta as Record<string, unknown>;
    if (typeof meta.id !== 'string' || !meta.id) {
      throw new Error(`Budget entry ${i + 1} has an invalid ID.`);
    }
    if (typeof meta.name !== 'string') {
      throw new Error(`Budget entry ${i + 1} has an invalid name.`);
    }
    // Validate the state using the same path as single-budget import
    const state = parseBudgetBackup({ data: e.state });
    return {
      meta: {
        id: meta.id,
        name: meta.name,
        createdAt: typeof meta.createdAt === 'string' ? meta.createdAt : new Date().toISOString(),
        lastModifiedAt: typeof meta.lastModifiedAt === 'string' ? meta.lastModifiedAt : new Date().toISOString(),
      },
      state,
    };
  });
}

/**
 * Validates parsed JSON as BudgetState (or BudgetBackup with data). Throws with a message if invalid.
 * Uses Zod for exhaustive validation when possible; falls back to manual checks for older runtimes.
 */
export function parseBudgetBackup(raw: unknown): BudgetState {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid backup: not an object.');
  }
  const obj = raw as Record<string, unknown>;
  let data: unknown = obj;
  if ('budget' in obj && obj.budget && typeof obj.budget === 'object') {
    data = obj.budget as Record<string, unknown>;
  } else if ('data' in obj && obj.data && typeof obj.data === 'object') {
    data = obj.data as Record<string, unknown>;
  }

  const parsed = budgetStateSchema.safeParse({
    ...(data as Record<string, unknown>),
    bills: Array.isArray((data as Record<string, unknown>).bills)
      ? (data as Record<string, unknown>).bills
      : [],
  });
  if (parsed.success) {
    return parsed.data as BudgetState;
  }
  throw new Error(budgetValidationErrorMessage(parsed.error));
}
