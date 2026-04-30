import type { BudgetState } from '@/app/store/budgetTypes';
import { withRetry, isIdbAvailable } from './idb';

export const DB_NAME = 'nvalope-db';
const DB_VERSION = 4;
const STORE_BUDGET = 'budget';
export const STORE_APP_DATA = 'appData';
export const STORE_STATEMENT_TEMPLATES = 'statementTemplates';
export const STORE_ASSIGNMENT_RULES = 'assignmentRules';
export const STORE_BUDGETS = 'budgets';
export const STORE_BUDGETS_META = 'budgetsMeta';

const BUDGET_KEY = 'state';
export const DEFAULT_BUDGET_ID = 'default';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 100;

export type BudgetIdbErrorCode =
  | 'IDB_UNAVAILABLE'
  | 'IDB_OPEN_FAILED'
  | 'IDB_READ_FAILED'
  | 'IDB_WRITE_FAILED'
  | 'IDB_QUOTA_EXCEEDED'
  | 'IDB_BLOCKED'
  | 'VALIDATION_FAILED';

export class BudgetIdbError extends Error {
  constructor(
    message: string,
    public code: BudgetIdbErrorCode,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'BudgetIdbError';
  }
}

export interface BudgetMeta {
  id: string;
  name: string;
  createdAt: string;
  lastModifiedAt: string;
}

export function openDB(): Promise<IDBDatabase> {
  if (!isIdbAvailable()) {
    return Promise.reject(new BudgetIdbError('IndexedDB not available', 'IDB_UNAVAILABLE'));
  }
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => {
      const err = req.error;
      const code: BudgetIdbErrorCode = err?.name === 'QuotaExceededError' ? 'IDB_QUOTA_EXCEEDED' : err?.name === 'BlockedError' ? 'IDB_BLOCKED' : 'IDB_OPEN_FAILED';
      reject(new BudgetIdbError(err?.message ?? 'Failed to open database', code, err));
    };
    req.onsuccess = () => resolve(req.result);
    req.onblocked = () => reject(new BudgetIdbError('Database upgrade blocked (close other tabs)', 'IDB_BLOCKED'));
    req.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = req.result;
      const tx = req.transaction!;
      const oldVersion = event.oldVersion;

      if (!db.objectStoreNames.contains(STORE_BUDGET)) db.createObjectStore(STORE_BUDGET);
      if (!db.objectStoreNames.contains(STORE_APP_DATA)) db.createObjectStore(STORE_APP_DATA);
      if (!db.objectStoreNames.contains(STORE_STATEMENT_TEMPLATES)) {
        db.createObjectStore(STORE_STATEMENT_TEMPLATES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_ASSIGNMENT_RULES)) {
        db.createObjectStore(STORE_ASSIGNMENT_RULES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_BUDGETS)) {
        db.createObjectStore(STORE_BUDGETS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_BUDGETS_META)) {
        db.createObjectStore(STORE_BUDGETS_META, { keyPath: 'id' });
      }

      // Migration: copy existing single-budget data into multi-budget stores
      if (oldVersion > 0 && oldVersion < 4 && db.objectStoreNames.contains(STORE_BUDGET)) {
        const budgetStore = tx.objectStore(STORE_BUDGET);
        const metaStore = tx.objectStore(STORE_BUDGETS_META);
        const budgetsStore = tx.objectStore(STORE_BUDGETS);
        const getReq = budgetStore.get(BUDGET_KEY);
        getReq.onsuccess = () => {
          if (getReq.result) {
            const now = new Date().toISOString();
            const meta: BudgetMeta = { id: DEFAULT_BUDGET_ID, name: 'My Budget', createdAt: now, lastModifiedAt: now };
            metaStore.put(meta);
            budgetsStore.put({ id: DEFAULT_BUDGET_ID, state: getReq.result });
          }
        };
      }
    };
  });
}

function validateState(parsed: unknown): parsed is BudgetState {
  if (!parsed || typeof parsed !== 'object') return false;
  const o = parsed as Record<string, unknown>;
  if (!Array.isArray(o.envelopes) || !Array.isArray(o.transactions)) return false;
  return true;
}

/**
 * Get budget state from IndexedDB only. No migration.
 * Retries up to MAX_RETRIES on transient failures.
 * Returns null if no data or empty DB; throws BudgetIdbError on unrecoverable failure.
 */
export async function getBudget(): Promise<BudgetState | null> {
  try {
    return await withRetry(
      async () => {
        const db = await openDB();
        const state = await new Promise<BudgetState | undefined>((resolve, reject) => {
          const tx = db.transaction(STORE_BUDGET, 'readonly');
          const req = tx.objectStore(STORE_BUDGET).get(BUDGET_KEY);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        db.close();
        if (state && validateState(state)) return state as BudgetState;
        return null;
      },
      {
        maxRetries: MAX_RETRIES,
        delayMs: RETRY_DELAY_MS,
        isRetryable: (e) =>
          !(e instanceof BudgetIdbError && ['IDB_UNAVAILABLE', 'IDB_BLOCKED', 'IDB_QUOTA_EXCEEDED'].includes(e.code)),
      }
    );
  } catch (e) {
    if (e instanceof BudgetIdbError) throw e;
    throw new BudgetIdbError(
      e instanceof Error ? e.message : 'Failed to read budget',
      'IDB_READ_FAILED',
      e
    );
  }
}

/**
 * Save budget state to IndexedDB. Throws BudgetIdbError on failure (e.g. quota exceeded).
 */
export async function setBudget(state: BudgetState): Promise<void> {
  if (!validateState(state)) {
    throw new BudgetIdbError('Invalid budget state', 'VALIDATION_FAILED');
  }
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_BUDGET, 'readwrite');
      tx.objectStore(STORE_BUDGET).put(state, BUDGET_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => {
        const err = tx.error;
        const code: BudgetIdbErrorCode = err?.name === 'QuotaExceededError' ? 'IDB_QUOTA_EXCEEDED' : 'IDB_WRITE_FAILED';
        reject(new BudgetIdbError(err?.message ?? 'Failed to write', code, err));
      };
    });
    db.close();
  } catch (e) {
    if (e instanceof BudgetIdbError) throw e;
    throw new BudgetIdbError(e instanceof Error ? e.message : 'Failed to save budget', 'IDB_WRITE_FAILED', e);
  }
}

// ─── Multi-budget CRUD ────────────────────────────────────────────────────────

/**
 * Load budget state for a specific budget ID.
 * Returns null if not found.
 */
export async function getBudgetById(budgetId: string): Promise<BudgetState | null> {
  try {
    return await withRetry(
      async () => {
        const db = await openDB();
        const record = await new Promise<{ id: string; state: BudgetState } | undefined>((resolve, reject) => {
          const tx = db.transaction(STORE_BUDGETS, 'readonly');
          const req = tx.objectStore(STORE_BUDGETS).get(budgetId);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        db.close();
        if (record && validateState(record.state)) return record.state;
        return null;
      },
      {
        maxRetries: MAX_RETRIES,
        delayMs: RETRY_DELAY_MS,
        isRetryable: (e) =>
          !(e instanceof BudgetIdbError && ['IDB_UNAVAILABLE', 'IDB_BLOCKED', 'IDB_QUOTA_EXCEEDED'].includes(e.code)),
      }
    );
  } catch (e) {
    if (e instanceof BudgetIdbError) throw e;
    throw new BudgetIdbError(
      e instanceof Error ? e.message : 'Failed to read budget',
      'IDB_READ_FAILED',
      e
    );
  }
}

/**
 * Save budget state for a specific budget ID. Also updates lastModifiedAt in budgetsMeta.
 */
export async function setBudgetById(budgetId: string, state: BudgetState): Promise<void> {
  if (!validateState(state)) {
    throw new BudgetIdbError('Invalid budget state', 'VALIDATION_FAILED');
  }
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_BUDGETS, STORE_BUDGETS_META], 'readwrite');
      tx.objectStore(STORE_BUDGETS).put({ id: budgetId, state });
      // Update lastModifiedAt on meta if it exists
      const metaStore = tx.objectStore(STORE_BUDGETS_META);
      const getReq = metaStore.get(budgetId);
      getReq.onsuccess = () => {
        if (getReq.result) {
          metaStore.put({ ...getReq.result, lastModifiedAt: new Date().toISOString() });
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => {
        const err = tx.error;
        const code: BudgetIdbErrorCode = err?.name === 'QuotaExceededError' ? 'IDB_QUOTA_EXCEEDED' : 'IDB_WRITE_FAILED';
        reject(new BudgetIdbError(err?.message ?? 'Failed to write budget', code, err));
      };
    });
    db.close();
  } catch (e) {
    if (e instanceof BudgetIdbError) throw e;
    throw new BudgetIdbError(e instanceof Error ? e.message : 'Failed to save budget', 'IDB_WRITE_FAILED', e);
  }
}

/**
 * Get all budget metadata entries, sorted by createdAt ascending.
 */
export async function getAllBudgetsMeta(): Promise<BudgetMeta[]> {
  try {
    const db = await openDB();
    const metas = await new Promise<BudgetMeta[]>((resolve, reject) => {
      const tx = db.transaction(STORE_BUDGETS_META, 'readonly');
      const req = tx.objectStore(STORE_BUDGETS_META).getAll();
      req.onsuccess = () => resolve((req.result as BudgetMeta[]) ?? []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return metas.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch (e) {
    if (e instanceof BudgetIdbError) throw e;
    throw new BudgetIdbError(e instanceof Error ? e.message : 'Failed to read budget list', 'IDB_READ_FAILED', e);
  }
}

/**
 * Create or update a budget metadata entry.
 */
export async function upsertBudgetMeta(meta: BudgetMeta): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_BUDGETS_META, 'readwrite');
      tx.objectStore(STORE_BUDGETS_META).put(meta);
      tx.oncomplete = () => resolve();
      tx.onerror = () => {
        const err = tx.error;
        const code: BudgetIdbErrorCode = err?.name === 'QuotaExceededError' ? 'IDB_QUOTA_EXCEEDED' : 'IDB_WRITE_FAILED';
        reject(new BudgetIdbError(err?.message ?? 'Failed to write budget meta', code, err));
      };
    });
    db.close();
  } catch (e) {
    if (e instanceof BudgetIdbError) throw e;
    throw new BudgetIdbError(e instanceof Error ? e.message : 'Failed to save budget meta', 'IDB_WRITE_FAILED', e);
  }
}

/**
 * Delete a budget and its metadata by ID.
 */
export async function deleteBudgetById(budgetId: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_BUDGETS, STORE_BUDGETS_META], 'readwrite');
      tx.objectStore(STORE_BUDGETS).delete(budgetId);
      tx.objectStore(STORE_BUDGETS_META).delete(budgetId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => {
        const err = tx.error;
        reject(new BudgetIdbError(err?.message ?? 'Failed to delete budget', 'IDB_WRITE_FAILED', err));
      };
    });
    db.close();
  } catch (e) {
    if (e instanceof BudgetIdbError) throw e;
    throw new BudgetIdbError(e instanceof Error ? e.message : 'Failed to delete budget', 'IDB_WRITE_FAILED', e);
  }
}
