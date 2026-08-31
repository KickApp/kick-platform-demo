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
 * An account's class is derived from its type by Kick and is never sent on a
 * write, so a form offering account types has to know the rollup itself to
 * group them. Mirrors the upstream type-to-class map.
 */
export const ACCOUNT_TYPE_CLASSES: Record<AccountType, AccountClass> = {
    Cash: "Assets",
    "Accounts Receivable": "Assets",
    Inventory: "Assets",
    "Other Current Assets": "Assets",
    Investments: "Assets",
    "Fixed Assets": "Assets",
    "Intangible Assets": "Assets",
    "Other Assets": "Assets",
    "Accounts Payable": "Liabilities",
    "Credit Cards": "Liabilities",
    "Payroll Liabilities": "Liabilities",
    "Short-Term Loans": "Liabilities",
    "Other Current Liabilities": "Liabilities",
    "Long-Term Loans": "Liabilities",
    "Other Liabilities": "Liabilities",
    Equity: "Equity",
    Income: "Income",
    COGS: "Expenses",
    "Operating Expenses": "Expenses",
    "Other Income": "Income",
    "Other Expenses": "Expenses",
};

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

export const platformAccountPathParamsSchema =
    platformChartOfAccountsPathParamsSchema.extend({
        accountId: z.string().uuid(),
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

export const platformAccountResponseSchema = z.object({
    account: platformAccountSchema,
});

export type PlatformAccountResponse = z.infer<
    typeof platformAccountResponseSchema
>;

export const PLATFORM_BULK_CREATE_ACCOUNTS_MAX_ITEMS = 100;

/**
 * Write payloads mirror the read shape: `code` is the human-facing display
 * code, and the subtype is never exposed — Kick assigns the type's default.
 * Omitting `code` lets Kick allocate the next one in the type's range.
 */
const platformCreateAccountItemSchema = z.object({
    name: z.string().trim().min(1).max(200),
    type: accountTypeSchema,
    code: z.string().trim().min(1).max(20).optional(),
});

export const platformCreateAccountBodySchema = platformCreateAccountItemSchema;

export type PlatformCreateAccountBody = z.infer<
    typeof platformCreateAccountBodySchema
>;

export const platformBulkCreateAccountsBodySchema = z.object({
    accounts: z
        .array(platformCreateAccountItemSchema)
        .min(1)
        .max(PLATFORM_BULK_CREATE_ACCOUNTS_MAX_ITEMS),
});

export type PlatformBulkCreateAccountsBody = z.infer<
    typeof platformBulkCreateAccountsBodySchema
>;

export const platformBulkCreateAccountsResponseSchema = z.object({
    data: z.array(platformAccountSchema),
});

export type PlatformBulkCreateAccountsResponse = z.infer<
    typeof platformBulkCreateAccountsResponseSchema
>;

/** An account's type, class and code are fixed once it exists. */
export const platformUpdateAccountBodySchema = z.object({
    name: z.string().trim().min(1).max(200),
});

export type PlatformUpdateAccountBody = z.infer<
    typeof platformUpdateAccountBodySchema
>;
