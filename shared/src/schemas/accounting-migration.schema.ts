import { z } from "zod";

/**
 * Wire shape of a Platform API accounting migration. An entity keeps at most
 * one, so the resource is singular under the entity uuid. The one milestone a
 * partner acts on is `enrichmentRulesSeededAt`: it stays null until the
 * transaction-rule generation triggered from this resource has finished, at
 * which point automatic transaction enrichment resumes.
 */
export const platformAccountingMigrationSchema = z.object({
    id: z.string().uuid(),
    enrichmentRulesSeededAt: z.string().nullable(),
    createdAt: z.string(),
});

export type PlatformAccountingMigration = z.infer<
    typeof platformAccountingMigrationSchema
>;

export const platformAccountingMigrationPathParamsSchema = z.object({
    entityId: z.string().uuid(),
});

export const platformAccountingMigrationResponseSchema = z.object({
    accountingMigration: platformAccountingMigrationSchema,
});

export type PlatformAccountingMigrationResponse = z.infer<
    typeof platformAccountingMigrationResponseSchema
>;
