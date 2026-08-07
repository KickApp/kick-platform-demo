import { z } from "zod";

/**
 * Wire shapes of the Platform API's financial reports, vendored from
 * `common/schemas/platform/report.platform.schema.ts` in the kick repo.
 *
 * Reports are deliberately flatter than Kick's internal report DTOs: account
 * lines arrive already flattened out of the nested report groups, so nothing
 * here is recursive. Every report carries the same shape whether or not
 * `groupBy` was used — `periods` always lists at least one date range and each
 * `...ByPeriod` array lines up with it one for one, alongside a whole-range
 * scalar (a sum for the flow reports, a closing balance for the position
 * ones).
 */

/**
 * The demo only ever asks for cash-basis reports, but the parameter is part of
 * the upstream contract so the full enum is vendored.
 */
export const LEDGER_BASES = ["cash", "accruals"] as const;

export const ledgerBasisSchema = z.enum(LEDGER_BASES);

export type LedgerBasis = z.infer<typeof ledgerBasisSchema>;

export const REPORT_GROUP_BY_VALUES = [
    "total",
    "week",
    "month",
    "quarter",
    "year",
] as const;

export const reportGroupBySchema = z.enum(REPORT_GROUP_BY_VALUES);

export type ReportGroupBy = z.infer<typeof reportGroupBySchema>;

export const REPORT_GROUP_BY_LABELS: Record<ReportGroupBy, string> = {
    total: "Total",
    week: "Weekly",
    month: "Monthly",
    quarter: "Quarterly",
    year: "Yearly",
};

export const platformReportPathParamsSchema = z.object({
    entityId: z.string().uuid(),
});

/**
 * The upstream schema refines this with "startDate must be on or before
 * endDate", which would turn it into a `ZodEffects` and stop ts-rest from
 * treating it as a plain query object. Kick still enforces the ordering, so the
 * refinement is left off here.
 */
const platformReportRangeShape = {
    startDate: z.string().date(),
    endDate: z.string().date(),
    ledgerBasis: ledgerBasisSchema.default("cash"),
};

export const platformReportQuerySchema = z.object({
    ...platformReportRangeShape,
    groupBy: reportGroupBySchema.default("total"),
});

export type PlatformReportQuery = z.infer<typeof platformReportQuerySchema>;

/**
 * The general ledger lists individual dated postings rather than period
 * aggregates, so it is the one report that takes no `groupBy`.
 */
export const platformGeneralLedgerQuerySchema = z.object(
    platformReportRangeShape,
);

export type PlatformGeneralLedgerQuery = z.infer<
    typeof platformGeneralLedgerQuerySchema
>;

export const platformReportLineSchema = z.object({
    accountCode: z.string().nullable(),
    accountName: z.string(),
    amount: z.number(),
    amountsByPeriod: z.array(z.number()),
});

export type PlatformReportLine = z.infer<typeof platformReportLineSchema>;

export const platformReportPeriodBucketSchema = z.object({
    startDate: z.string(),
    endDate: z.string(),
});

export type PlatformReportPeriodBucket = z.infer<
    typeof platformReportPeriodBucketSchema
>;

const platformReportPeriodSchema = z.object({
    entityId: z.string().uuid(),
    startDate: z.string(),
    endDate: z.string(),
    ledgerBasis: ledgerBasisSchema,
});

const platformGroupedReportPeriodSchema = platformReportPeriodSchema.extend({
    groupBy: reportGroupBySchema,
    periods: z.array(platformReportPeriodBucketSchema),
});

export const PROFIT_AND_LOSS_SECTIONS = [
    "income",
    "cogs",
    "grossProfit",
    "expenses",
    "netOperatingIncome",
    "otherIncome",
    "otherExpenses",
    "netOtherIncome",
    "netIncome",
    "cashBalance",
] as const;

export const profitAndLossSectionSchema = z.enum(PROFIT_AND_LOSS_SECTIONS);

export type ProfitAndLossSection = z.infer<typeof profitAndLossSectionSchema>;

export const PROFIT_AND_LOSS_SECTION_LABELS: Record<
    ProfitAndLossSection,
    string
> = {
    income: "Income",
    cogs: "Cost of goods sold",
    grossProfit: "Gross profit",
    expenses: "Expenses",
    netOperatingIncome: "Net operating income",
    otherIncome: "Other income",
    otherExpenses: "Other expenses",
    netOtherIncome: "Net other income",
    netIncome: "Net income",
    cashBalance: "Cash balance",
};

export const platformProfitAndLossSectionSchema = z.object({
    section: profitAndLossSectionSchema,
    total: z.number(),
    totalsByPeriod: z.array(z.number()),
    lines: z.array(platformReportLineSchema),
});

export type PlatformProfitAndLossSection = z.infer<
    typeof platformProfitAndLossSectionSchema
>;

export const platformProfitAndLossReportSchema =
    platformGroupedReportPeriodSchema.extend({
        sections: z.array(platformProfitAndLossSectionSchema),
    });

export type PlatformProfitAndLossReport = z.infer<
    typeof platformProfitAndLossReportSchema
>;

export const platformProfitAndLossResponseSchema = z.object({
    report: platformProfitAndLossReportSchema,
});

export type PlatformProfitAndLossResponse = z.infer<
    typeof platformProfitAndLossResponseSchema
>;

export const platformBalanceSheetSectionSchema = z.object({
    label: z.string(),
    total: z.number(),
    totalsByPeriod: z.array(z.number()),
    lines: z.array(platformReportLineSchema),
});

export type PlatformBalanceSheetSection = z.infer<
    typeof platformBalanceSheetSectionSchema
>;

/**
 * Balances are as of `endDate`; `startDate` only bounds the reported activity.
 * Grouped columns are balances as of the end of each period, so the whole-range
 * scalar is the last one rather than their sum.
 */
export const platformBalanceSheetReportSchema =
    platformGroupedReportPeriodSchema.extend({
        sections: z.array(platformBalanceSheetSectionSchema),
    });

export type PlatformBalanceSheetReport = z.infer<
    typeof platformBalanceSheetReportSchema
>;

export const platformBalanceSheetResponseSchema = z.object({
    report: platformBalanceSheetReportSchema,
});

export type PlatformBalanceSheetResponse = z.infer<
    typeof platformBalanceSheetResponseSchema
>;

export const CASH_FLOW_SECTIONS = [
    "Operating",
    "Investing",
    "Financing",
] as const;

export const cashFlowSectionSchema = z.enum(CASH_FLOW_SECTIONS);

export type CashFlowSection = z.infer<typeof cashFlowSectionSchema>;

export const CASH_FLOW_SECTION_LABELS: Record<CashFlowSection, string> = {
    Operating: "Operating activities",
    Investing: "Investing activities",
    Financing: "Financing activities",
};

export const platformCashFlowSectionSchema = z.object({
    section: cashFlowSectionSchema,
    total: z.number(),
    totalsByPeriod: z.array(z.number()),
    lines: z.array(platformReportLineSchema),
});

export type PlatformCashFlowSection = z.infer<
    typeof platformCashFlowSectionSchema
>;

export const platformCashFlowSummarySchema = z.object({
    operatingActivities: z.number(),
    investingActivities: z.number(),
    financingActivities: z.number(),
    netCashChange: z.number(),
    beginningCashBalance: z.number(),
    endingCashBalance: z.number(),
});

export type PlatformCashFlowSummary = z.infer<
    typeof platformCashFlowSummarySchema
>;

/**
 * Indirect-method cash flow statement. The Net Income line inside the
 * operating section is derived from the P&L rather than posted to an account,
 * so it is the one line whose `accountCode` is always null.
 */
export const platformCashFlowReportSchema =
    platformGroupedReportPeriodSchema.extend({
        sections: z.array(platformCashFlowSectionSchema),
        summary: platformCashFlowSummarySchema,
        summaryByPeriod: z.array(platformCashFlowSummarySchema),
    });

export type PlatformCashFlowReport = z.infer<
    typeof platformCashFlowReportSchema
>;

export const platformCashFlowResponseSchema = z.object({
    report: platformCashFlowReportSchema,
});

export type PlatformCashFlowResponse = z.infer<
    typeof platformCashFlowResponseSchema
>;

export const platformTrialBalanceAmountSchema = z.object({
    debit: z.number(),
    credit: z.number(),
});

export type PlatformTrialBalanceAmount = z.infer<
    typeof platformTrialBalanceAmountSchema
>;

export const platformTrialBalanceRowSchema = platformReportLineSchema
    .omit({ amount: true, amountsByPeriod: true })
    .merge(platformTrialBalanceAmountSchema)
    .extend({
        amountsByPeriod: z.array(platformTrialBalanceAmountSchema),
    });

export type PlatformTrialBalanceRow = z.infer<
    typeof platformTrialBalanceRowSchema
>;

export const platformTrialBalanceReportSchema =
    platformGroupedReportPeriodSchema.extend({
        rows: z.array(platformTrialBalanceRowSchema),
        totals: platformTrialBalanceAmountSchema,
        totalsByPeriod: z.array(platformTrialBalanceAmountSchema),
    });

export type PlatformTrialBalanceReport = z.infer<
    typeof platformTrialBalanceReportSchema
>;

export const platformTrialBalanceResponseSchema = z.object({
    report: platformTrialBalanceReportSchema,
});

export type PlatformTrialBalanceResponse = z.infer<
    typeof platformTrialBalanceResponseSchema
>;

export const JOURNAL_ENTRY_SOURCE_TYPES = [
    "transaction",
    "manual_journal_entry",
    "opening_balance",
    "loan",
    "bill",
    "invoice",
] as const;

export const journalEntrySourceTypeSchema = z.enum(JOURNAL_ENTRY_SOURCE_TYPES);

export type JournalEntrySourceType = z.infer<
    typeof journalEntrySourceTypeSchema
>;

export const JOURNAL_ENTRY_SOURCE_TYPE_LABELS: Record<
    JournalEntrySourceType,
    string
> = {
    transaction: "Transaction",
    manual_journal_entry: "Manual journal entry",
    opening_balance: "Opening balance",
    loan: "Loan",
    bill: "Bill",
    invoice: "Invoice",
};

/**
 * One group per account, each with its running lines. Unlike the manual
 * journal entries surface, entries here carry a mix of source types, so
 * `sourceType` is meaningful per line. `date` is an ISO-8601 datetime string.
 */
export const platformGeneralLedgerEntrySchema = z.object({
    journalEntryId: z.string().uuid(),
    date: z.string(),
    description: z.string(),
    memo: z.string().nullable(),
    debitAmount: z.number(),
    creditAmount: z.number(),
    balance: z.number(),
    sourceType: journalEntrySourceTypeSchema,
    counterpartyName: z.string().nullable(),
});

export type PlatformGeneralLedgerEntry = z.infer<
    typeof platformGeneralLedgerEntrySchema
>;

export const platformGeneralLedgerAccountSchema = z.object({
    accountId: z.string().uuid(),
    accountCode: z.number().int(),
    accountName: z.string(),
    openingBalance: z.number(),
    closingBalance: z.number(),
    entries: z.array(platformGeneralLedgerEntrySchema),
});

export type PlatformGeneralLedgerAccount = z.infer<
    typeof platformGeneralLedgerAccountSchema
>;

export const platformGeneralLedgerReportSchema =
    platformReportPeriodSchema.extend({
        accounts: z.array(platformGeneralLedgerAccountSchema),
    });

export type PlatformGeneralLedgerReport = z.infer<
    typeof platformGeneralLedgerReportSchema
>;

export const platformGeneralLedgerResponseSchema = z.object({
    report: platformGeneralLedgerReportSchema,
});

export type PlatformGeneralLedgerResponse = z.infer<
    typeof platformGeneralLedgerResponseSchema
>;
