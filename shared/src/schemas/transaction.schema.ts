import { z } from "zod";
import { platformCounterpartySchema } from "./counterparty.schema";
import {
    platformPaginationQuerySchema,
    platformPaginationSchema,
} from "./pagination.schema";
import {
    arrayQueryParamSchema,
    uuidArrayQueryParamSchema,
} from "./query.schema";

/**
 * Provenance of a transaction, i.e. where the Platform API sourced it from.
 */
export const TRANSACTION_TYPES = [
    "plaid",
    "stripe",
    "imported",
    "ramp",
    "mercury",
    "paypal",
    "manual",
    "check",
    "deposit",
    "gusto",
    "billcom",
    "adp_run",
    "relay",
] as const;

export const transactionTypeSchema = z.enum(TRANSACTION_TYPES);

export type TransactionType = z.infer<typeof transactionTypeSchema>;

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
    plaid: "Plaid",
    stripe: "Stripe",
    imported: "Imported",
    ramp: "Ramp",
    mercury: "Mercury",
    paypal: "PayPal",
    manual: "Manual",
    check: "Check",
    deposit: "Deposit",
    gusto: "Gusto",
    billcom: "Bill.com",
    adp_run: "ADP RUN",
    relay: "Relay",
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
 * Transaction fields that can be marked as reviewed, named after the wire
 * fields they cover (`accountId` → `account`, `classIds` → `classes`, ...).
 */
export const TRANSACTION_REVIEW_FIELDS = [
    "account",
    "accrualAccount",
    "classes",
    "counterparty",
    "entity",
    "memo",
] as const;

export const transactionReviewFieldSchema = z.enum(TRANSACTION_REVIEW_FIELDS);

export type TransactionReviewField = z.infer<
    typeof transactionReviewFieldSchema
>;

/** `reviewedAt` is an ISO-8601 datetime string. */
export const platformTransactionReviewSchema = z.object({
    field: transactionReviewFieldSchema,
    reviewedAt: z.string(),
});

export type PlatformTransactionReview = z.infer<
    typeof platformTransactionReviewSchema
>;

/**
 * A transaction without its relations. `date` is the calendar day the money
 * moved, as a date-only string (YYYY-MM-DD). `pairedTransferId` is the other
 * side of a transfer between two accounts of the workspace, null when the
 * transaction is not paired. `counterpartyId` is null when no counterparty is
 * assigned, and also when the assigned one isn't visible to the organization
 * through the counterparties routes.
 *
 * `bankDescription` is the text as it arrived from the bank or provider, and
 * `overrideDescription` a custom replacement, null when none is set.
 * `description` is the one to show: the override when set, otherwise the bank
 * description. On a line of a split transaction `overrideDescription` is the
 * line's label, which is edited in Kick and can't be written here.
 */
export const platformPairedTransactionSchema = z.object({
    id: z.string().uuid(),
    entityId: z.string().uuid(),
    date: z.string().date(),
    amount: z.number(),
    bankDescription: z.string(),
    description: z.string(),
    overrideDescription: z.string().nullable(),
    memo: z.string().nullable(),
    type: transactionTypeSchema,
    status: transactionStatusSchema,
    accountId: z.string().uuid().nullable(),
    accrualAccountId: z.string().uuid().nullable(),
    isBusiness: z.boolean(),
    classIds: z.array(z.string().uuid()),
    pairedTransferId: z.string().uuid().nullable(),
    counterpartyId: z.string().uuid().nullable(),
});

/**
 * Wire shape of a Platform API transaction. `reviews` (one entry per reviewed
 * field, sorted by field), `pairedTransfer` and `counterparty` (the row
 * `counterpartyId` points at, in the counterparties routes' shape) are
 * present only when asked for through `relations`.
 */
export const platformTransactionSchema = platformPairedTransactionSchema.extend(
    {
        reviews: z.array(platformTransactionReviewSchema).optional(),
        pairedTransfer: platformPairedTransactionSchema.nullable().optional(),
        counterparty: platformCounterpartySchema.nullable().optional(),
    },
);

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

export const TRANSACTION_RELATIONS = [
    "reviews",
    "pairedTransfer",
    "counterparty",
] as const;

export type TransactionRelation = (typeof TRANSACTION_RELATIONS)[number];

const transactionRelationsQueryParamSchema = arrayQueryParamSchema(
    z.enum(TRANSACTION_RELATIONS),
);

export const platformTransactionRelationsQuerySchema = z
    .object({
        relations: transactionRelationsQueryParamSchema,
    })
    .strict();

export const TRANSACTION_DIRECTIONS = ["money_in", "money_out"] as const;

export const REVIEW_FIELDS_MODES = ["any", "every"] as const;

/**
 * `startDate`/`endDate` are inclusive calendar days. `ids` fetches specific
 * transactions, at most 100 per request; ids that don't match a visible
 * transaction of the workspace are left out rather than rejected. An entity,
 * account or class outside the workspace answers 400. `minAmount` and
 * `maxAmount` compare absolute amounts; `direction` picks the sign.
 * `reviewedFields` combine per `reviewedFieldsMode` (default `any`) and
 * `unreviewedFields` per `unreviewedFieldsMode` (default `every`).
 */
export const platformTransactionsListQuerySchema =
    platformPaginationQuerySchema.extend({
        relations: transactionRelationsQueryParamSchema,
        startDate: z.string().date().optional(),
        endDate: z.string().date().optional(),
        ids: arrayQueryParamSchema(z.string().uuid(), { maxItems: 100 }),
        entityIds: uuidArrayQueryParamSchema,
        accountIds: uuidArrayQueryParamSchema,
        accrualAccountIds: uuidArrayQueryParamSchema,
        classIds: uuidArrayQueryParamSchema,
        minAmount: z.coerce.number().optional(),
        maxAmount: z.coerce.number().optional(),
        status: transactionStatusSchema.optional(),
        types: arrayQueryParamSchema(transactionTypeSchema),
        direction: z.enum(TRANSACTION_DIRECTIONS).optional(),
        reviewedFields: arrayQueryParamSchema(transactionReviewFieldSchema),
        reviewedFieldsMode: z.enum(REVIEW_FIELDS_MODES).default("any"),
        unreviewedFields: arrayQueryParamSchema(transactionReviewFieldSchema),
        unreviewedFieldsMode: z.enum(REVIEW_FIELDS_MODES).default("every"),
    });

export type PlatformTransactionsListQuery = z.input<
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
 * `counterpartyId` answers 400 for a disabled, unknown or invisible
 * counterparty, and for a transaction matched to a bill or invoice.
 * `overrideDescription` is trimmed by Kick, `null` or an empty string clears
 * it, and a line of a split transaction answers 400.
 *
 * The demo's UI only ever sends `accountId`, `counterpartyId` or
 * `overrideDescription`, but the whole
 * upstream body is vendored so `shared/` stays a faithful mirror of the
 * Platform API.
 */
export const platformTransactionUpdateBodySchema = z
    .object({
        classIds: z.array(z.string().uuid()).max(10).optional(),
        memo: z.string().max(1000).nullable().optional(),
        overrideDescription: z.string().max(1000).nullable().optional(),
        accountId: z.string().uuid().nullable().optional(),
        accrualAccountId: z.string().uuid().nullable().optional(),
        counterpartyId: z.string().uuid().nullable().optional(),
    })
    .strict();

export type PlatformTransactionUpdateBody = z.infer<
    typeof platformTransactionUpdateBodySchema
>;
