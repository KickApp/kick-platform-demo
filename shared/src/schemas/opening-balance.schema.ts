import { z } from "zod";
import {
    platformPaginationQuerySchema,
    platformPaginationSchema,
} from "./pagination.schema";

/**
 * An account's opening balance state has two independent parts:
 *
 * - the main opening balance, one or more lines booked before the bookkeeping
 *   start date against a clearing (equity) account;
 * - the adjustment, a single amount booked on the bookkeeping start date. It
 *   can exist without a main opening balance.
 *
 * Both parts are keyed by the account they belong to. Balances use the
 * account's natural sign: a positive amount increases the account (debit for
 * assets and expenses, credit for liabilities, equity and income).
 */
export const platformOpeningBalanceLineSchema = z.object({
    balance: z.number(),
    description: z.string().nullable(),
});

export type PlatformOpeningBalanceLine = z.infer<
    typeof platformOpeningBalanceLineSchema
>;

/** `balance` is the sum of the lines; `description` is the clearing side's. */
export const platformMainOpeningBalanceSchema = z.object({
    date: z.string(),
    balance: z.number(),
    lines: z.array(platformOpeningBalanceLineSchema),
    clearingAccountId: z.string().uuid(),
    description: z.string().nullable(),
});

export type PlatformMainOpeningBalance = z.infer<
    typeof platformMainOpeningBalanceSchema
>;

/** Always dated on the bookkeeping start date. */
export const platformOpeningBalanceAdjustmentSchema = z.object({
    date: z.string(),
    balance: z.number(),
    clearingAccountId: z.string().uuid(),
    description: z.string().nullable(),
});

export type PlatformOpeningBalanceAdjustment = z.infer<
    typeof platformOpeningBalanceAdjustmentSchema
>;

export const platformAccountOpeningBalanceSchema = z.object({
    accountId: z.string().uuid(),
    openingBalance: platformMainOpeningBalanceSchema.nullable(),
    adjustment: platformOpeningBalanceAdjustmentSchema.nullable(),
});

export type PlatformAccountOpeningBalance = z.infer<
    typeof platformAccountOpeningBalanceSchema
>;

export const platformOpeningBalancesPathParamsSchema = z.object({
    entityId: z.string().uuid(),
});

export const platformOpeningBalancePathParamsSchema =
    platformOpeningBalancesPathParamsSchema.extend({
        accountId: z.string().uuid(),
    });

export const platformOpeningBalancesListQuerySchema =
    platformPaginationQuerySchema;

export type PlatformOpeningBalancesListQuery = z.infer<
    typeof platformOpeningBalancesListQuerySchema
>;

/** Only accounts with a main opening balance, an adjustment, or both. */
export const platformOpeningBalancesListResponseSchema = z.object({
    data: z.array(platformAccountOpeningBalanceSchema),
    pagination: platformPaginationSchema,
});

export type PlatformOpeningBalancesListResponse = z.infer<
    typeof platformOpeningBalancesListResponseSchema
>;

export const platformAccountOpeningBalanceResponseSchema = z.object({
    accountOpeningBalance: platformAccountOpeningBalanceSchema,
});

export type PlatformAccountOpeningBalanceResponse = z.infer<
    typeof platformAccountOpeningBalanceResponseSchema
>;

export const PLATFORM_OPENING_BALANCE_MAX_LINES = 100;
export const PLATFORM_BULK_SET_OPENING_BALANCES_MAX_ITEMS = 100;

/** The upstream bound of the monetary column; larger amounts answer 400. */
export const PLATFORM_OPENING_BALANCE_MAX_AMOUNT = 999_999_999_999;

/** Kick books to the cent, so an amount that rounds to zero is refused. */
export function isNonzeroInCents(amount: number): boolean {
    return Math.round(amount * 100) !== 0;
}

const platformNonzeroBalanceSchema = z
    .number()
    .min(-PLATFORM_OPENING_BALANCE_MAX_AMOUNT)
    .max(PLATFORM_OPENING_BALANCE_MAX_AMOUNT)
    .refine(isNonzeroInCents, {
        message: "Amount must be nonzero when rounded to cents",
    });

const platformOpeningBalanceDescriptionSchema = z
    .string()
    .trim()
    .max(500)
    .nullable()
    .optional();

/**
 * `date` defaults to the day before the bookkeeping start date and must fall
 * before it — the linked bank account's start date when there is one,
 * otherwise the entity's. `clearingAccountId` defaults to the retained
 * earnings (or owner's capital) account and must differ from the account
 * itself. Like the other write bodies this stays a plain object; the rules
 * that depend on the bookkeeping start date live in Kick's write service.
 */
export const platformOpeningBalanceSetBodySchema = z.object({
    date: z.string().date().optional(),
    clearingAccountId: z.string().uuid().optional(),
    description: platformOpeningBalanceDescriptionSchema,
    lines: z
        .array(
            z.object({
                balance: platformNonzeroBalanceSchema,
                description: platformOpeningBalanceDescriptionSchema,
            }),
        )
        .min(1)
        .max(PLATFORM_OPENING_BALANCE_MAX_LINES),
});

export type PlatformOpeningBalanceSetBody = z.infer<
    typeof platformOpeningBalanceSetBodySchema
>;

/**
 * `date` must equal the bookkeeping start date, which is also the default.
 * `clearingAccountId` defaults to the current adjustment's clearing account,
 * then the main opening balance's, then retained earnings.
 */
export const platformOpeningBalanceAdjustmentSetBodySchema = z.object({
    balance: platformNonzeroBalanceSchema,
    date: z.string().date().optional(),
    clearingAccountId: z.string().uuid().optional(),
    description: platformOpeningBalanceDescriptionSchema,
});

export type PlatformOpeningBalanceAdjustmentSetBody = z.infer<
    typeof platformOpeningBalanceAdjustmentSetBodySchema
>;

/**
 * Each item carries a main opening balance, an adjustment, or both; a part
 * left out is untouched. Upstream also refuses an item with neither and an
 * account listed twice — those refines are left off here and Kick enforces
 * them.
 */
export const platformBulkOpeningBalanceItemSchema = z.object({
    accountId: z.string().uuid(),
    openingBalance: platformOpeningBalanceSetBodySchema.optional(),
    adjustment: platformOpeningBalanceAdjustmentSetBodySchema.optional(),
});

export type PlatformBulkOpeningBalanceItem = z.infer<
    typeof platformBulkOpeningBalanceItemSchema
>;

export const platformBulkSetOpeningBalancesBodySchema = z.object({
    openingBalances: z
        .array(platformBulkOpeningBalanceItemSchema)
        .min(1)
        .max(PLATFORM_BULK_SET_OPENING_BALANCES_MAX_ITEMS),
});

export type PlatformBulkSetOpeningBalancesBody = z.infer<
    typeof platformBulkSetOpeningBalancesBodySchema
>;

export const platformBulkSetOpeningBalancesResponseSchema = z.object({
    data: z.array(platformAccountOpeningBalanceSchema),
});

export type PlatformBulkSetOpeningBalancesResponse = z.infer<
    typeof platformBulkSetOpeningBalancesResponseSchema
>;
