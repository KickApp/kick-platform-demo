import {
    JOURNAL_ENTRY_SOURCE_TYPE_LABELS,
    type PlatformGeneralLedgerReport,
} from "@kick-demo/shared";
import { formatAmount, formatDate } from "../../lib/format";

/**
 * The general ledger lists individual postings instead of period aggregates:
 * one card per account, each running from its opening to its closing balance.
 */
export function GeneralLedgerTable({
    report,
}: {
    report: PlatformGeneralLedgerReport;
}) {
    return (
        <>
            {report.accounts.map((account) => (
                <div key={account.accountId} className="card connection-card">
                    <div className="connection-header">
                        <div>
                            <h4 className="connection-title">
                                {account.accountCode} — {account.accountName}
                            </h4>
                            <p className="page-meta">
                                Opening {formatAmount(account.openingBalance)} ·
                                closing {formatAmount(account.closingBalance)}
                            </p>
                        </div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Description</th>
                                <th>Counterparty</th>
                                <th>Source</th>
                                <th className="amount">Debit</th>
                                <th className="amount">Credit</th>
                                <th className="amount">Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {account.entries.map((entry, index) => (
                                <tr key={`${entry.journalEntryId}-${index}`}>
                                    <td>{formatDate(entry.date)}</td>
                                    <td>{entry.description}</td>
                                    <td>{entry.counterpartyName ?? "—"}</td>
                                    <td>
                                        {
                                            JOURNAL_ENTRY_SOURCE_TYPE_LABELS[
                                                entry.sourceType
                                            ]
                                        }
                                    </td>
                                    <td className="amount">
                                        {formatAmount(entry.debitAmount)}
                                    </td>
                                    <td className="amount">
                                        {formatAmount(entry.creditAmount)}
                                    </td>
                                    <td className="amount">
                                        {formatAmount(entry.balance)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}
        </>
    );
}
