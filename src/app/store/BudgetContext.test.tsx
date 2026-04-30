import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { BudgetProvider } from './BudgetContext';

const getBudgetMock = vi.fn();

// Use importOriginal so module-level constants (DEFAULT_BUDGET_ID, STORE_* names) pass
// through to appStore, which reads DEFAULT_BUDGET_ID at init time. We only override the
// functions that BudgetProvider actually calls on mount — everything else in this module
// is a pure constant, so no IndexedDB side-effects are triggered under JSDOM.
vi.mock('@/app/services/budgetIdb', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/services/budgetIdb')>();
  return {
    ...actual,
    getBudgetById: (...args: unknown[]) => getBudgetMock(...args),
    setBudgetById: vi.fn(() => Promise.resolve()),
    getAllBudgetsMeta: vi.fn(() => Promise.resolve([])),
    upsertBudgetMeta: vi.fn(() => Promise.resolve()),
    deleteBudgetById: vi.fn(() => Promise.resolve()),
  };
});

describe('BudgetProvider load failure', () => {
  beforeEach(() => {
    getBudgetMock.mockReset();
    getBudgetMock.mockRejectedValue(new Error('read failed'));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls onLoadError after retries are exhausted', async () => {
    const onLoadError = vi.fn();
    render(<BudgetProvider onLoadError={onLoadError} />);

    expect(screen.getByRole('status', { name: /loading budget/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(onLoadError).toHaveBeenCalledWith('Failed to load budget. Try again or restore from backup.');
    });

    expect(getBudgetMock.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Failed to load budget. Try again or restore from backup.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
