/**
 * All localStorage keys used by the app, in one place.
 * Convention: nvalope-kebab-case
 * Import from here rather than duplicating string literals across files.
 */
export const STORAGE_KEYS = {
  /** Zustand appStore persistence (layout mode, accessibility, etc.) */
  APP_PERSIST: 'nvalope-app-persist',
  /** Colorblind mode setting (managed outside Zustand persist for immediate reads) */
  COLORBLIND_MODE: 'nvalope-colorblind-mode',
  /** Layout scale preference (read before Zustand hydrates) */
  LAYOUT_SCALE: 'nvalope-layout-scale',
  /** Wheel scale preference (read before Zustand hydrates) */
  WHEEL_SCALE: 'nvalope-wheel-scale',
  /** Whether the app is installed as a PWA */
  PWA_INSTALLED: 'nvalope-pwa-installed',
  /** TTS (text-to-speech) enabled flag */
  TTS_ENABLED: 'nvalope-tts-enabled',
  /** Master toggle for contextual hints */
  HINTS_MASTER: 'nvalope-hints-master',
  /** List of individually dismissed hint IDs */
  HINTS_DISABLED: 'nvalope-hints-disabled',
  /** Whether the backup folder prompt has been seen */
  BACKUP_PROMPT_SEEN: 'nvalope-backup-prompt-seen',
  /** Whether a backup has been suggested to the user */
  BACKUP_SUGGESTED: 'nvalope-backup-suggested',
  /** Whether a backup download has been suggested */
  BACKUP_DOWNLOAD_SUGGESTED: 'nvalope-backup-download-suggested',
  /** Timestamp (ms) of last periodic backup reminder */
  BACKUP_REMINDER: 'nvalope-backup-reminder',
  /** Whether the encrypted-backup nudge dialog has been seen */
  ENCRYPTED_NUDGE_SEEN: 'nvalope-encrypted-backup-nudge-seen',
  /** Whether the user has entered their first transaction/income */
  FIRST_INPUT: 'nvalope-first-input',
  /** Whether the receipt scanner first-use guide has been dismissed */
  RECEIPT_SCANNER_INTRO_SEEN: 'nvalope-receipt-scanner-intro-seen',
  /** Whether the home-screen "more features in Settings" hint has been dismissed */
  FEATURE_DISCOVERY_HINT_DISMISSED: 'nvalope-feature-discovery-hint-dismissed',
  /** Whether the first-run guided onboarding has been completed, skipped, or otherwise handled */
  ONBOARDING_STATUS: 'nvalope-onboarding-status',
  /** Whether the one-time Additional Features toast has been shown after onboarding */
  ONBOARDING_ADDITIONAL_FEATURES_TOAST_SHOWN: 'nvalope-onboarding-additional-features-toast-shown',
  /** Count of times the app has been opened (a "session" = a fresh page load). Used to gate the BMC toast so brand-new users aren't hit with a support ask on first visit. */
  APP_OPEN_COUNT: 'nvalope-app-open-count',
  /** Whether the BMC toast has been shown at any point in the app's lifetime. Once shown, never re-show automatically (footer link remains). */
  BMC_TOAST_EVER_SHOWN: 'nvalope-bmc-toast-ever-shown',
  /** Whether the one-time "your data stays on your device" reminder under Additional Features has been dismissed. */
  OPTIONAL_FEATURES_SAFE_NOTE_DISMISSED: 'nvalope-optional-features-safe-note-dismissed',
  /** Whether the user has ever expanded the Additional Features collapsible in Settings (used to auto-hide the discovery hint) */
  OPTIONAL_FEATURES_OPENED: 'nvalope-optional-features-opened',
  /** Unix timestamp (ms) of the last successful auto-backup write */
  LAST_BACKUP_SUCCESS: 'nvalope-last-backup-success',
  /** Light/dark theme preference (next-themes compatible key) */
  THEME: 'theme',
} as const;

/**
 * sessionStorage keys. Separated from STORAGE_KEYS so it's obvious at a glance
 * whether a value persists across sessions.
 */
export const SESSION_STORAGE_KEYS = {
  /** Whether the Buy-Me-A-Coffee toast has already been shown in this session */
  BMC_TOAST_SHOWN: 'nvalope-bmc-toast-shown',
  /** Whether the statement-import "new transactions added" hint has been shown this session */
  STATEMENT_IMPORT_TX_HINT: 'nvalope-statement-import-tx-hint-shown',
  /** Whether the guided onboarding tour is active in this browser tab */
  ONBOARDING_TOUR_ACTIVE: 'nvalope-onboarding-tour-active',
  /** Current guided onboarding step index in this browser tab */
  ONBOARDING_TOUR_STEP: 'nvalope-onboarding-tour-step',
} as const;

/**
 * Keys used inside window.history.state entries (pushState/replaceState) so that
 * back/forward navigation can close transient UI like sheets or dialogs.
 */
export const HISTORY_STATE_KEYS = {
  /** Marks a history entry as "assistant chat open"; popstate closes the chat */
  CHAT_OPEN: 'nvalope-chat-open',
  /** Marks a history entry as "mobile fullscreen section open"; popstate closes the section */
  SECTION_OPEN: 'nvalope-section-open',
} as const;
