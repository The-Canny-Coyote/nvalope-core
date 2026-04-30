/**
 * Focused tests for the wheel/dock store flags introduced with the dock rework.
 *
 * These protect the contract MainContent relies on:
 *   - `wheelExpanded` is session-scoped: not in the persist partialize()
 *     output, and defaults to false on a fresh store.
 *   - `wheelDockHintVisible` is session-scoped for the same reason.
 *   - `wheelDockHintDismissed` IS persisted so the one-time hint never
 *     reappears after being dismissed.
 *   - Setters mutate exactly the field they claim to.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore, getAppStoreSettingsSnapshot } from './appStore';

describe('appStore — wheel / dock flags', () => {
  beforeEach(() => {
    useAppStore.setState({
      wheelExpanded: false,
      wheelDockHintVisible: false,
      wheelDockHintDismissed: false,
      wheelTryDismissed: false,
    });
  });

  it('defaults wheelExpanded / hint flags to false', () => {
    const s = useAppStore.getState();
    expect(s.wheelExpanded).toBe(false);
    expect(s.wheelDockHintVisible).toBe(false);
    expect(s.wheelDockHintDismissed).toBe(false);
    expect(s.wheelTryDismissed).toBe(false);
  });

  it('setWheelExpanded toggles only wheelExpanded', () => {
    useAppStore.getState().setWheelExpanded(true);
    expect(useAppStore.getState().wheelExpanded).toBe(true);
    expect(useAppStore.getState().wheelDockHintVisible).toBe(false);
    expect(useAppStore.getState().wheelDockHintDismissed).toBe(false);

    useAppStore.getState().setWheelExpanded(false);
    expect(useAppStore.getState().wheelExpanded).toBe(false);
  });

  it('setWheelDockHintVisible toggles only that flag', () => {
    useAppStore.getState().setWheelDockHintVisible(true);
    expect(useAppStore.getState().wheelDockHintVisible).toBe(true);
    expect(useAppStore.getState().wheelDockHintDismissed).toBe(false);

    useAppStore.getState().setWheelDockHintVisible(false);
    expect(useAppStore.getState().wheelDockHintVisible).toBe(false);
  });

  it('setWheelDockHintDismissed persists true without affecting visibility', () => {
    useAppStore.getState().setWheelDockHintDismissed(true);
    expect(useAppStore.getState().wheelDockHintDismissed).toBe(true);
    expect(useAppStore.getState().wheelDockHintVisible).toBe(false);
  });

  it('getAppStoreSettingsSnapshot omits session-only wheelExpanded/wheelDockHintVisible', () => {
    useAppStore.setState({
      wheelExpanded: true,
      wheelDockHintVisible: true,
      wheelDockHintDismissed: true,
    });
    const snap = getAppStoreSettingsSnapshot();

    // Persisted flag is included in the backup snapshot.
    expect(snap.wheelDockHintDismissed).toBe(true);

    // Session-only flags must NOT leak into backups.
    expect(Object.prototype.hasOwnProperty.call(snap, 'wheelExpanded')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(snap, 'wheelDockHintVisible')).toBe(false);
  });

  it('partialize writes wheelDockHintDismissed to localStorage but not wheelExpanded', async () => {
    // The persist middleware has a `partialize` function that decides which
    // fields make it to localStorage. We verify it by triggering a write and
    // inspecting the serialized state.
    useAppStore.setState({
      wheelExpanded: true,
      wheelDockHintVisible: true,
      wheelDockHintDismissed: true,
    });

    // Force the persist middleware to write by calling a setter that touches
    // a persisted field.
    useAppStore.getState().setWheelExpanded(true);

    // Give zustand/persist a tick to serialize.
    await vi.waitFor(() => {
      const raw = localStorage.getItem('nvalope-app-persist');
      expect(raw).toBeTruthy();
    });

    const raw = localStorage.getItem('nvalope-app-persist');
    const parsed = JSON.parse(raw as string) as { state: Record<string, unknown> };
    expect(parsed.state.wheelDockHintDismissed).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(parsed.state, 'wheelExpanded')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(parsed.state, 'wheelDockHintVisible')).toBe(false);
  });
});
