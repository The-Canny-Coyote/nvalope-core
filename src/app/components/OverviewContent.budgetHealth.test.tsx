import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Regression guard for Budget Health %:
// When period limits exceed period income, the denominator must be clamped to income so
// the bar reflects real headroom. Previously this mixed period spending with all-time limits,
// understating how exposed the user was.
const mockUseBudget = vi.fn();
vi.mock('@/app/store/BudgetContext', () => ({
  useBudget: () => mockUseBudget(),
}));

import { OverviewContent } from './OverviewContent';
import { useAppStore } from '@/app/store/appStore';

const emptyState = {
  envelopes: [],
  transactions: [],
  income: [],
  savingsGoals: [],
  bills: [],
};

function withSummary(partial: { totalIncome: number; totalBudgeted: number; totalSpent: number }) {
  return {
    state: emptyState,
    getBudgetSummaryForCurrentPeriod: () => ({
      summary: {
        totalIncome: partial.totalIncome,
        totalBudgeted: partial.totalBudgeted,
        totalSpent: partial.totalSpent,
        uncategorizedSpent: 0,
        remaining: partial.totalIncome - partial.totalSpent,
        envelopes: [],
        recentTransactions: [],
      },
      periodLabel: 'Test Period',
      period: { start: '2026-04-01', end: '2026-04-30' },
      daysLeftInPeriod: 10,
    }),
  };
}

describe('OverviewContent Budget Health', () => {
  beforeEach(() => {
    mockUseBudget.mockReset();
    useAppStore.setState({ reducedMotion: true, selectedMode: 'standard', budgetPeriodMode: 'monthly' });
  });

  it('uses totalIncome as the denominator when totalBudgeted exceeds it', () => {
    // Limits of $1000, income of $500, spent $250 → should show 50% (250/500),
    // not 25% (250/1000).
    mockUseBudget.mockReturnValue(withSummary({ totalIncome: 500, totalBudgeted: 1000, totalSpent: 250 }));
    render(<OverviewContent />);
    const progressbar = screen.getByRole('progressbar', { name: /overall spending progress/i });
    expect(progressbar).toHaveAttribute('aria-valuenow', '50');
  });

  it('uses totalBudgeted as the denominator when income >= budgeted', () => {
    // Income $2000, budgeted $1000, spent $250 → 25% (250/1000).
    mockUseBudget.mockReturnValue(withSummary({ totalIncome: 2000, totalBudgeted: 1000, totalSpent: 250 }));
    render(<OverviewContent />);
    const progressbar = screen.getByRole('progressbar', { name: /overall spending progress/i });
    expect(progressbar).toHaveAttribute('aria-valuenow', '25');
  });

  it('falls back to totalBudgeted when there is no income', () => {
    // Income $0, budgeted $400, spent $100 → 25% (100/400).
    mockUseBudget.mockReturnValue(withSummary({ totalIncome: 0, totalBudgeted: 400, totalSpent: 100 }));
    render(<OverviewContent />);
    const progressbar = screen.getByRole('progressbar', { name: /overall spending progress/i });
    expect(progressbar).toHaveAttribute('aria-valuenow', '25');
  });

  it('shows 0% when both income and budget are zero', () => {
    mockUseBudget.mockReturnValue(withSummary({ totalIncome: 0, totalBudgeted: 0, totalSpent: 0 }));
    render(<OverviewContent />);
    const progressbar = screen.getByRole('progressbar', { name: /overall spending progress/i });
    expect(progressbar).toHaveAttribute('aria-valuenow', '0');
  });
});
