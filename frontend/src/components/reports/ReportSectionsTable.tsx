import { Fragment, type CSSProperties } from "react";
import type {
    PlatformReportPeriodBucket,
    PlatformReportRow,
} from "@kick-demo/shared";
import { formatAmount } from "../../lib/format";

/**
 * Profit and loss, balance sheet and cash flow all come back as a list of
 * sections holding a total and its rows, so one table renders all three. The
 * caller resolves each section's display label, which is an enum on two of the
 * reports and a plain string on the third. Rows nest recursively: account rows
 * sit under group rows mirroring the chart-of-accounts account groups, each
 * group closed by its own total row.
 */
export type ReportSection = {
    key: string;
    label: string;
    total: number;
    totalsByPeriod: number[];
    lines: PlatformReportRow[];
};

const BASE_INDENT_PX = 32;
const INDENT_STEP_PX = 24;

function indentStyle(depth: number): CSSProperties {
    return { paddingLeft: `${BASE_INDENT_PX + depth * INDENT_STEP_PX}px` };
}

function AmountCells({
    periodColumns,
    amountsByPeriod,
    amount,
}: {
    periodColumns: PlatformReportPeriodBucket[];
    amountsByPeriod: number[];
    amount: number;
}) {
    return (
        <>
            {periodColumns.map((period, periodIndex) => (
                <td key={period.startDate} className="amount">
                    {formatAmount(amountsByPeriod[periodIndex] ?? 0)}
                </td>
            ))}
            <td className="amount">{formatAmount(amount)}</td>
        </>
    );
}

function ReportRows({
    rows,
    depth,
    periodColumns,
}: {
    rows: PlatformReportRow[];
    depth: number;
    periodColumns: PlatformReportPeriodBucket[];
}) {
    return (
        <>
            {rows.map((row, index) =>
                row.kind === "group" ? (
                    <Fragment key={`group-${row.groupId ?? row.name}-${index}`}>
                        <tr className="report-group-row">
                            <td
                                className="report-line-name"
                                style={indentStyle(depth)}
                                colSpan={periodColumns.length + 2}
                            >
                                {row.name}
                            </td>
                        </tr>
                        <ReportRows
                            rows={row.lines}
                            depth={depth + 1}
                            periodColumns={periodColumns}
                        />
                        <tr className="report-group-total-row">
                            <td
                                className="report-line-name"
                                style={indentStyle(depth)}
                            >
                                {row.name} total
                            </td>
                            <AmountCells
                                periodColumns={periodColumns}
                                amountsByPeriod={row.totalsByPeriod}
                                amount={row.total}
                            />
                        </tr>
                    </Fragment>
                ) : (
                    <tr
                        key={`account-${row.accountCode ?? row.accountName}-${index}`}
                    >
                        <td
                            className="report-line-name"
                            style={indentStyle(depth)}
                        >
                            {row.accountCode !== null
                                ? `${row.accountCode} — ${row.accountName}`
                                : row.accountName}
                        </td>
                        <AmountCells
                            periodColumns={periodColumns}
                            amountsByPeriod={row.amountsByPeriod}
                            amount={row.amount}
                        />
                    </tr>
                ),
            )}
        </>
    );
}

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
                        <ReportRows
                            rows={section.lines}
                            depth={0}
                            periodColumns={periodColumns}
                        />
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
