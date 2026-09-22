import { z } from "zod";
import { platformAccountingMigrationSchema } from "./accounting-migration.schema";
import {
    PLATFORM_BULK_CREATE_JOURNAL_ENTRIES_MAX_ITEMS,
    platformJournalEntryCreateBodySchema,
    platformJournalEntrySchema,
} from "./journal-entry.schema";

/**
 * Demo-only shapes for the BFF's accounting-migration orchestration route,
 * kept out of the mirror schemas: the journal entries reuse the vendored
 * Platform API write shape, but the envelope exists only in this demo.
 */
export const runAccountingMigrationBodySchema = z.object({
    entityId: z.string().uuid(),
    journalEntries: z
        .array(platformJournalEntryCreateBodySchema)
        .min(1)
        .max(PLATFORM_BULK_CREATE_JOURNAL_ENTRIES_MAX_ITEMS),
});

export type RunAccountingMigrationBody = z.infer<
    typeof runAccountingMigrationBodySchema
>;

export const runAccountingMigrationResponseSchema = z.object({
    accountingMigration: platformAccountingMigrationSchema,
    journalEntries: z.array(platformJournalEntrySchema),
});

export type RunAccountingMigrationResponse = z.infer<
    typeof runAccountingMigrationResponseSchema
>;
