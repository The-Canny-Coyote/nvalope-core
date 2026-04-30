/**
 * Feature modules. Single source of truth for id, label, emoji, and description.
 * Core modules are enabled by default and can be toggled off.
 * Added (optional) modules are off by default.
 */

export interface ModuleConfig {
  id: string;
  label: string;
  emoji: string;
  description: string;
  /** Core features shown on the wheel by default. Enabled by default, can be toggled off. */
  core?: boolean;
}

export const MODULE_CONFIG: ModuleConfig[] = [
  // ── Core features (on by default) ──────────────────────────────────────
  { id: 'overview',      label: 'Overview',             emoji: '📊', description: 'Bird\'s-eye view of your budget',        core: true },
  { id: 'income',        label: 'Income',               emoji: '💵', description: 'Track income sources',                  core: true },
  { id: 'envelopes',     label: 'Envelopes & Expenses', emoji: '💼', description: 'Manage budget envelopes and expenses',   core: true },
  { id: 'accessibility', label: 'Accessibility',        emoji: '♿', description: 'Customize the app for your needs',      core: true },

  // ── Added features (off by default) ────────────────────────────────────
  { id: 'transactions',   label: 'Transactions',         emoji: '📋', description: 'Full transaction history' },
  { id: 'receiptScanner', label: 'Receipt Scanner',      emoji: '📷', description: 'Scan receipts automatically' },
  { id: 'calendar',       label: 'Calendar View',        emoji: '📅', description: 'See expenses on a calendar' },
  { id: 'analytics',      label: 'Analytics',            emoji: '📈', description: 'Charts and spending trends' },
  { id: 'cacheAssistant', label: 'Cache the Coyote, AI Companion',   emoji: '🐺', description: 'Smart insights & budgeting help from Cache' },
  { id: 'glossary',       label: 'Glossary',             emoji: '📖', description: 'Financial & privacy terms, design principles, resources' },

];

export const CORE_MODULE_IDS: string[] = MODULE_CONFIG.filter((m) => m.core).map((m) => m.id);

export const getModuleConfig = (id: string): ModuleConfig | undefined =>
  MODULE_CONFIG.find((m) => m.id === id);
