import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GuidedOnboarding } from './GuidedOnboarding';
import { SESSION_STORAGE_KEYS, STORAGE_KEYS } from '@/app/constants/storageKeys';

describe('GuidedOnboarding', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
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
    expect(screen.queryByText(/Start with the section picker/i)).not.toBeInTheDocument();

    rerender(
      <GuidedOnboarding
        selectedSection={2}
        onSelectSection={onSelectSection}
        onHandled={onHandled}
      />
    );

    expect(await screen.findByText(/Nice, you're in the right place/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /i found income/i }));

    expect(screen.getByText(/Income powers the budget/i)).toBeInTheDocument();
    expect(onHandled).not.toHaveBeenCalled();
  });

  it('treats the active tour close button as temporary hide, not skip', async () => {
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

    await user.click(screen.getByRole('button', { name: /hide guided tour prompt/i }));

    expect(screen.queryByText(/Start with the section picker/i)).not.toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEYS.ONBOARDING_STATUS)).toBe('started');
    expect(sessionStorage.getItem(SESSION_STORAGE_KEYS.ONBOARDING_TOUR_PANEL_MODE)).toBe('waiting');
    expect(onHandled).not.toHaveBeenCalled();

    rerender(
      <GuidedOnboarding
        selectedSection={2}
        onSelectSection={onSelectSection}
        onHandled={onHandled}
      />
    );

    expect(await screen.findByRole('button', { name: /i found income/i })).toBeEnabled();
    expect(localStorage.getItem(STORAGE_KEYS.ONBOARDING_STATUS)).not.toBe('skipped');
  });

  it('keeps an explicit skip control for ending the active tour', async () => {
    const user = userEvent.setup();
    const onHandled = vi.fn();

    render(
      <GuidedOnboarding
        selectedSection={null}
        onSelectSection={vi.fn()}
        onHandled={onHandled}
      />
    );

    await user.click(await screen.findByRole('button', { name: /start guided tour/i }));
    await user.click(screen.getByRole('button', { name: /^skip tour$/i }));

    expect(localStorage.getItem(STORAGE_KEYS.ONBOARDING_STATUS)).toBe('skipped');
    expect(sessionStorage.getItem(SESSION_STORAGE_KEYS.ONBOARDING_TOUR_ACTIVE)).toBeNull();
    expect(onHandled).toHaveBeenCalledWith('skipped');
  });
});
