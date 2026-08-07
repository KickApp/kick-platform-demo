import { z } from "zod";
import {
    platformPaginationQuerySchema,
    platformPaginationSchema,
} from "./pagination.schema";

/**
 * Account types the Platform API books to. The values are already
 * display-ready, so unlike the entity legal types there is no label map.
 */
export const ACCOUNT_TYPES = [
    "Cash",
    "Accounts Receivable",
    "Inventory",
    "Other Current Assets",
    "Investments",
    "Fixed Assets",
    "Intangible Assets",
    "Other Assets",
    "Accounts Payable",
    "Credit Cards",
    "Payroll Liabilities",
    "Short-Term Loans",
    "Other Current Liabilities",
    "Long-Term Loans",
    "Other Liabilities",
    "Equity",
    "Income",
    "COGS",
    "Operating Expenses",
    "Other Income",
    "Other Expenses",
    "Tax Expenses",
    "Prepaid Expenses",
] as const;

export const accountTypeSchema = z.enum(ACCOUNT_TYPES);

export type AccountType = z.infer<typeof accountTypeSchema>;

/** The five classes every account type rolls up into. */
export const ACCOUNT_CLASSES = [
    "Assets",
    "Liabilities",
    "Equity",
    "Income",
    "Expenses",
] as const;

export const accountClassSchema = z.enum(ACCOUNT_CLASSES);

export type AccountClass = z.infer<typeof accountClassSchema>;

/**
 * Wire shape of a Platform API account. `code` is the human-facing account
 * code, absent on some accounts. Archived accounts stay in the listing and are
 * flagged with `isDisabled`.
 */
export const platformAccountSchema = z.object({
    id: z.string().uuid(),
    code: z.string().nullable(),
    name: z.string(),
    type: accountTypeSchema,
    class: accountClassSchema,
    isDisabled: z.boolean(),
    createdAt: z.string(),
});

export type PlatformAccount = z.infer<typeof platformAccountSchema>;

/** A chart of accounts belongs to one entity, so the route nests under it. */
export const platformChartOfAccountsPathParamsSchema = z.object({
    entityId: z.string().uuid(),
});

export const platformChartOfAccountsListQuerySchema =
    platformPaginationQuerySchema;

export type PlatformChartOfAccountsListQuery = z.infer<
    typeof platformChartOfAccountsListQuerySchema
>;

export const platformChartOfAccountsListResponseSchema = z.object({
    data: z.array(platformAccountSchema),
    pagination: platformPaginationSchema,
});

export type PlatformChartOfAccountsListResponse = z.infer<
    typeof platformChartOfAccountsListResponseSchema
>;
