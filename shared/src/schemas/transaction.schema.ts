import { z } from "zod";
import {
    platformPaginationQuerySchema,
    platformPaginationSchema,
} from "./pagination.schema";

/**
 * Provenance of a transaction, i.e. where the Platform API sourced it from.
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
 * Wire shape of a Platform API transaction. `date` is the calendar day the
 * money moved, as a date-only string (YYYY-MM-DD).
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
