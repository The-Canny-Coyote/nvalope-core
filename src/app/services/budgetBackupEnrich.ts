import { getAllBudgetsMeta, getBudgetById } from '@/app/services/budgetIdb';
import type { FullBackupSnapshot } from '@/app/services/externalBackup';

/**
 * Enrich a backup snapshot with all budget states when the user has multiple budgets.
 *
 * The `budget` field (active budget) is always present and kept unchanged for
 * backward-compatible restore. The `budgets` field is appended when 2+ budgets
 * exist so that a full restore can recover all of them.
 *
 * Non-fatal: if IDB is unavailable or any budget fails to load, the snapshot
 * is returned as-is — the active budget in `budget` still produces a valid backup.
 */
export async function enrichFullBackupWithAllBudgets(
  snapshot: FullBackupSnapshot
): Promise<FullBackupSnapshot> {
  try {
    const metas = await getAllBudgetsMeta();
    if (metas.length <= 1) return snapshot;

    const entries = await Promise.all(
      metas.map(async (meta) => {
        try {
          const state = await getBudgetById(meta.id);
          return state ? { meta, state } : null;
        } catch {
          return null;
        }
      })
    );
    const budgets = entries.filter((e): e is NonNullable<typeof e> => e !== null);
    if (budgets.length === 0) return snapshot;
    return { ...snapshot, budgets };
  } catch {
    return snapshot;
  }
}
