import { z } from "zod";
import {
    platformPaginationQuerySchema,
    platformPaginationSchema,
} from "./pagination.schema";
import { uuidArrayQueryParamSchema } from "./query.schema";

export const CATALOG_ITEM_TYPES = ["service", "good"] as const;

export const catalogItemTypeSchema = z.enum(CATALOG_ITEM_TYPES);

export type CatalogItemType = z.infer<typeof catalogItemTypeSchema>;

export const CATALOG_ITEM_TYPE_LABELS: Record<CatalogItemType, string> = {
    service: "Service",
    good: "Good",
};

/**
 * Integration an item was imported from; null on the wire when it was
 * created in Kick. Grows with Kick's item imports.
 */
export const CATALOG_ITEM_SOURCES = ["quickbooks", "stripe"] as const;

export const catalogItemSourceSchema = z.enum(CATALOG_ITEM_SOURCES);

export type CatalogItemSource = z.infer<typeof catalogItemSourceSchema>;

export const CATALOG_ITEM_SOURCE_LABELS: Record<CatalogItemSource, string> = {
    quickbooks: "QuickBooks",
    stripe: "Stripe",
};

export const CATALOG_ITEM_STATUS_FILTERS = [
    "active",
    "archived",
    "all",
] as const;

export type CatalogItemStatusFilter =
    (typeof CATALOG_ITEM_STATUS_FILTERS)[number];

export const CATALOG_ITEM_CURRENCIES = ["usd"] as const;

/** Upstream bound for decimal(20,2) money columns. */
export const CATALOG_ITEM_MONETARY_MAX = 999_999_999_999;

/**
 * A price of a catalog item. Prices are immutable: `unitAmount` (major units,
 * dollars not cents) and `currency` never change. A price change is a new
 * price plus archiving or deleting the old one, in one item update. At most
 * one price is `isDefault`, and it is always active.
 */
export const platformCatalogItemPriceSchema = z.object({
    id: z.string().uuid(),
    unitAmount: z.number(),
    currency: z.string(),
    active: z.boolean(),
    isDefault: z.boolean(),
    description: z.string().nullable(),
    createdAt: z.string(),
});

export type PlatformCatalogItemPrice = z.infer<
    typeof platformCatalogItemPriceSchema
>;

/**
 * Wire shape of a catalog item: a product or service an entity sells on
 * invoices. Archived items (`active: false`) can't be added to new invoices
 * but stay on existing ones. `prices` carries every price, archived ones
 * included, active first and then newest first. The two account ids and
 * `classIds` are copied onto invoice lines created from the item.
 */
export const platformCatalogItemSchema = z.object({
    id: z.string().uuid(),
    entityId: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    sku: z.string().nullable(),
    type: catalogItemTypeSchema,
    active: z.boolean(),
    revenueAccountId: z.string().uuid().nullable(),
    receivablesAccountId: z.string().uuid().nullable(),
    classIds: z.array(z.string().uuid()),
    source: catalogItemSourceSchema.nullable(),
    prices: z.array(platformCatalogItemPriceSchema),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export type PlatformCatalogItem = z.infer<typeof platformCatalogItemSchema>;

/**
 * Catalog items belong to an entity but are listed across the workspace, so
 * the routes nest under the workspace uuid. They require a plan with
 * invoicing.
 */
export const platformCatalogItemsPathParamsSchema = z.object({
    workspaceId: z.string().uuid(),
});

export const platformCatalogItemPathParamsSchema =
    platformCatalogItemsPathParamsSchema.extend({
        catalogItemId: z.string().uuid(),
    });

/**
 * Sorted by name. `search` matches the name and SKU, case-insensitively.
 * `status` defaults to `active`. An entity outside the workspace answers 400.
 */
export const platformCatalogItemsListQuerySchema =
    platformPaginationQuerySchema.extend({
        entityIds: uuidArrayQueryParamSchema,
        search: z.string().trim().min(1).max(255).optional(),
        status: z.enum(CATALOG_ITEM_STATUS_FILTERS).default("active"),
    });

export type PlatformCatalogItemsListQuery = z.input<
    typeof platformCatalogItemsListQuerySchema
>;

export const platformCatalogItemsListResponseSchema = z.object({
    data: z.array(platformCatalogItemSchema),
    pagination: platformPaginationSchema,
});

export type PlatformCatalogItemsListResponse = z.infer<
    typeof platformCatalogItemsListResponseSchema
>;

export const platformCatalogItemResponseSchema = z.object({
    catalogItem: platformCatalogItemSchema,
});

const priceDescriptionSchema = z.string().max(1000).nullable().optional();

/**
 * `clientId` is the caller's own reference for the new price, unique within
 * the request; the update response maps it to the created price id.
 */
export const platformCatalogItemPriceCreateOperationSchema = z
    .object({
        op: z.literal("create"),
        clientId: z.string().min(1).max(255),
        unitAmount: z
            .number()
            .finite()
            .min(-CATALOG_ITEM_MONETARY_MAX)
            .max(CATALOG_ITEM_MONETARY_MAX),
        currency: z.string().regex(/^[a-zA-Z]{3}$/),
        isDefault: z.boolean().optional(),
        description: priceDescriptionSchema,
    })
    .strict();

export type PlatformCatalogItemPriceCreateOperation = z.infer<
    typeof platformCatalogItemPriceCreateOperationSchema
>;

/** `isDefault: true` moves the default here; the old default stays active. */
export const platformCatalogItemPriceUpdateOperationSchema = z
    .object({
        op: z.literal("update"),
        priceId: z.string().uuid(),
        active: z.boolean().optional(),
        isDefault: z.literal(true).optional(),
        description: priceDescriptionSchema,
    })
    .strict();

export const platformCatalogItemPriceDeleteOperationSchema = z
    .object({
        op: z.literal("delete"),
        priceId: z.string().uuid(),
    })
    .strict();

/**
 * Applied in order, in the same transaction as the item's own changes. An
 * item with prices must keep an active one, its default price can't be
 * archived or deleted, and a price used on invoices can't be deleted; each of
 * those answers 409. The upstream "update sends at least one field" and
 * "unique clientId" refines are left off like the other refines.
 */
export const platformCatalogItemPriceOperationSchema = z.discriminatedUnion(
    "op",
    [
        platformCatalogItemPriceCreateOperationSchema,
        platformCatalogItemPriceUpdateOperationSchema,
        platformCatalogItemPriceDeleteOperationSchema,
    ],
);

export type PlatformCatalogItemPriceOperation = z.infer<
    typeof platformCatalogItemPriceOperationSchema
>;

const nameSchema = z.string().trim().min(1).max(255);
const descriptionSchema = z.string().max(1000).nullable();
const skuSchema = z.string().max(255).nullable();
const accountIdSchema = z.string().uuid().nullable();
const classIdsSchema = z.array(z.string().uuid()).max(100);

/**
 * A name an active item of the entity already has (ignoring case) answers
 * 409. Accounts must belong to the item's entity. `type` defaults to
 * `service` upstream.
 */
export const platformCatalogItemCreateBodySchema = z
    .object({
        entityId: z.string().uuid(),
        name: nameSchema,
        description: descriptionSchema.optional(),
        sku: skuSchema.optional(),
        type: catalogItemTypeSchema.optional(),
        currency: z.enum(CATALOG_ITEM_CURRENCIES),
        revenueAccountId: accountIdSchema.optional(),
        receivablesAccountId: accountIdSchema.optional(),
        classIds: classIdsSchema.optional(),
        prices: z
            .array(platformCatalogItemPriceCreateOperationSchema)
            .max(100)
            .optional(),
    })
    .strict();

export type PlatformCatalogItemCreateBody = z.infer<
    typeof platformCatalogItemCreateBodySchema
>;

/**
 * Only the fields sent change. `active: false` archives the item; moving it
 * to another `entityId` is refused once invoices use it. `classIds` replaces
 * the item's classes. The "at least one field" refine is left off.
 */
export const platformCatalogItemUpdateBodySchema = z
    .object({
        entityId: z.string().uuid().optional(),
        name: nameSchema.optional(),
        description: descriptionSchema.optional(),
        sku: skuSchema.optional(),
        type: catalogItemTypeSchema.optional(),
        active: z.boolean().optional(),
        revenueAccountId: accountIdSchema.optional(),
        receivablesAccountId: accountIdSchema.optional(),
        classIds: classIdsSchema.optional(),
        prices: z
            .array(platformCatalogItemPriceOperationSchema)
            .max(100)
            .optional(),
    })
    .strict();

export type PlatformCatalogItemUpdateBody = z.infer<
    typeof platformCatalogItemUpdateBodySchema
>;

export const platformCatalogItemUpdateResponseSchema =
    platformCatalogItemResponseSchema.extend({
        createdPrices: z.array(
            z.object({
                clientId: z.string(),
                priceId: z.string().uuid(),
            }),
        ),
    });

export type PlatformCatalogItemUpdateResponse = z.infer<
    typeof platformCatalogItemUpdateResponseSchema
>;
