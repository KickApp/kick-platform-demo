import type { PlatformTrialBalanceReport } from "@kick-demo/shared";
import { formatAmount } from "../../lib/format";

/**
 * The trial balance is the one report whose amounts are a debit/credit pair
 * rather than a single signed number, so it gets its own table instead of
 * sharing {@link ReportSectionsTable}.
 */
export function TrialBalanceTable({
    report,
}: {
    report: PlatformTrialBalanceReport;
}) {
    const periodColumns = report.periods.length > 1 ? report.periods : [];

    return (
        <div className="card table-card">
            <table>
                <thead>
                    <tr>
                        <th>Account</th>
                        {periodColumns.map((period) => (
                            <th
                                key={period.startDate}
                                className="amount"
                                colSpan={2}
                            >
                                {period.startDate}
                            </th>
                        ))}
                        <th className="amount">Debit</th>
                        <th className="amount">Credit</th>
                    </tr>
                </thead>
                <tbody>
                    {report.rows.map((row, index) => (
                        <tr
                            key={`${row.accountCode ?? row.accountName}-${index}`}
                        >
                            <td>
                                {row.accountCode !== null
                                    ? `${row.accountCode} — ${row.accountName}`
                                    : row.accountName}
                            </td>
                            {periodColumns.map((period, periodIndex) => {
                                const amount = row.amountsByPeriod[periodIndex];
                                return [
                                    <td
                                        key={`${period.startDate}-debit`}
                                        className="amount"
                                    >
                                        {formatAmount(amount?.debit ?? 0)}
                                    </td>,
                                    <td
                                        key={`${period.startDate}-credit`}
                                        className="amount"
                                    >
                                        {formatAmount(amount?.credit ?? 0)}
                                    </td>,
                                ];
                            })}
                            <td className="amount">
                                {formatAmount(row.debit)}
                            </td>
                            <td className="amount">
                                {formatAmount(row.credit)}
                            </td>
                        </tr>
                    ))}
                    <tr className="report-total-row">
                        <td>Total</td>
                        {periodColumns.map((period, periodIndex) => {
                            const totals = report.totalsByPeriod[periodIndex];
                            return [
                                <td
                                    key={`${period.startDate}-debit`}
                                    className="amount"
                                >
                                    {formatAmount(totals?.debit ?? 0)}
                                </td>,
                                <td
                                    key={`${period.startDate}-credit`}
                                    className="amount"
                                >
                                    {formatAmount(totals?.credit ?? 0)}
                                </td>,
                            ];
                        })}
                        <td className="amount">
                            {formatAmount(report.totals.debit)}
                        </td>
                        <td className="amount">
                            {formatAmount(report.totals.credit)}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
