/**
 * Tracks whether a backup folder is chosen.
 */

import { useEffect, useState } from 'react';
import { getBackupFolderHandle } from '@/app/services/externalBackup';

export function useBackupFolderReminders(selectedWheelSection: number | null, refreshToken: unknown) {
  const [hasBackupFolder, setHasBackupFolder] = useState<boolean | null>(null);

  useEffect(() => {
    const refresh = () => {
      getBackupFolderHandle().then((handle) => {
        setHasBackupFolder(!!handle);
      });
    };
    refresh();
    const onBackupFolderUpdated = () => refresh();
    window.addEventListener('nvalope-backup-folder-updated', onBackupFolderUpdated);
    return () => {
      window.removeEventListener('nvalope-backup-folder-updated', onBackupFolderUpdated);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getBackupFolderHandle().then((handle) => {
      if (!cancelled) setHasBackupFolder(!!handle);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  // selectedWheelSection param kept for caller API compat
  void selectedWheelSection;

  return hasBackupFolder;
}
