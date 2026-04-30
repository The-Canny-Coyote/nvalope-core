import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { BudgetState, Envelope } from '@/app/store/budgetTypes';

// useBudget is mocked so tests can control the period summary exactly.
// The hook under test transforms (state, periodSummary) into chart data — these tests
// guard regressions of the four previously-known calc bugs:
//   1. "Spending by Envelope" shows period-filtered spend (not all-time e.spent)
//   2. Uncategorized transactions surface as a dedicated slice
//   3. Savings goal percentage is capped at 100
const mockUseBudget = vi.fn();
vi.mock('@/app/store/BudgetContext', () => ({
  useBudget: () => mockUseBudget(),
}));

import { useAnalyticsData } from './useAnalyticsData';
import { useAppStore } from '@/app/store/appStore';

function makeEnvelope(overrides: Partial<Envelope> & Pick<Envelope, 'id' | 'name'>): Envelope {
  return { limit: 0, spent: 0, ...overrides };
}

function makeState(overrides: Partial<BudgetState> = {}): BudgetState {
  return {
    envelopes: [],
    transactions: [],
    income: [],
    savingsGoals: [],
    bills: [],
    ...overrides,
  };
}

describe('useAnalyticsData', () => {
  beforeEach(() => {
    mockUseBudget.mockReset();
    // Ensure monthly mode; the default, but explicit for clarity.
    useAppStore.setState({
      budgetPeriodMode: 'monthly',
      budgetPeriodModeSwitchDate: null,
      previousBudgetPeriodMode: null,
      biweeklyPeriod1StartDay: 1,
      biweeklyPeriod1EndDay: 14,
      weekStartDay: 0,
    });
  });

  it('spendingByEnvelope uses period-filtered envelope.spent, not all-time', () => {
    // Regression guard: previously the hook read state.envelopes (all-time e.spent) so
    // monthly mode showed every dollar ever spent. Now it must read periodSummary.envelopes.
    const state = makeState({
      envelopes: [
        // All-time spent is 500 — this value must NOT leak into the chart.
        makeEnvelope({ id: 'env-food', name: 'Food', limit: 200, spent: 500 }),
      ],
    });
    mockUseBudget.mockReturnValue({
      state,
      getBudgetSummaryForCurrentPeriod: () => ({
        summary: {
          totalIncome: 1000,
          totalBudgeted: 200,
          totalSpent: 30,
          uncategorizedSpent: 0,
          remaining: 970,
          // Period-filtered: only 30 this month.
          envelopes: [{ id: 'env-food', name: 'Food', limit: 200, spent: 30, remaining: 170 }],
          recentTransactions: [],
        },
        periodLabel: 'Test',
        period: { start: '2026-04-01', end: '2026-04-30' },
        daysLeftInPeriod: 10,
      }),
    });

    const { result } = renderHook(() => useAnalyticsData(6, 30));

    const food = result.current.spendingByEnvelope.find((x) => x.name === 'Food');
    expect(food?.value).toBe(30);
    expect(food?.value).not.toBe(500);
  });

  it('adds an "Uncategorized" slice when periodSummary.uncategorizedSpent > 0', () => {
    mockUseBudget.mockReturnValue({
      state: makeState(),
      getBudgetSummaryForCurrentPeriod: () => ({
        summary: {
          totalIncome: 0,
          totalBudgeted: 0,
          totalSpent: 42,
          uncategorizedSpent: 42,
          remaining: -42,
          envelopes: [],
          recentTransactions: [],
        },
        periodLabel: 'Test',
        period: { start: '2026-04-01', end: '2026-04-30' },
        daysLeftInPeriod: 10,
      }),
    });

    const { result } = renderHook(() => useAnalyticsData(6, 30));

    const uncategorized = result.current.spendingByEnvelope.find((x) => x.name === 'Uncategorized');
    expect(uncategorized).toBeDefined();
    expect(uncategorized?.value).toBe(42);
    expect(uncategorized?.envelopeId).toBe('uncategorized');
  });

  it('omits the "Uncategorized" slice when periodSummary.uncategorizedSpent is 0', () => {
    mockUseBudget.mockReturnValue({
      state: makeState(),
      getBudgetSummaryForCurrentPeriod: () => ({
        summary: {
          totalIncome: 0,
          totalBudgeted: 0,
          totalSpent: 0,
          uncategorizedSpent: 0,
          remaining: 0,
          envelopes: [],
          recentTransactions: [],
        },
        periodLabel: 'Test',
        period: { start: '2026-04-01', end: '2026-04-30' },
        daysLeftInPeriod: 10,
      }),
    });

    const { result } = renderHook(() => useAnalyticsData(6, 30));

    expect(result.current.spendingByEnvelope.find((x) => x.name === 'Uncategorized')).toBeUndefined();
  });

  it('savingsProgress pct is capped at 100 when current exceeds target', () => {
    const state = makeState({
      savingsGoals: [
        {
          id: 'g1',
          name: 'Emergency',
          targetAmount: 100,
          currentAmount: 250,
          targetDate: '',
          monthlyContribution: 0,
          createdAt: '2026-01-01T00:00:00Z',
        },
      ],
    });
    mockUseBudget.mockReturnValue({
      state,
      getBudgetSummaryForCurrentPeriod: () => ({
        summary: {
          totalIncome: 0,
          totalBudgeted: 0,
          totalSpent: 0,
          uncategorizedSpent: 0,
          remaining: 0,
          envelopes: [],
          recentTransactions: [],
        },
        periodLabel: 'Test',
        period: { start: '2026-04-01', end: '2026-04-30' },
        daysLeftInPeriod: 10,
      }),
    });

    const { result } = renderHook(() => useAnalyticsData(6, 30));

    const emergency = result.current.savingsProgress.find((g) => g.name === 'Emergency');
    expect(emergency?.pct).toBe(100);
  });
});
