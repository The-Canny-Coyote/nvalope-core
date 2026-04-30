"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { STORAGE_KEYS } from "@/app/constants/storageKeys";

export function getEncryptedBackupNudgeSeen(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(STORAGE_KEYS.ENCRYPTED_NUDGE_SEEN) === "true";
  } catch {
    return true;
  }
}

export function setEncryptedBackupNudgeSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ENCRYPTED_NUDGE_SEEN, "true");
  } catch {
    // ignore
  }
}

export interface EncryptedBackupNudgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAck: () => void;
}

export function EncryptedBackupNudgeDialog({
  open,
  onOpenChange,
  onAck,
}: EncryptedBackupNudgeDialogProps) {
  const handleAck = () => {
    setEncryptedBackupNudgeSeen();
    onAck();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Keep your backup and password safe</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                If you forget this password, encrypted backups cannot be opened. There is no recovery.
              </p>
              <p>
                Store your backup files on an external storage device (e.g. USB drive or external disk) and keep your password in a safe place.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleAck}>Got it</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
