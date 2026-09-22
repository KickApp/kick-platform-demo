import type { PlatformJournalEntry } from "@kick-demo/shared";
import { formatAmount, formatDate } from "../lib/format";

/** Prefer the calendar day (`dateOnly`) over the legacy timestamp. */
function entryDateLabel(journalEntry: PlatformJournalEntry): string {
    const { dateOnly } = journalEntry;
    if (dateOnly !== null && dateOnly !== undefined) {
        return formatDate(`${dateOnly}T00:00:00Z`);
    }
    return formatDate(journalEntry.date);
}

/**
 * The entity's manual journal entries, one row per double-entry line with the
 * entry's date and memo shown on its first line only — the closest thing to
 * how a ledger prints.
 */
export function JournalEntriesTable({
    journalEntries,
}: {
    journalEntries: PlatformJournalEntry[];
}) {
    return (
        <div className="card table-card">
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Memo</th>
                        <th>Account</th>
                        <th>Line description</th>
                        <th className="amount">Debit</th>
                        <th className="amount">Credit</th>
                    </tr>
                </thead>
                <tbody>
                    {journalEntries.flatMap((journalEntry) =>
                        journalEntry.lines.map((line, index) => (
                            <tr key={`${journalEntry.id}-${index}`}>
                                <td>
                                    {index === 0
                                        ? entryDateLabel(journalEntry)
                                        : ""}
                                </td>
                                <td>
                                    {index === 0
                                        ? (journalEntry.memo ?? "—")
                                        : ""}
                                </td>
                                <td>
                                    {line.accountCode} — {line.accountName}
                                </td>
                                <td>{line.description ?? "—"}</td>
                                <td className="amount">
                                    {line.debitAmount !== null
                                        ? formatAmount(line.debitAmount)
                                        : ""}
                                </td>
                                <td className="amount">
                                    {line.creditAmount !== null
                                        ? formatAmount(line.creditAmount)
                                        : ""}
                                </td>
                            </tr>
                        )),
                    )}
                </tbody>
            </table>
        </div>
    );
}
