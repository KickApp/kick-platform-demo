import { z } from "zod";
import {
    platformPaginationQuerySchema,
    platformPaginationSchema,
} from "./pagination.schema";

/**
 * Legal types the Platform API accepts for entities.
 */
export const ENTITY_LEGAL_TYPES = [
    "sole_proprietorship",
    "smllc",
    "mmllc",
    "s_corp",
    "partnership",
    "c_corp",
    "no_legal_entity",
] as const;

export const entityLegalTypeSchema = z.enum(ENTITY_LEGAL_TYPES);

export type EntityLegalType = z.infer<typeof entityLegalTypeSchema>;

export const ENTITY_LEGAL_TYPE_LABELS: Record<EntityLegalType, string> = {
    sole_proprietorship: "Sole proprietorship",
    smllc: "Single-member LLC",
    mmllc: "Multi-member LLC",
    s_corp: "S corporation",
    partnership: "Partnership",
    c_corp: "C corporation",
    no_legal_entity: "No legal entity",
};

/**
 * Wire shape of a Platform API entity. `bookkeepingStartDate` is a date-only
 * string (YYYY-MM-DD); `createdAt` is an ISO-8601 datetime string.
 */
export const platformEntitySchema = z.object({
    id: z.string().uuid(),
    workspaceId: z.string().uuid(),
    name: z.string().nullable(),
    legalType: entityLegalTypeSchema.nullable(),
    bookkeepingStartDate: z.string(),
    createdAt: z.string(),
});

export type PlatformEntity = z.infer<typeof platformEntitySchema>;

export const platformEntityPathParamsSchema = z.object({
    entityId: z.string().uuid(),
});

export const platformEntitiesListQuerySchema =
    platformPaginationQuerySchema.extend({
        workspaceId: z.string().uuid(),
    });

export type PlatformEntitiesListQuery = z.infer<
    typeof platformEntitiesListQuerySchema
>;

export const platformEntitiesListResponseSchema = z.object({
    data: z.array(platformEntitySchema),
    pagination: platformPaginationSchema,
});

export type PlatformEntitiesListResponse = z.infer<
    typeof platformEntitiesListResponseSchema
>;

export const platformEntityResponseSchema = z.object({
    entity: platformEntitySchema,
});

export type PlatformEntityResponse = z.infer<
    typeof platformEntityResponseSchema
>;

/**
 * Chart of accounts setup for a new entity, defaulting to `standard` when
 * omitted. `custom` seeds only the accounts Kick automations require —
 * clearing accounts, uncategorized income and expenses — and leaves the rest
 * of the chart to be created through the chart of accounts routes.
 */
export const CHART_OF_ACCOUNTS_SETUP_TYPES = ["standard", "custom"] as const;

export const platformChartOfAccountsSetupSchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("standard") }),
    z.object({ type: z.literal("custom") }),
]);

export type PlatformChartOfAccountsSetup = z.infer<
    typeof platformChartOfAccountsSetupSchema
>;

export type ChartOfAccountsSetupType = PlatformChartOfAccountsSetup["type"];

export const CHART_OF_ACCOUNTS_SETUP_LABELS: Record<
    ChartOfAccountsSetupType,
    string
> = {
    standard: "Standard Kick chart",
    custom: "Custom chart",
};

export const CHART_OF_ACCOUNTS_SETUP_HINTS: Record<
    ChartOfAccountsSetupType,
    string
> = {
    standard: "Seeds the full standard Kick chart of accounts.",
    custom: "Seeds only the accounts Kick automations require; you create the rest yourself.",
};

export const createPlatformEntityBodySchema = z.object({
    workspaceId: z.string().uuid(),
    name: z.string().min(1).max(200),
    legalType: entityLegalTypeSchema,
    bookkeepingStartDate: z.string().date(),
    chartOfAccounts: platformChartOfAccountsSetupSchema.optional(),
});

export type CreatePlatformEntityBody = z.infer<
    typeof createPlatformEntityBodySchema
>;
