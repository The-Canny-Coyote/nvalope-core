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
    expect(screen.getByRole('dialog', { name: /start with the section picker/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^continue$/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^open income$/i }));
    expect(onSelectSection).toHaveBeenCalledWith(2);
    expect(screen.queryByText(/Start with the section picker/i)).not.toBeInTheDocument();
    expect(screen.getByRole('status', { name: /guided tour step in progress/i })).toBeInTheDocument();

    rerender(
      <GuidedOnboarding
        selectedSection={2}
        onSelectSection={onSelectSection}
        onHandled={onHandled}
      />
    );

    expect(await screen.findByText(/Income powers the budget/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^open income$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^continue$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^open envelopes$/i })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: /^open envelopes$/i }));
    expect(onSelectSection).toHaveBeenCalledWith(3);

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
    expect(screen.getByRole('status', { name: /guided tour step in progress/i })).toBeInTheDocument();
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

    expect(await screen.findByText(/Income powers the budget/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /i found income/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^continue$/i })).not.toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEYS.ONBOARDING_STATUS)).not.toBe('skipped');
  });

  it('lets users reopen the coach bar from the waiting state', async () => {
    const user = userEvent.setup();

    render(
      <GuidedOnboarding
        selectedSection={null}
        onSelectSection={vi.fn()}
        onHandled={vi.fn()}
      />
    );

    await user.click(await screen.findByRole('button', { name: /start guided tour/i }));
    await user.click(screen.getByRole('button', { name: /hide guided tour prompt/i }));

    await user.click(screen.getByRole('button', { name: /show guide/i }));

    expect(screen.getByRole('dialog', { name: /start with the section picker/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^open income$/i })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /^continue$/i })).not.toBeInTheDocument();
  });

  it('uses the fixed coach host on mobile instead of the page anchor', async () => {
    const user = userEvent.setup();
    const anchor = document.createElement('div');
    anchor.setAttribute('data-guided-onboarding-anchor', '');
    document.body.appendChild(anchor);

    render(
      <GuidedOnboarding
        selectedSection={null}
        onSelectSection={vi.fn()}
        onHandled={vi.fn()}
        isMobile
      />
    );

    await user.click(await screen.findByRole('button', { name: /start guided tour/i }));

    const coachDialog = screen.getByRole('dialog', { name: /start with the section picker/i });
    expect(anchor).not.toContainElement(coachDialog);
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
