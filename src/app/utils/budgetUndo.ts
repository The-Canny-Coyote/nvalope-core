import type { BudgetStoreApi } from '@/app/store/budgetStore';
import type { BudgetState } from '@/app/store/budgetTypes';
import { delayedToast } from '@/app/services/delayedToast';

function cloneBudgetState(state: BudgetState): BudgetState {
  if (typeof structuredClone === 'function') {
    return structuredClone(state);
  }
  return JSON.parse(JSON.stringify(state)) as BudgetState;
}

export function captureBudgetSnapshot(api: BudgetStoreApi): BudgetState {
  return cloneBudgetState(api.getState());
}

export function showBudgetSnapshotUndo(
  api: BudgetStoreApi,
  message: string,
  beforeState: BudgetState,
  durationMs = 7000,
): void {
  delayedToast.successWithUndo(
    message,
    () => {},
    () => {
      api.importData(beforeState);
      delayedToast.success('Restored previous budget state.');
    },
    durationMs,
  );
}
