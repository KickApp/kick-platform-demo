import type { PlatformCashFlowSummary } from "@kick-demo/shared";
import { formatAmount } from "../../lib/format";

const SUMMARY_LABELS: Array<[keyof PlatformCashFlowSummary, string]> = [
    ["operatingActivities", "Operating activities"],
    ["investingActivities", "Investing activities"],
    ["financingActivities", "Financing activities"],
    ["netCashChange", "Net change in cash"],
    ["beginningCashBalance", "Beginning cash"],
    ["endingCashBalance", "Ending cash"],
];

/** The cash flow statement's roll-up, which no other report carries. */
export function CashFlowSummary({
    summary,
}: {
    summary: PlatformCashFlowSummary;
}) {
    return (
        <div className="card summary-card">
            {SUMMARY_LABELS.map(([field, label]) => (
                <div key={field} className="summary-item">
                    <span className="summary-label">{label}</span>
                    <span className="summary-value">
                        {formatAmount(summary[field])}
                    </span>
                </div>
            ))}
        </div>
    );
}
