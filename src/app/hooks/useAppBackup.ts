// Wires IndexedDB snapshot getter into externalBackup (folder picker, autobackup to disk).

import React, { useEffect, useCallback, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { toast } from 'sonner';
import {
  setFullSnapshotGetter,
  setNotifyCallback,
  setAutobackupNotify,
  setBackupPasswordGetter,
  startAutoBackup,
  stopAutoBackup,
  cancelScheduledBackup,
  requestBackupFolder,
  triggerBackupNow,
  isExternalBackupSupported,
} from '@/app/services/externalBackup';
import type { FullBackupSnapshot } from '@/app/services/externalBackup';
import { delayedToast } from '@/app/services/delayedToast';
import { Progress } from '@/app/components/ui/progress';

export interface UseAppBackupParams {
  /** Ref whose current value is the function that returns the current backup snapshot. */
  getSnapshotRef: MutableRefObject<() => FullBackupSnapshot>;
  /** When encrypt backups is on, ref to session backup password (not persisted). */
  getBackupPasswordRef?: React.MutableRefObject<string | null>;
  /** Whether backups should be encrypted (from app store). */
  encryptBackups?: boolean;
}

export interface UseAppBackupReturn {
  /** Stable function that returns the current snapshot (reads from ref). */
  getBackupSnapshot: () => FullBackupSnapshot;
  /** Opens folder picker and triggers an immediate backup on success. Returns true if folder was set. */
  handleChooseBackupFolder: () => Promise<boolean>;
}

export function useAppBackup({
  getSnapshotRef,
  getBackupPasswordRef,
  encryptBackups = false,
}: UseAppBackupParams): UseAppBackupReturn {
  const getBackupSnapshot = useCallback(() => getSnapshotRef.current(), [getSnapshotRef]);

  const autobackupIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autobackupStartTimeRef = useRef<number>(0);
  const autobackupSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backupErrorToastShownRef = useRef(false);
  const PROGRESS_CLASS = 'mt-1.5 h-2.5 w-full min-w-[160px]';

  useEffect(() => {
    const getter = () => getSnapshotRef.current();
    const clearProgress = () => {
      if (autobackupIntervalRef.current) {
        clearInterval(autobackupIntervalRef.current);
        autobackupIntervalRef.current = null;
      }
    };

    const showBackupErrorToast = (message: string) => {
      if (backupErrorToastShownRef.current) return;
      backupErrorToastShownRef.current = true;
      toast.error(message, {
        id: 'backup-failed',
        duration: 10000,
        className: 'backup-failed-toast',
      });
    };

    setFullSnapshotGetter(getter);
    setBackupPasswordGetter(
      getBackupPasswordRef && encryptBackups
        ? () => getBackupPasswordRef.current ?? null
        : null
    );
    setNotifyCallback(showBackupErrorToast);
    setAutobackupNotify((phase) => {
      if (phase === 'start') {
        if (autobackupSuccessTimeoutRef.current) {
          clearTimeout(autobackupSuccessTimeoutRef.current);
          autobackupSuccessTimeoutRef.current = null;
        }
        autobackupStartTimeRef.current = Date.now();
        clearProgress();
        toast.loading('Saving backup…', {
          id: 'autobackup',
          description: React.createElement(Progress, { value: 0, className: PROGRESS_CLASS }),
        });
        let p = 0;
        autobackupIntervalRef.current = setInterval(() => {
          p = Math.min(90, p + 12);
          toast.loading('Saving backup…', {
            id: 'autobackup',
            description: React.createElement(Progress, { value: p, className: PROGRESS_CLASS }),
          });
          if (p >= 90) clearProgress();
        }, 120);
      } else {
        clearProgress();
        if (phase === 'error') {
          toast.dismiss('autobackup');
        } else {
          // Skip success toast when budget is empty (toggle noise); still dismiss loading.
          const snap = getter();
          const budget = (snap as { budget?: { envelopes?: unknown[]; income?: unknown[]; transactions?: unknown[] } } | null | undefined)?.budget;
          const envelopesLen = Array.isArray(budget?.envelopes) ? budget!.envelopes!.length : 0;
          const incomeLen = Array.isArray(budget?.income) ? budget!.income!.length : 0;
          const txLen = Array.isArray(budget?.transactions) ? budget!.transactions!.length : 0;
          const isMeaningful = envelopesLen + incomeLen + txLen > 0;
          const elapsed = autobackupStartTimeRef.current ? Date.now() - autobackupStartTimeRef.current : 0;
          const delay = Math.max(0, 400 - elapsed);
          const show = () => {
            autobackupSuccessTimeoutRef.current = null;
            if (isMeaningful) {
              toast.success('Backup saved.', { id: 'autobackup', duration: 3000 });
            } else {
              toast.dismiss('autobackup');
            }
          };
          if (delay > 0) {
            autobackupSuccessTimeoutRef.current = setTimeout(show, delay);
          } else {
            show();
          }
        }
      }
    });
    startAutoBackup(getter);
    return () => {
      if (autobackupSuccessTimeoutRef.current) {
        clearTimeout(autobackupSuccessTimeoutRef.current);
        autobackupSuccessTimeoutRef.current = null;
      }
      clearProgress();
      cancelScheduledBackup();
      stopAutoBackup();
      setFullSnapshotGetter(null);
      setNotifyCallback(null);
      setBackupPasswordGetter(null);
      setAutobackupNotify(null);
    };
  }, [getSnapshotRef, getBackupPasswordRef, encryptBackups]);

  const handleChooseBackupFolder = useCallback(async (): Promise<boolean> => {
    const ok = await requestBackupFolder();
    if (ok) {
      window.dispatchEvent(new CustomEvent('nvalope-backup-folder-updated'));
      delayedToast.success(
        'Backup folder set. One file will be updated there when autobackup runs (after 3 changes, at most once per minute).'
      );
      const pwd = encryptBackups ? getBackupPasswordRef?.current ?? undefined : undefined;
      const result = await triggerBackupNow(getSnapshotRef.current, true, true, pwd);
      if (!result.ok && result.error) delayedToast.error(result.error);
      return true;
    }
    if (isExternalBackupSupported()) {
      delayedToast.error(
        'Could not save folder. Try again or use a different browser (Chrome/Edge).'
      );
    } else {
      delayedToast.error('Backup folder is not supported in this browser. Use Chrome or Edge.');
    }
    return false;
  }, [getSnapshotRef, encryptBackups, getBackupPasswordRef]);

  return { getBackupSnapshot, handleChooseBackupFolder };
}
