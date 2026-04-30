import React, { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Progress } from '@/app/components/ui/progress';

/** Settings → Check for updates: loading state, then dismiss + "up to date" if still no SW update.
 *  Effect deps are only `[checkingForUpdate]`; including `updateAvailable` re-fired after the
 *  session ref reset and could leave the loading toast stuck (seen in the wild). */
export function useCheckUpdatesToast(
  checkForUpdates: () => void,
  checkingForUpdate: boolean,
  updateAvailable: boolean
) {
  const checkForUpdatesToastShownRef = useRef(false);
  const checkForUpdatesStartTimeRef = useRef(0);
  const updateAvailableRef = useRef(updateAvailable);
  updateAvailableRef.current = updateAvailable;

  const handleCheckForUpdates = useCallback(() => {
    checkForUpdatesToastShownRef.current = true;
    checkForUpdatesStartTimeRef.current = Date.now();
    toast.loading('Checking for updates…', {
      id: 'check-updates',
      description: React.createElement(Progress, { value: 0, className: 'mt-1.5 h-2.5 w-full min-w-[160px]' }),
    });
    checkForUpdates();
  }, [checkForUpdates]);

  useEffect(() => {
    if (checkingForUpdate || !checkForUpdatesToastShownRef.current) return;

    checkForUpdatesToastShownRef.current = false;
    const elapsed = Date.now() - checkForUpdatesStartTimeRef.current;
    const minLoadingMs = 500;
    const delayDismiss = Math.max(0, minLoadingMs - elapsed);

    let resultTimer: ReturnType<typeof setTimeout> | undefined;

    const dismissAndShowResult = () => {
      toast.dismiss('check-updates');
      // Re-read after dismiss: if an update landed while we were waiting, skip "up to date".
      resultTimer = setTimeout(() => {
        if (!updateAvailableRef.current) {
          toast.info("You're up to date.", {
            id: 'check-updates-result',
            duration: 4500,
          });
        }
      }, 50);
    };

    if (delayDismiss > 0) {
      const t = setTimeout(dismissAndShowResult, delayDismiss);
      return () => {
        clearTimeout(t);
        if (resultTimer) clearTimeout(resultTimer);
      };
    }
    dismissAndShowResult();
    return () => {
      if (resultTimer) clearTimeout(resultTimer);
    };
  }, [checkingForUpdate]);

  return { handleCheckForUpdates };
}
