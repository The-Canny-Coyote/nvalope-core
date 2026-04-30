import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { BudgetState } from '@/app/store/budgetTypes';

// Regression guard for the savings-goal percentage cap:
// When currentAmount exceeds targetAmount the Goals list must display 100%, not 150%+.
const mockUseBudget = vi.fn();
vi.mock('@/app/store/BudgetContext', () => ({
  useBudget: () => mockUseBudget(),
}));

import { SavingsGoalsSection } from './EnvelopesExpensesContent';

function stateWithGoal(current: number, target: number): BudgetState {
  return {
    envelopes: [],
    transactions: [],
    income: [],
    savingsGoals: [
      {
        id: 'g1',
        name: 'Vacation',
        targetAmount: target,
        currentAmount: current,
        targetDate: '',
        monthlyContribution: 0,
        createdAt: '2026-01-01T00:00:00Z',
      },
    ],
    bills: [],
  };
}

describe('SavingsGoalsSection pct cap', () => {
  beforeEach(() => {
    mockUseBudget.mockReset();
  });

  it('caps displayed percentage at 100% when currentAmount exceeds targetAmount', () => {
    mockUseBudget.mockReturnValue({ state: stateWithGoal(250, 100), api: {} });
    render(<SavingsGoalsSection />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('shows exact percentage below target', () => {
    mockUseBudget.mockReturnValue({ state: stateWithGoal(25, 100), api: {} });
    render(<SavingsGoalsSection />);
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('shows 0% when target is 0', () => {
    mockUseBudget.mockReturnValue({ state: stateWithGoal(0, 0), api: {} });
    render(<SavingsGoalsSection />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
