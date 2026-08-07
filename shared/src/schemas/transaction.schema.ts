import { z } from "zod";
import {
    platformPaginationQuerySchema,
    platformPaginationSchema,
} from "./pagination.schema";

/**
 * Provenance of a transaction. Mirrors `TransactionType` from the kick repo
 * (`common/types/transaction.ts`).
 */
export const TRANSACTION_TYPES = [
    "external",
    "stripe",
    "imported",
    "ramp",
    "mercury",
    "paypal",
    "manual",
] as const;

export const transactionTypeSchema = z.enum(TRANSACTION_TYPES);

export type TransactionType = z.infer<typeof transactionTypeSchema>;

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
    external: "Bank feed",
    stripe: "Stripe",
    imported: "Imported",
    ramp: "Ramp",
    mercury: "Mercury",
    paypal: "PayPal",
    manual: "Manual",
};

export const TRANSACTION_STATUSES = ["pending", "completed", "failed"] as const;

export const transactionStatusSchema = z.enum(TRANSACTION_STATUSES);

export type TransactionStatus = z.infer<typeof transactionStatusSchema>;

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
    pending: "Pending",
    completed: "Completed",
    failed: "Failed",
};

/**
 * Wire shape of a Platform API transaction, vendored from
 * `common/schemas/platform/transaction.platform.schema.ts` in the kick repo.
 * `date` is the calendar day the money moved, as a date-only string
 * (YYYY-MM-DD).
 */
export const platformTransactionSchema = z.object({
    id: z.string().uuid(),
    entityId: z.string().uuid(),
    date: z.string().date(),
    amount: z.number(),
    bankDescription: z.string(),
    memo: z.string().nullable(),
    type: transactionTypeSchema,
    status: transactionStatusSchema,
    accountId: z.string().uuid().nullable(),
    accrualAccountId: z.string().uuid().nullable(),
    isBusiness: z.boolean(),
    classIds: z.array(z.string().uuid()),
});

export type PlatformTransaction = z.infer<typeof platformTransactionSchema>;

/**
 * Transactions are read across every entity in a workspace, so the routes are
 * nested under the workspace uuid.
 */
export const platformTransactionsPathParamsSchema = z.object({
    workspaceId: z.string().uuid(),
});

export const platformTransactionPathParamsSchema =
    platformTransactionsPathParamsSchema.extend({
        transactionId: z.string().uuid(),
    });

/** `startDate`/`endDate` are inclusive calendar days. */
export const platformTransactionsListQuerySchema =
    platformPaginationQuerySchema.extend({
        startDate: z.string().date().optional(),
        endDate: z.string().date().optional(),
    });

export type PlatformTransactionsListQuery = z.infer<
    typeof platformTransactionsListQuerySchema
>;

export const platformTransactionsListResponseSchema = z.object({
    data: z.array(platformTransactionSchema),
    pagination: platformPaginationSchema,
});

export type PlatformTransactionsListResponse = z.infer<
    typeof platformTransactionsListResponseSchema
>;

export const platformTransactionResponseSchema = z.object({
    transaction: platformTransactionSchema,
});

export type PlatformTransactionResponse = z.infer<
    typeof platformTransactionResponseSchema
>;

/**
 * Every field is optional and only the ones present in the body are touched,
 * so the demo can change a transaction's account without reading and resending
 * the rest. `null` is the explicit "clear this" value. Inside a locked
 * bookkeeping period only `memo` can be changed; anything else answers 409.
 *
 * The demo's UI only ever sends `accountId`, but the whole upstream body is
 * vendored so `shared/` stays a faithful mirror of the Platform API.
 */
export const platformTransactionUpdateBodySchema = z.object({
    classIds: z.array(z.string().uuid()).max(10).optional(),
    memo: z.string().max(1000).nullable().optional(),
    accountId: z.string().uuid().nullable().optional(),
    accrualAccountId: z.string().uuid().nullable().optional(),
});

export type PlatformTransactionUpdateBody = z.infer<
    typeof platformTransactionUpdateBodySchema
>;
