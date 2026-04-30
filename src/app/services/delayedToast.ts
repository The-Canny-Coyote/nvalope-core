import { toast } from "sonner";

type ToastType = "success" | "error" | "info";

let blocking = true;
const queue: Array<{ type: ToastType; message: string; durationMs?: number }> = [];

type UndoQueueItem = {
  message: string;
  onCommit: () => void;
  onUndo: () => void;
  durationMs: number;
};

const undoQueue: UndoQueueItem[] = [];

// Longer duration when the queue has multiple items (easier to read in sequence).
const BASE_DURATION_MS = 4000;
const EXTRA_DURATION_PER_TOAST_MS = 2500;

function processQueue() {
  if (blocking) return;
  const count = queue.length;
  const durationMs = BASE_DURATION_MS + count * EXTRA_DURATION_PER_TOAST_MS;
  while (queue.length > 0) {
    const item = queue.shift()!;
    toast[item.type](item.message, { duration: item.durationMs ?? durationMs });
  }
}

function processUndoQueue() {
  if (blocking) return;
  while (undoQueue.length > 0) {
    const item = undoQueue.shift()!;
    const timer = setTimeout(() => {
      item.onCommit();
    }, item.durationMs);
    const toastId = toast.success(item.message, {
      duration: item.durationMs,
      action: {
        label: "Undo",
        onClick: () => {
          clearTimeout(timer);
          toast.dismiss(toastId);
          item.onUndo();
        },
      },
    });
  }
}

/** Pause non-modal toasts while the system notification dialog is open. */
export function setToastBlocking(blocked: boolean) {
  blocking = blocked;
  processQueue();
  processUndoQueue();
}

/** Queues until `setToastBlocking(false)` so success/error lines don't sit under a modal. */
export const delayedToast = {
  success: (message: string) => {
    queue.push({ type: "success", message });
    processQueue();
  },
  error: (message: string) => {
    queue.push({ type: "error", message });
    processQueue();
  },
  info: (message: string, options?: { durationMs?: number }) => {
    queue.push({ type: "info", message, durationMs: options?.durationMs });
    processQueue();
  },
  /** Undo runs on tap; commit timer otherwise. Same queue as the rest. */
  successWithUndo: (
    message: string,
    onCommit: () => void,
    onUndo: () => void,
    durationMs: number = BASE_DURATION_MS,
  ) => {
    undoQueue.push({ message, onCommit, onUndo, durationMs });
    processUndoQueue();
  },
};
