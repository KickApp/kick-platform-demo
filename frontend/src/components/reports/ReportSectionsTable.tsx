import type {
    PlatformReportLine,
    PlatformReportPeriodBucket,
} from "@kick-demo/shared";
import { formatAmount } from "../../lib/format";

/**
 * Profit and loss, balance sheet and cash flow all come back as a list of
 * sections holding a total and its already-flattened account lines, so one
 * table renders all three. The caller resolves each section's display label,
 * which is an enum on two of the reports and a plain string on the third.
 */
export type ReportSection = {
    key: string;
    label: string;
    total: number;
    totalsByPeriod: number[];
    lines: PlatformReportLine[];
};

/**
 * `periods` always holds at least one bucket. A single bucket is the whole
 * range, so its column would repeat the total — only split the columns out once
 * the range is actually grouped.
 */
export function ReportSectionsTable({
    sections,
    periods,
    totalLabel = "Total",
}: {
    sections: ReportSection[];
    periods: PlatformReportPeriodBucket[];
    totalLabel?: string;
}) {
    const periodColumns = periods.length > 1 ? periods : [];

    return (
        <div className="card table-card">
            <table>
                <thead>
                    <tr>
                        <th>Account</th>
                        {periodColumns.map((period) => (
                            <th key={period.startDate} className="amount">
                                {period.startDate}
                            </th>
                        ))}
                        <th className="amount">{totalLabel}</th>
                    </tr>
                </thead>
                {sections.map((section) => (
                    <tbody key={section.key}>
                        <tr className="report-section-row">
                            <td colSpan={periodColumns.length + 2}>
                                {section.label}
                            </td>
                        </tr>
                        {section.lines.map((line, index) => (
                            <tr
                                key={`${line.accountCode ?? line.accountName}-${index}`}
                            >
                                <td className="report-line-name">
                                    {line.accountCode !== null
                                        ? `${line.accountCode} — ${line.accountName}`
                                        : line.accountName}
                                </td>
                                {periodColumns.map((period, periodIndex) => (
                                    <td
                                        key={period.startDate}
                                        className="amount"
                                    >
                                        {formatAmount(
                                            line.amountsByPeriod[periodIndex] ??
                                                0,
                                        )}
                                    </td>
                                ))}
                                <td className="amount">
                                    {formatAmount(line.amount)}
                                </td>
                            </tr>
                        ))}
                        <tr className="report-total-row">
                            <td>{section.label} total</td>
                            {periodColumns.map((period, periodIndex) => (
                                <td key={period.startDate} className="amount">
                                    {formatAmount(
                                        section.totalsByPeriod[periodIndex] ??
                                            0,
                                    )}
                                </td>
                            ))}
                            <td className="amount">
                                {formatAmount(section.total)}
                            </td>
                        </tr>
                    </tbody>
                ))}
            </table>
        </div>
    );
}
