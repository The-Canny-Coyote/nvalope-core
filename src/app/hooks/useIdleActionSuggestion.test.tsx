import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useIdleActionSuggestion } from './useIdleActionSuggestion';
import { STORAGE_KEYS } from '@/app/constants/storageKeys';

const toastMocks = vi.hoisted(() => ({
  info: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    info: toastMocks.info,
  },
}));

describe('useIdleActionSuggestion', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    toastMocks.info.mockClear();
    localStorage.clear();
    localStorage.setItem(STORAGE_KEYS.ONBOARDING_STATUS, 'completed');
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('waits for user activity on the initially opened section before suggesting an action', () => {
    renderHook(() =>
      useIdleActionSuggestion({
        selectedSectionId: 1,
        availableSectionIds: [1, 2, 3, 4, 5, 6],
        onSelectSection: vi.fn(),
        delayMs: 1000,
      })
    );

    vi.advanceTimersByTime(1000);
    expect(toastMocks.info).not.toHaveBeenCalled();

    window.dispatchEvent(new Event('pointerdown'));
    vi.advanceTimersByTime(999);
    expect(toastMocks.info).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(toastMocks.info).toHaveBeenCalledWith(
      'Ready to build your budget?',
      expect.objectContaining({
        id: 'idle-action-suggestion-1',
        action: expect.objectContaining({ label: 'Open Income' }),
      })
    );
  });

  it('does not show suggestions until onboarding is completed or skipped', () => {
    localStorage.removeItem(STORAGE_KEYS.ONBOARDING_STATUS);

    renderHook(() =>
      useIdleActionSuggestion({
        selectedSectionId: 2,
        availableSectionIds: [1, 2, 3, 4, 5, 6],
        onSelectSection: vi.fn(),
        delayMs: 1000,
      })
    );

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    vi.advanceTimersByTime(1000);

    expect(toastMocks.info).not.toHaveBeenCalled();
  });
});
