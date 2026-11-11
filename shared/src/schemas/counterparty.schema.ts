import { z } from "zod";
import { errorMessageSchema } from "./error.schema";
import {
    platformPaginationQuerySchema,
    platformPaginationSchema,
} from "./pagination.schema";

/**
 * Where a counterparty comes from: created in Kick (`manual`), imported from
 * an integration, or detected from transactions (`enrichment`). The list grows
 * with Kick's integrations.
 */
export const COUNTERPARTY_SOURCES = [
    "manual",
    "ramp",
    "stripe",
    "mercury",
    "quickbooks",
    "billcom",
    "enrichment",
] as const;

export const counterpartySourceSchema = z.enum(COUNTERPARTY_SOURCES);

export type CounterpartySource = z.infer<typeof counterpartySourceSchema>;

export const COUNTERPARTY_SOURCE_LABELS: Record<CounterpartySource, string> = {
    manual: "Manual",
    ramp: "Ramp",
    stripe: "Stripe",
    mercury: "Mercury",
    quickbooks: "QuickBooks",
    billcom: "Bill.com",
    enrichment: "Detected by Kick",
};

/** Null on the wire lets Kick infer the direction from the counterparty's transactions. */
export const COUNTERPARTY_DIRECTION_OVERRIDES = ["vendor", "customer"] as const;

export const counterpartyDirectionOverrideSchema = z.enum(
    COUNTERPARTY_DIRECTION_OVERRIDES,
);

export type CounterpartyDirectionOverride = z.infer<
    typeof counterpartyDirectionOverrideSchema
>;

export const COUNTERPARTY_DIRECTION_OVERRIDE_LABELS: Record<
    CounterpartyDirectionOverride,
    string
> = {
    vendor: "Vendor",
    customer: "Customer",
};

export const FEDERAL_TAX_CLASSIFICATIONS = [
    "individual",
    "partnership",
    "c_corp",
    "s_corp",
    "trust_estate",
    "llc_partnership",
    "llc_c_corp",
    "llc_s_corp",
    "other",
] as const;

export const federalTaxClassificationSchema = z.enum(
    FEDERAL_TAX_CLASSIFICATIONS,
);

export type FederalTaxClassification = z.infer<
    typeof federalTaxClassificationSchema
>;

export const FEDERAL_TAX_CLASSIFICATION_LABELS: Record<
    FederalTaxClassification,
    string
> = {
    individual: "Individual / sole proprietor",
    partnership: "Partnership",
    c_corp: "C corporation",
    s_corp: "S corporation",
    trust_estate: "Trust / estate",
    llc_partnership: "LLC taxed as a partnership",
    llc_c_corp: "LLC taxed as a C corporation",
    llc_s_corp: "LLC taxed as an S corporation",
    other: "Other",
};

/**
 * Wire shape of a Platform API counterparty. `isGlobal` marks a shared Kick
 * directory entry the workspace uses rather than one it owns; those can't be
 * updated. Timestamps are ISO-8601 strings, and a non-null `disabledAt` means
 * the counterparty can't be assigned to transactions.
 */
export const platformCounterpartySchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    companyName: z.string().nullable(),
    isGlobal: z.boolean(),
    source: counterpartySourceSchema.nullable(),
    email: z.string().nullable(),
    phoneNumber: z.string().nullable(),
    website: z.string().nullable(),
    street: z.string().nullable(),
    street2: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    postalCode: z.string().nullable(),
    country: z.string().nullable(),
    directionOverride: counterpartyDirectionOverrideSchema.nullable(),
    isEligible1099: z.boolean().nullable(),
    federalTaxClassification: federalTaxClassificationSchema.nullable(),
    note: z.string().nullable(),
    disabledAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export type PlatformCounterparty = z.infer<typeof platformCounterpartySchema>;

export const platformCounterpartiesPathParamsSchema = z.object({
    workspaceId: z.string().uuid(),
});

export const platformCounterpartyPathParamsSchema =
    platformCounterpartiesPathParamsSchema.extend({
        counterpartyId: z.string().uuid(),
    });

/**
 * Sorted by name, or by relevance when `search` is set (matched against the
 * name and its aliases). Only enabled counterparties unless `includeDisabled`.
 */
export const platformCounterpartiesListQuerySchema =
    platformPaginationQuerySchema.extend({
        search: z.string().trim().min(1).max(200).optional(),
        includeDisabled: z.enum(["true", "false"]).optional(),
    });

export type PlatformCounterpartiesListQuery = z.infer<
    typeof platformCounterpartiesListQuerySchema
>;

export const platformCounterpartiesListResponseSchema = z.object({
    data: z.array(platformCounterpartySchema),
    pagination: platformPaginationSchema,
});

export type PlatformCounterpartiesListResponse = z.infer<
    typeof platformCounterpartiesListResponseSchema
>;

export const platformCounterpartyResponseSchema = z.object({
    counterparty: platformCounterpartySchema,
});

export const COUNTERPARTY_TEXT_MAX_LENGTH = 255;
export const COUNTERPARTY_NOTE_MAX_LENGTH = 5000;

const optionalTextSchema = z
    .string()
    .max(COUNTERPARTY_TEXT_MAX_LENGTH)
    .nullable()
    .optional();

/**
 * Only the fields present are touched and `null` clears one. Names are unique
 * within the workspace (409 `duplicate_name`), and a global counterparty
 * answers 400. Kick also rejects a website that isn't an http(s) link or bare
 * domain and a note containing HTML tags; those checks are left to its 400.
 */
export const platformCounterpartyUpdateBodySchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(1)
            .max(COUNTERPARTY_TEXT_MAX_LENGTH)
            .optional(),
        companyName: optionalTextSchema,
        email: z
            .string()
            .email()
            .max(COUNTERPARTY_TEXT_MAX_LENGTH)
            .nullable()
            .optional(),
        phoneNumber: optionalTextSchema,
        website: optionalTextSchema,
        street: optionalTextSchema,
        street2: optionalTextSchema,
        city: optionalTextSchema,
        state: optionalTextSchema,
        postalCode: optionalTextSchema,
        country: optionalTextSchema,
        directionOverride: counterpartyDirectionOverrideSchema
            .nullable()
            .optional(),
        isEligible1099: z.boolean().nullable().optional(),
        federalTaxClassification: federalTaxClassificationSchema
            .nullable()
            .optional(),
        note: z
            .string()
            .max(COUNTERPARTY_NOTE_MAX_LENGTH)
            .nullable()
            .optional(),
        isDisabled: z.boolean().optional(),
    })
    .strict();

export type PlatformCounterpartyUpdateBody = z.infer<
    typeof platformCounterpartyUpdateBodySchema
>;

/**
 * `force=true` deletes a counterparty that transactions are assigned to,
 * leaving them without one. `disableInsteadOfDelete=true` disables a
 * counterparty that can't be deleted (used in a locked period, or linked to
 * bills or invoices). Kick defaults both to `false`.
 */
export const platformCounterpartyDeleteQuerySchema = z
    .object({
        force: z.enum(["true", "false"]).optional(),
        disableInsteadOfDelete: z.enum(["true", "false"]).optional(),
    })
    .strict();

export type PlatformCounterpartyDeleteQuery = z.infer<
    typeof platformCounterpartyDeleteQuerySchema
>;

/**
 * Moves everything assigned to `counterpartyToMergeId` onto
 * `counterpartyToKeepId`, then removes the former from the workspace. The
 * upstream "can't merge into itself" refine is left off, like the other
 * top-level refines; Kick enforces it anyway.
 */
export const platformCounterpartyMergeBodySchema = z
    .object({
        counterpartyToMergeId: z.string().uuid(),
        counterpartyToKeepId: z.string().uuid(),
        disableCounterpartyToMerge: z.boolean().optional(),
    })
    .strict();

export type PlatformCounterpartyMergeBody = z.infer<
    typeof platformCounterpartyMergeBodySchema
>;

/**
 * Why a counterparty write conflicts. Vendored like the other enums: a reason
 * Kick adds upstream fails the BFF's response validation until it is copied
 * here.
 */
export const COUNTERPARTY_CONFLICT_REASONS = [
    "transactions_found",
    "locked_transactions_found",
    "bill_or_invoice_links_found",
    "linked_data_found",
    "duplicate_name",
] as const;

export const counterpartyConflictReasonSchema = z.enum(
    COUNTERPARTY_CONFLICT_REASONS,
);

export type CounterpartyConflictReason = z.infer<
    typeof counterpartyConflictReasonSchema
>;

/**
 * The 409 body of the counterparty writes: the usual `{ message }` plus a
 * `reason` that decides which retry, if any, makes sense.
 */
export const platformCounterpartyConflictSchema = errorMessageSchema.extend({
    reason: counterpartyConflictReasonSchema,
});

export type PlatformCounterpartyConflict = z.infer<
    typeof platformCounterpartyConflictSchema
>;
