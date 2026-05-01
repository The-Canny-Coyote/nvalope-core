import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GuidedOnboarding } from './GuidedOnboarding';
import { STORAGE_KEYS } from '@/app/constants/storageKeys';

describe('GuidedOnboarding', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows the first-run choice and persists skip', async () => {
    const user = userEvent.setup();
    const onHandled = vi.fn();

    render(
      <GuidedOnboarding
        selectedSection={null}
        onSelectSection={vi.fn()}
        onHandled={onHandled}
      />
    );

    expect(await screen.findByRole('dialog', { name: /guided tour/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^skip$/i }));

    expect(localStorage.getItem(STORAGE_KEYS.ONBOARDING_STATUS)).toBe('skipped');
    expect(onHandled).toHaveBeenCalledWith('skipped');
  });

  it('waits for the user action before allowing step confirmation', async () => {
    const user = userEvent.setup();
    const onSelectSection = vi.fn();
    const onHandled = vi.fn();
    const { rerender } = render(
      <GuidedOnboarding
        selectedSection={null}
        onSelectSection={onSelectSection}
        onHandled={onHandled}
      />
    );

    await user.click(await screen.findByRole('button', { name: /start guided tour/i }));
    expect(screen.getByRole('button', { name: /i found income/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /^open income$/i }));
    expect(onSelectSection).toHaveBeenCalledWith(2);

    rerender(
      <GuidedOnboarding
        selectedSection={2}
        onSelectSection={onSelectSection}
        onHandled={onHandled}
      />
    );

    await user.click(screen.getByRole('button', { name: /i found income/i }));

    expect(screen.getByText(/Income powers the budget/i)).toBeInTheDocument();
    expect(onHandled).not.toHaveBeenCalled();
  });
});
