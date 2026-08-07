import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    CASH_FLOW_SECTION_LABELS,
    PROFIT_AND_LOSS_SECTION_LABELS,
    REPORT_GROUP_BY_LABELS,
    REPORT_GROUP_BY_VALUES,
    type PlatformBalanceSheetReport,
    type PlatformCashFlowReport,
    type PlatformGeneralLedgerReport,
    type PlatformProfitAndLossReport,
    type PlatformTrialBalanceReport,
    type ReportGroupBy,
} from "@kick-demo/shared";
import {
    fetchBalanceSheetReport,
    fetchCashFlowReport,
    fetchGeneralLedgerReport,
    fetchProfitAndLossReport,
    fetchTrialBalanceReport,
} from "../api/platform";
import { CashFlowSummary } from "../components/reports/CashFlowSummary";
import { GeneralLedgerTable } from "../components/reports/GeneralLedgerTable";
import { ReportSectionsTable } from "../components/reports/ReportSectionsTable";
import { TrialBalanceTable } from "../components/reports/TrialBalanceTable";
import {
    EmptyMessage,
    ErrorMessageBox,
    LoadingMessage,
} from "../components/StatusMessage";
import { currentYearStartIsoDate, todayIsoDate } from "../lib/format";
import { useWorkspaceEntities } from "../lib/use-workspace-entities";
import { useWorkspaceContext } from "../lib/workspace-context";

const REPORT_TYPES = [
    { value: "profit-and-loss", label: "Profit and loss" },
    { value: "balance-sheet", label: "Balance sheet" },
    { value: "cash-flow", label: "Cash flow" },
    { value: "trial-balance", label: "Trial balance" },
    { value: "general-ledger", label: "General ledger" },
] as const;

type ReportType = (typeof REPORT_TYPES)[number]["value"];

function isReportType(value: string): value is ReportType {
    return REPORT_TYPES.some((reportType) => reportType.value === value);
}

function isGroupBy(value: string): value is ReportGroupBy {
    return REPORT_GROUP_BY_VALUES.some((groupBy) => groupBy === value);
}

/**
 * The five reports have five different response shapes, so the fetch is tagged
 * with the report it ran and the renderer switches on that tag rather than
 * sniffing fields off the body.
 */
type ReportResult =
    | { type: "profit-and-loss"; report: PlatformProfitAndLossReport }
    | { type: "balance-sheet"; report: PlatformBalanceSheetReport }
    | { type: "cash-flow"; report: PlatformCashFlowReport }
    | { type: "trial-balance"; report: PlatformTrialBalanceReport }
    | { type: "general-ledger"; report: PlatformGeneralLedgerReport };

type ReportRequest = {
    entityId: string;
    startDate: string;
    endDate: string;
    groupBy: ReportGroupBy;
};

async function fetchReport(
    reportType: ReportType,
    request: ReportRequest,
): Promise<ReportResult> {
    switch (reportType) {
        case "profit-and-loss":
            return {
                type: reportType,
                report: await fetchProfitAndLossReport(request),
            };
        case "balance-sheet":
            return {
                type: reportType,
                report: await fetchBalanceSheetReport(request),
            };
        case "cash-flow":
            return {
                type: reportType,
                report: await fetchCashFlowReport(request),
            };
        case "trial-balance":
            return {
                type: reportType,
                report: await fetchTrialBalanceReport(request),
            };
        case "general-ledger":
            return {
                type: reportType,
                report: await fetchGeneralLedgerReport(request),
            };
    }
}

/**
 * Reports are scoped to a single entity, so the tab picks one rather than
 * covering the whole workspace the way the transactions tab does. Everything is
 * read on the cash basis: this demo does not keep accrual books.
 */
export function WorkspaceReportsPage() {
    const { workspaceId } = useWorkspaceContext();
    const entities = useWorkspaceEntities(workspaceId);
    const [selectedEntityId, setSelectedEntityId] = useState("");
    const [reportType, setReportType] = useState<ReportType>("profit-and-loss");
    const [startDate, setStartDate] = useState(currentYearStartIsoDate);
    const [endDate, setEndDate] = useState(todayIsoDate);
    const [groupBy, setGroupBy] = useState<ReportGroupBy>("total");

    const entityId =
        selectedEntityId !== ""
            ? selectedEntityId
            : (entities.entities[0]?.id ?? "");
    // The general ledger lists individual postings, so it takes no grouping.
    const isGroupable = reportType !== "general-ledger";
    const effectiveGroupBy = isGroupable ? groupBy : "total";

    const reportQuery = useQuery({
        queryKey: [
            "report",
            reportType,
            entityId,
            startDate,
            endDate,
            effectiveGroupBy,
        ],
        queryFn: () =>
            fetchReport(reportType, {
                entityId,
                startDate,
                endDate,
                groupBy: effectiveGroupBy,
            }),
        enabled: entityId !== "" && startDate <= endDate,
    });

    if (entities.isPending) {
        return <LoadingMessage label="entities" />;
    }

    if (entities.error !== null) {
        return <ErrorMessageBox error={entities.error} />;
    }

    if (entities.entities.length === 0) {
        return (
            <EmptyMessage>
                This workspace has no entities yet, and a report is always
                scoped to one.
            </EmptyMessage>
        );
    }

    return (
        <section>
            <div className="page-header">
                <div>
                    <h3 className="section-title">Reports</h3>
                    <p className="page-meta">
                        Accounting reports for a single entity, on the cash
                        basis.
                    </p>
                </div>
            </div>

            <div className="filter-bar">
                <label className="field-inline">
                    <span className="field-label">Entity</span>
                    <select
                        value={entityId}
                        onChange={(event) =>
                            setSelectedEntityId(event.target.value)
                        }
                    >
                        {entities.entities.map((entity) => (
                            <option key={entity.id} value={entity.id}>
                                {entity.name ?? entity.id}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="field-inline">
                    <span className="field-label">Report</span>
                    <select
                        value={reportType}
                        onChange={(event) => {
                            if (isReportType(event.target.value)) {
                                setReportType(event.target.value);
                            }
                        }}
                    >
                        {REPORT_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                                {type.label}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="field-inline">
                    <span className="field-label">From</span>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(event) => setStartDate(event.target.value)}
                    />
                </label>
                <label className="field-inline">
                    <span className="field-label">To</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(event) => setEndDate(event.target.value)}
                    />
                </label>
                {isGroupable && (
                    <label className="field-inline">
                        <span className="field-label">Columns</span>
                        <select
                            value={groupBy}
                            onChange={(event) => {
                                if (isGroupBy(event.target.value)) {
                                    setGroupBy(event.target.value);
                                }
                            }}
                        >
                            {REPORT_GROUP_BY_VALUES.map((value) => (
                                <option key={value} value={value}>
                                    {REPORT_GROUP_BY_LABELS[value]}
                                </option>
                            ))}
                        </select>
                    </label>
                )}
            </div>

            {startDate > endDate && (
                <EmptyMessage>
                    The start date must be on or before the end date.
                </EmptyMessage>
            )}
            {startDate <= endDate && reportQuery.isPending && (
                <LoadingMessage label="report" />
            )}
            {reportQuery.error !== null && (
                <ErrorMessageBox error={reportQuery.error} />
            )}
            {reportQuery.data && <ReportBody result={reportQuery.data} />}
        </section>
    );
}

function ReportBody({ result }: { result: ReportResult }) {
    switch (result.type) {
        case "profit-and-loss":
            return result.report.sections.length === 0 ? (
                <EmptyMessage>No activity in the selected period.</EmptyMessage>
            ) : (
                <ReportSectionsTable
                    periods={result.report.periods}
                    sections={result.report.sections.map((section) => ({
                        key: section.section,
                        label: PROFIT_AND_LOSS_SECTION_LABELS[section.section],
                        total: section.total,
                        totalsByPeriod: section.totalsByPeriod,
                        lines: section.lines,
                    }))}
                />
            );
        case "balance-sheet":
            return result.report.sections.length === 0 ? (
                <EmptyMessage>No balances in the selected period.</EmptyMessage>
            ) : (
                <ReportSectionsTable
                    periods={result.report.periods}
                    sections={result.report.sections.map((section) => ({
                        key: section.label,
                        label: section.label,
                        total: section.total,
                        totalsByPeriod: section.totalsByPeriod,
                        lines: section.lines,
                    }))}
                />
            );
        case "cash-flow":
            return (
                <>
                    <CashFlowSummary summary={result.report.summary} />
                    {result.report.sections.length > 0 && (
                        <ReportSectionsTable
                            periods={result.report.periods}
                            sections={result.report.sections.map((section) => ({
                                key: section.section,
                                label: CASH_FLOW_SECTION_LABELS[
                                    section.section
                                ],
                                total: section.total,
                                totalsByPeriod: section.totalsByPeriod,
                                lines: section.lines,
                            }))}
                        />
                    )}
                </>
            );
        case "trial-balance":
            return result.report.rows.length === 0 ? (
                <EmptyMessage>No balances in the selected period.</EmptyMessage>
            ) : (
                <TrialBalanceTable report={result.report} />
            );
        case "general-ledger":
            return result.report.accounts.length === 0 ? (
                <EmptyMessage>
                    No ledger postings in the selected period.
                </EmptyMessage>
            ) : (
                <GeneralLedgerTable report={result.report} />
            );
    }
}
