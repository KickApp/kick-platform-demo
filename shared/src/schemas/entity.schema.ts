import { z } from "zod";
import {
    platformMetadataSchema,
    platformMetadataWireSchema,
} from "./metadata.schema";
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

/** Industries an entity's business can operate in. */
export const ENTITY_INDUSTRIES = [
    "accountant",
    "agency",
    "bookkeeper",
    "construction",
    "consulting",
    "content",
    "crypto",
    "trucking",
    "financial_advisor",
    "investor",
    "legal",
    "manufacturing",
    "medical",
    "non_profit",
    "physical_goods",
    "property_management",
    "psychologist",
    "real_estate_agent",
    "real_estate_investor",
    "restaurant",
    "retail",
    "saas",
    "tradeperson",
    "entertainment",
    "other",
] as const;

export const entityIndustrySchema = z.enum(ENTITY_INDUSTRIES);

export type EntityIndustry = z.infer<typeof entityIndustrySchema>;

/** Business address of an entity; Kick only stores US addresses. */
export const platformEntityAddressSchema = z.object({
    street: z.string(),
    street2: z.string().nullable(),
    city: z.string(),
    state: z.string().nullable(),
    postalCode: z.string(),
    country: z.string(),
});

export type PlatformEntityAddress = z.infer<typeof platformEntityAddressSchema>;

/**
 * Wire shape of a Platform API entity. `bookkeepingStartDate` is a date-only
 * string (YYYY-MM-DD); `createdAt` is an ISO-8601 datetime string. `logoUrl`
 * is read-only: the logo is managed in Kick.
 */
export const platformEntitySchema = z.object({
    id: z.string().uuid(),
    workspaceId: z.string().uuid(),
    name: z.string().nullable(),
    legalType: entityLegalTypeSchema.nullable(),
    bookkeepingStartDate: z.string(),
    description: z.string().nullable(),
    website: z.string().nullable(),
    industries: z.array(entityIndustrySchema),
    industryOther: z.string().nullable(),
    address: platformEntityAddressSchema.nullable(),
    logoUrl: z.string().nullable(),
    metadata: platformMetadataWireSchema,
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

export const createPlatformEntityBodySchema = z
    .object({
        workspaceId: z.string().uuid(),
        name: z.string().min(1).max(200),
        legalType: entityLegalTypeSchema,
        bookkeepingStartDate: z.string().date(),
        chartOfAccounts: platformChartOfAccountsSetupSchema.optional(),
    })
    .strict();

export type CreatePlatformEntityBody = z.infer<
    typeof createPlatformEntityBodySchema
>;

/**
 * Replaces the stored address in full. `state` takes a 2-letter code or a
 * full US state name, which Kick normalizes to the code (and rejects anything
 * else with 400); `country` is always set to `US` upstream.
 */
export const platformEntityAddressBodySchema = z
    .object({
        street: z.string().trim().min(1).max(200),
        street2: z.string().trim().max(200).nullable().optional(),
        city: z.string().trim().min(1).max(100),
        state: z.string(),
        postalCode: z
            .string()
            .regex(/^\d{5}$/, "postalCode must be a 5-digit US ZIP code"),
    })
    .strict();

/**
 * Only the fields present in the body are touched; an empty body answers 400.
 * `null` clears `description`, `website` or `industryOther`; `industries`
 * replaces the stored list and needs at least one value; `metadata` replaces
 * the stored object in full. Changing `bookkeepingStartDate` regenerates the
 * entity's journal entries and is refused while accounts under the entity
 * have opening balances or bank reconciliations.
 */
export const updatePlatformEntityBodySchema = z
    .object({
        name: z.string().min(1).max(200).optional(),
        bookkeepingStartDate: z.string().date().optional(),
        description: z.string().max(2000).nullable().optional(),
        website: z.string().max(500).nullable().optional(),
        industries: z.array(entityIndustrySchema).min(1).optional(),
        industryOther: z.string().max(200).nullable().optional(),
        address: platformEntityAddressBodySchema.optional(),
        metadata: platformMetadataSchema.optional(),
    })
    .strict();

export type UpdatePlatformEntityBody = z.infer<
    typeof updatePlatformEntityBodySchema
>;
