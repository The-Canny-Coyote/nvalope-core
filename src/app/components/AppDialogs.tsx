/**
 * Centralized app-level dialogs. State and handlers stay in App; this
 * component is presentational.
 */

import { BackupFolderPrompt } from '@/app/components/BackupFolderPrompt';

export interface AppDialogsProps {
  // Backup folder prompt
  showBackupFolderPrompt: boolean;
  onBackupFolderPromptOpenChange: (open: boolean) => void;
  onBackupChooseFolder: () => Promise<boolean>;
  onBackupNoThanks: () => void;
}

export function AppDialogs({
  showBackupFolderPrompt,
  onBackupFolderPromptOpenChange,
  onBackupChooseFolder,
  onBackupNoThanks,
}: AppDialogsProps) {
  return (
    <BackupFolderPrompt
      open={showBackupFolderPrompt}
      onOpenChange={onBackupFolderPromptOpenChange}
      onChooseFolder={onBackupChooseFolder}
      onNoThanks={onBackupNoThanks}
    />
  );
}
