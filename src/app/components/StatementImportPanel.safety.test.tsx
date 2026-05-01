import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatementImportPanel } from './StatementImportPanel';
import type { NormalizeImportedTransactionResult, ParsedStatementFile } from '@/app/services/statementImport';

const parsed: ParsedStatementFile = {
  format: 'csv',
  rows: [
    {
      sourceFile: 'bank.csv',
      sourceFormat: 'csv',
      rowNumber: 1,
      postedDate: '2026-05-01',
      description: 'Store',
      amount: -12,
      direction: 'debit',
      warnings: [],
    },
  ],
  diagnostics: [],
  csvColumns: ['Date', 'Description', 'Amount'],
  csvMapping: { dateColumn: 'Date', descriptionColumn: 'Description', amountColumn: 'Amount' },
};

const classification: NormalizeImportedTransactionResult = {
  importQueue: [
    {
      amount: 12,
      description: 'Store',
      date: '2026-05-01',
      importHash: 'hash-1',
      payeeNormalized: 'store',
      confidenceScore: 0.95,
      sourceFile: 'bank.csv',
      duplicateMatch: { transactionId: 'tx-existing', kind: 'exact' },
      duplicateResolution: 'replace',
    },
  ],
  incomeToAdd: [],
  skippedAsDuplicates: [],
  possibleDuplicates: [],
  invalidRows: [],
  skippedCreditRows: [],
  diagnostics: [],
};

describe('StatementImportPanel safety checks', () => {
  it('requires an extra confirmation before replacing existing transactions', async () => {
    const user = userEvent.setup();
    const deleteTransaction = vi.fn();
    const addTransactions = vi.fn();

    render(
      <StatementImportPanel
        fileName="bank.csv"
        parsed={parsed}
        classification={classification}
        envelopes={[]}
        statementImportCreditsAsIncome={false}
        onCreditsAsIncomeChange={vi.fn()}
        onCsvMappingChange={vi.fn()}
        enabledModules={['transactions']}
        onCancel={vi.fn()}
        onImported={vi.fn()}
        addTransactions={addTransactions}
        addIncome={vi.fn()}
        deleteTransaction={deleteTransaction}
      />
    );

    await user.click(screen.getByRole('button', { name: /confirm statement import/i }));

    expect(screen.getByRole('alertdialog')).toHaveTextContent('Replace existing transactions?');
    expect(deleteTransaction).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /replace and import/i }));

    expect(deleteTransaction).toHaveBeenCalledWith('tx-existing');
    expect(addTransactions).toHaveBeenCalledWith([
      expect.objectContaining({ amount: 12, description: 'Store', date: '2026-05-01' }),
    ]);
  });
});
