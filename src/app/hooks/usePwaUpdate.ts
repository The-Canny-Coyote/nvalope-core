// Service worker registration + manual "check for updates" / reload helpers.
// Auto-update still reloads via Workbox; these hooks back Settings and edge cases.

import { useState, useEffect, useRef, useCallback } from 'react';

export interface UsePwaUpdateReturn {
  updateAvailable: boolean;
  setUpdateAvailable: (v: boolean) => void;
  offlineReady: boolean;
  setOfflineReady: (v: boolean) => void;
  checkingForUpdate: boolean;
  checkForUpdates: () => void;
  handleUpdateReload: () => void;
}

export function usePwaUpdate(): UsePwaUpdateReturn {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [checkingForUpdate, setCheckingForUpdate] = useState(false);
  const updateSWRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    import('virtual:pwa-register').then(({ registerSW }) => {
      const updateSW = registerSW({
        onNeedRefresh: () => setUpdateAvailable(true),
        onOfflineReady: () => setOfflineReady(true),
      });
      updateSWRef.current = updateSW;
    });
  }, []);

  const checkForUpdates = useCallback(() => {
    if (!('serviceWorker' in navigator)) return;
    setCheckingForUpdate(true);
    const clearChecking = () => setCheckingForUpdate(false);
    // Bail if ready hangs (e.g. no SW in dev).
    const timeoutId = setTimeout(clearChecking, 10_000);
    navigator.serviceWorker.ready
      .then((reg) => {
        clearTimeout(timeoutId);
        return reg.update();
      })
      .then(() => {
        // `onNeedRefresh` from registerSW often fires after `update()` resolves.
        // If we cleared "checking" immediately, Settings would show "You're up to date"
        // before `updateAvailable` flipped — classic flash of the wrong toast.
        setTimeout(clearChecking, 450);
      })
      .catch(() => {
        clearTimeout(timeoutId);
        clearChecking();
      });
  }, []);

  const handleUpdateReload = useCallback(() => {
    setUpdateAvailable(false);
    if (!('serviceWorker' in navigator)) {
      window.location.reload();
      return;
    }
    navigator.serviceWorker.ready.then((reg) => {
      if (reg.waiting) {
        let didReload = false;
        const reloadOnce = () => {
          if (didReload) return;
          didReload = true;
          window.location.reload();
        };
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        navigator.serviceWorker.addEventListener('controllerchange', reloadOnce);
        // Fallback: if controllerchange doesn't fire within 3s, reload anyway
        setTimeout(reloadOnce, 3000);
      } else {
        updateSWRef.current?.();
      }
    }).catch(() => {
      updateSWRef.current?.();
    });
  }, []);

  return {
    updateAvailable,
    setUpdateAvailable,
    offlineReady,
    setOfflineReady,
    checkingForUpdate,
    checkForUpdates,
    handleUpdateReload,
  };
}
