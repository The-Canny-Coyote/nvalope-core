import { describe, expect, it, vi } from 'vitest';
import type { BudgetState } from '@/app/store/budgetTypes';

const toastMocks = vi.hoisted(() => ({
  successWithUndo: vi.fn(),
  success: vi.fn(),
}));

vi.mock('@/app/services/delayedToast', () => ({
  delayedToast: {
    success: toastMocks.success,
    successWithUndo: toastMocks.successWithUndo,
  },
}));

import { captureBudgetSnapshot, showBudgetSnapshotUndo } from './budgetUndo';

function budgetState(): BudgetState {
  return {
    envelopes: [{ id: 'env-1', name: 'Groceries', limit: 100, spent: 12 }],
    transactions: [{ id: 'tx-1', amount: 12, envelopeId: 'env-1', description: 'Apples', date: '2026-05-01', createdAt: '2026-05-01T00:00:00.000Z' }],
    income: [],
    savingsGoals: [],
    bills: [],
  };
}

describe('budget undo helpers', () => {
  it('captures a deep snapshot of budget state', () => {
    const state = budgetState();
    const snapshot = captureBudgetSnapshot({ getState: () => state } as never);
    state.envelopes[0].name = 'Changed';

    expect(snapshot.envelopes[0].name).toBe('Groceries');
  });

  it('restores the captured snapshot when undo is clicked', () => {
    const before = budgetState();
    const importData = vi.fn();
    showBudgetSnapshotUndo({ importData } as never, 'Envelope deleted.', before);

    const undo = toastMocks.successWithUndo.mock.calls[0][2] as () => void;
    undo();

    expect(importData).toHaveBeenCalledWith(before);
    expect(toastMocks.success).toHaveBeenCalledWith('Restored previous budget state.');
  });
});
