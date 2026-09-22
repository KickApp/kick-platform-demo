import { z } from "zod";
import {
    platformPaginationQuerySchema,
    platformPaginationSchema,
} from "./pagination.schema";
import {
    journalEntrySourceTypeSchema,
    ledgerBasisSchema,
} from "./report.schema";

/**
 * Journal entries on the Platform API are the manual journal entries a partner
 * authors and manages — the double-entry lines of one accounting ledger.
 * Auto-generated postings (bank transactions, bills, invoices, opening
 * balances, loans) are not part of this surface; the General Ledger report
 * exposes those. Accounts are identified by their uuid and chart of accounts
 * code — internal auto-increment ids never leave Kick.
 */
export const platformJournalEntryLineSchema = z.object({
    accountId: z.string().uuid(),
    accountCode: z.number().int(),
    accountName: z.string(),
    debitAmount: z.number().nullable(),
    creditAmount: z.number().nullable(),
    memo: z.string().nullable(),
    description: z.string().nullable(),
    classIds: z.array(z.string().uuid()),
});

export type PlatformJournalEntryLine = z.infer<
    typeof platformJournalEntryLineSchema
>;

/**
 * The source kind is always a manual journal entry on this surface; it is kept
 * on the payload so a partner can tell these apart from the mixed-source lines
 * of the General Ledger report.
 */
export const platformJournalEntrySchema = z.object({
    id: z.string().uuid(),
    entityId: z.string().uuid(),
    date: z.string(),
    dateOnly: z.string().nullable().optional(),
    memo: z.string().nullable(),
    ledgerBasis: ledgerBasisSchema,
    sourceType: journalEntrySourceTypeSchema,
    lines: z.array(platformJournalEntryLineSchema),
});

export type PlatformJournalEntry = z.infer<typeof platformJournalEntrySchema>;

export const platformJournalEntriesPathParamsSchema = z.object({
    entityId: z.string().uuid(),
});

/**
 * `startDate`/`endDate` are inclusive calendar days in the ledger timezone.
 * Upstream also refines startDate <= endDate; the refine is left off here so
 * the query stays a ZodObject (Kick enforces the rule anyway).
 */
export const platformJournalEntriesListQuerySchema =
    platformPaginationQuerySchema.extend({
        startDate: z.string().date().optional(),
        endDate: z.string().date().optional(),
        ledgerBasis: ledgerBasisSchema.default("cash"),
    });

export type PlatformJournalEntriesListQuery = z.infer<
    typeof platformJournalEntriesListQuerySchema
>;

export const platformJournalEntriesListResponseSchema = z.object({
    data: z.array(platformJournalEntrySchema),
    pagination: platformPaginationSchema,
});

export type PlatformJournalEntriesListResponse = z.infer<
    typeof platformJournalEntriesListResponseSchema
>;

export const PLATFORM_JOURNAL_ENTRY_MIN_LINES = 2;
export const PLATFORM_JOURNAL_ENTRY_MAX_LINES = 500;
export const PLATFORM_JOURNAL_ENTRY_MAX_LINE_CLASSES = 10;

/**
 * Amounts are booked to the cent, so one cent is the smallest a line side can
 * be — matching the upstream inclusive minimum.
 */
export const PLATFORM_JOURNAL_ENTRY_MIN_AMOUNT = 0.01;

/**
 * Write payloads address accounts by uuid only: the numeric chart of accounts
 * code that the ledger stores alongside every line is resolved by Kick. The
 * line-level refine mirrors upstream: exactly one of debit/credit per line.
 */
export const platformJournalEntryWriteLineSchema = z
    .object({
        accountId: z.string().uuid(),
        debitAmount: z
            .number()
            .min(PLATFORM_JOURNAL_ENTRY_MIN_AMOUNT)
            .nullable(),
        creditAmount: z
            .number()
            .min(PLATFORM_JOURNAL_ENTRY_MIN_AMOUNT)
            .nullable(),
        description: z.string().max(500).default(""),
        classIds: z
            .array(z.string().uuid())
            .max(PLATFORM_JOURNAL_ENTRY_MAX_LINE_CLASSES)
            .default([]),
    })
    .refine(
        (line) => (line.debitAmount === null) !== (line.creditAmount === null),
        {
            message:
                "One of debitAmount or creditAmount must be null, but not both",
            path: ["debitAmount", "creditAmount"],
        },
    );

export type PlatformJournalEntryWriteLine = z.infer<
    typeof platformJournalEntryWriteLineSchema
>;

const platformJournalEntryLinesSchema = z
    .array(platformJournalEntryWriteLineSchema)
    .min(PLATFORM_JOURNAL_ENTRY_MIN_LINES)
    .max(PLATFORM_JOURNAL_ENTRY_MAX_LINES);

/**
 * The body stays a plain object — the "debits must equal credits" check lives
 * in Kick's write service, not a top-level refine.
 */
export const platformJournalEntryCreateBodySchema = z.object({
    date: z.string().date(),
    memo: z.string().max(1000).nullable().optional(),
    ledgerBasis: ledgerBasisSchema.default("cash"),
    lines: platformJournalEntryLinesSchema,
});

export type PlatformJournalEntryCreateBody = z.infer<
    typeof platformJournalEntryCreateBodySchema
>;

export const PLATFORM_BULK_CREATE_JOURNAL_ENTRIES_MAX_ITEMS = 100;

export const platformJournalEntriesBulkCreateBodySchema = z.object({
    journalEntries: z
        .array(platformJournalEntryCreateBodySchema)
        .min(1)
        .max(PLATFORM_BULK_CREATE_JOURNAL_ENTRIES_MAX_ITEMS),
});

export type PlatformJournalEntriesBulkCreateBody = z.infer<
    typeof platformJournalEntriesBulkCreateBodySchema
>;

export const platformJournalEntriesBulkCreateResponseSchema = z.object({
    data: z.array(platformJournalEntrySchema),
});

export type PlatformJournalEntriesBulkCreateResponse = z.infer<
    typeof platformJournalEntriesBulkCreateResponseSchema
>;
