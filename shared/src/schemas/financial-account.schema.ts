import { z } from "zod";
import {
    platformPaginationQuerySchema,
    platformPaginationSchema,
} from "./pagination.schema";
import { uuidArrayQueryParamSchema } from "./query.schema";

/**
 * Financial account types the Platform API reports.
 */
export const FINANCIAL_ACCOUNT_TYPES = [
    "checking",
    "savings",
    "credit_card",
    "loan",
    "line_of_credit",
    "investment",
    "payment_processor",
    "cash",
    "other",
] as const;

export const financialAccountTypeSchema = z.enum(FINANCIAL_ACCOUNT_TYPES);

export type FinancialAccountType = z.infer<typeof financialAccountTypeSchema>;

export const FINANCIAL_ACCOUNT_TYPE_LABELS: Record<
    FinancialAccountType,
    string
> = {
    checking: "Checking",
    savings: "Savings",
    credit_card: "Credit card",
    loan: "Loan",
    line_of_credit: "Line of credit",
    investment: "Investment",
    payment_processor: "Payment processor",
    cash: "Cash",
    other: "Other",
};

/**
 * Where a financial account's transactions come from: an integration, a file
 * import, or manual entry.
 */
export const FINANCIAL_ACCOUNT_SOURCES = [
    "stripe",
    "gusto",
    "file_import",
    "plaid",
    "mercury",
    "ramp",
    "paypal",
    "manual",
    "billcom",
    "check",
] as const;

export const financialAccountSourceSchema = z.enum(FINANCIAL_ACCOUNT_SOURCES);

export type FinancialAccountSource = z.infer<
    typeof financialAccountSourceSchema
>;

export const FINANCIAL_ACCOUNT_SOURCE_LABELS: Record<
    FinancialAccountSource,
    string
> = {
    stripe: "Stripe",
    gusto: "Gusto",
    file_import: "File import",
    plaid: "Plaid",
    mercury: "Mercury",
    ramp: "Ramp",
    paypal: "PayPal",
    manual: "Manual",
    billcom: "Bill.com",
    check: "Check",
};

/**
 * Wire shape of a Platform API financial account. Only accounts assigned to an
 * entity of the workspace are reachable, so `entityId` is never null. The
 * bookkeeping dates are date-only strings (YYYY-MM-DD): a null start date
 * follows the entity's bookkeeping start date and a null end date leaves the
 * account open-ended. `disabled` means syncing new transactions is turned
 * off. `createdAt` is an ISO-8601 datetime string.
 */
export const platformFinancialAccountSchema = z.object({
    id: z.string().uuid(),
    entityId: z.string().uuid(),
    name: z.string().nullable(),
    type: financialAccountTypeSchema,
    source: financialAccountSourceSchema,
    institutionName: z.string().nullable(),
    accountNumberMask: z.string().nullable(),
    balance: z.number().nullable(),
    disabled: z.boolean(),
    bookkeepingStartDate: z.string().date().nullable(),
    bookkeepingEndDate: z.string().date().nullable(),
    createdAt: z.string(),
});

export type PlatformFinancialAccount = z.infer<
    typeof platformFinancialAccountSchema
>;

/**
 * Financial accounts are addressed across every entity of a workspace, so the
 * routes are nested under the workspace uuid.
 */
export const platformFinancialAccountsPathParamsSchema = z.object({
    workspaceId: z.string().uuid(),
});

export const platformFinancialAccountPathParamsSchema =
    platformFinancialAccountsPathParamsSchema.extend({
        financialAccountId: z.string().uuid(),
    });

/** An entity outside the workspace in `entityIds` answers 400. */
export const platformFinancialAccountsListQuerySchema =
    platformPaginationQuerySchema.extend({
        entityIds: uuidArrayQueryParamSchema,
    });

export type PlatformFinancialAccountsListQuery = z.infer<
    typeof platformFinancialAccountsListQuerySchema
>;

export const platformFinancialAccountsListResponseSchema = z.object({
    data: z.array(platformFinancialAccountSchema),
    pagination: platformPaginationSchema,
});

export type PlatformFinancialAccountsListResponse = z.infer<
    typeof platformFinancialAccountsListResponseSchema
>;

export const platformFinancialAccountResponseSchema = z.object({
    financialAccount: platformFinancialAccountSchema,
});

export type PlatformFinancialAccountResponse = z.infer<
    typeof platformFinancialAccountResponseSchema
>;

/**
 * Every field is optional and only the ones present in the body are touched;
 * an empty body answers 400. `null` clears a bookkeeping date. Changing either
 * date regenerates the account's journal entries: a date out of range answers
 * 400, and one blocked by the account's reconciliations or opening balance
 * answers 409.
 */
export const platformFinancialAccountUpdateBodySchema = z
    .object({
        name: z.string().trim().min(1).max(100).optional(),
        bookkeepingStartDate: z.string().date().nullable().optional(),
        bookkeepingEndDate: z.string().date().nullable().optional(),
    })
    .strict();

export type PlatformFinancialAccountUpdateBody = z.infer<
    typeof platformFinancialAccountUpdateBodySchema
>;

/**
 * Moves the account, with its transactions, documents and accounting data, to
 * another entity of the same workspace; its bookkeeping dates are kept.
 * Moving onto the current entity changes nothing.
 */
export const platformFinancialAccountMoveBodySchema = z
    .object({
        entityId: z.string().uuid(),
    })
    .strict();

export type PlatformFinancialAccountMoveBody = z.infer<
    typeof platformFinancialAccountMoveBodySchema
>;

/**
 * An account that manual journal entries post to answers 409 on delete unless
 * `forceDeletion=true`, which deletes those journal entries too. Kick defaults
 * the flag to `false`.
 */
export const platformFinancialAccountDeleteQuerySchema = z
    .object({
        forceDeletion: z.enum(["true", "false"]).optional(),
    })
    .strict();

export type PlatformFinancialAccountDeleteQuery = z.infer<
    typeof platformFinancialAccountDeleteQuerySchema
>;
