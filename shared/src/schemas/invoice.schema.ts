import { z } from "zod";
import {
    platformPaginationQuerySchema,
    platformPaginationSchema,
} from "./pagination.schema";
import {
    arrayQueryParamSchema,
    uuidArrayQueryParamSchema,
} from "./query.schema";

export const INVOICE_STATUSES = [
    "draft",
    "open",
    "paid",
    "void",
    "uncollectable",
] as const;

export const invoiceStatusSchema = z.enum(INVOICE_STATUSES);

export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
    draft: "Draft",
    open: "Open",
    paid: "Paid",
    void: "Void",
    uncollectable: "Uncollectable",
};

/**
 * Where an invoice comes from: `manual` is created in Kick (including through
 * the Platform API), the rest are imported or synced from a provider. Grows
 * with Kick's integrations.
 */
export const INVOICE_SOURCES = [
    "manual",
    "stripe",
    "mercury",
    "importer",
    "billcom",
    "mcp",
    "quickbooks",
] as const;

export const invoiceSourceSchema = z.enum(INVOICE_SOURCES);

export type InvoiceSource = z.infer<typeof invoiceSourceSchema>;

export const INVOICE_SOURCE_LABELS: Record<InvoiceSource, string> = {
    manual: "Kick",
    stripe: "Stripe",
    mercury: "Mercury",
    importer: "Imported",
    billcom: "Bill.com",
    mcp: "MCP",
    quickbooks: "QuickBooks",
};

/**
 * Vendored from the upstream `update` description rather than read off the
 * wire: the transitions Kick allows, and which sources own which fields.
 * Provider-owned invoices take `memo` only; deletes work only on drafts of
 * the deletable sources.
 */
export const INVOICE_STATUS_TRANSITIONS: Record<
    InvoiceStatus,
    readonly InvoiceStatus[]
> = {
    draft: ["open"],
    open: ["paid", "void", "uncollectable"],
    paid: ["open"],
    void: [],
    uncollectable: ["paid", "void"],
};

export const PROVIDER_OWNED_INVOICE_SOURCES: readonly InvoiceSource[] = [
    "stripe",
    "mercury",
    "billcom",
];

export const DELETABLE_INVOICE_SOURCES: readonly InvoiceSource[] = [
    "manual",
    "importer",
    "mcp",
];

/**
 * From the upstream `send` description: only `manual` invoices are emailed,
 * a draft is issued by its first email and an open one is sent again.
 */
export const SENDABLE_INVOICE_STATUSES: readonly InvoiceStatus[] = [
    "draft",
    "open",
];

export const INVOICE_CURRENCIES = ["usd"] as const;

export const INVOICE_MAX_LINES = 100;

/** Upstream bounds of native invoice money and quantity columns. */
export const INVOICE_MONETARY_MAX = 999_999_999_999;
export const INVOICE_QUANTITY_MAX = 999_999;

/**
 * An item line. Tax, discount and deposit aren't lines of their own: each
 * line carries its share (0 when the invoice keeps them only on the invoice,
 * as provider-synced invoices do for tax). `productOrService`,
 * `catalogItemId` and `catalogItemPriceId` are null on invoices not created
 * in Kick. Null account ids mean the entity's defaults. Amounts are major
 * currency units.
 */
export const platformInvoiceLineSchema = z.object({
    id: z.string().uuid(),
    productOrService: z.string().nullable(),
    description: z.string().nullable(),
    catalogItemId: z.string().uuid().nullable(),
    catalogItemPriceId: z.string().uuid().nullable(),
    quantity: z.number().nullable(),
    unitAmount: z.number().nullable(),
    amount: z.number(),
    tax: z.number(),
    discount: z.number(),
    deposit: z.number(),
    revenueAccountId: z.string().uuid().nullable(),
    receivablesAccountId: z.string().uuid().nullable(),
    classIds: z.array(z.string().uuid()),
});

export type PlatformInvoiceLine = z.infer<typeof platformInvoiceLineSchema>;

/**
 * Wire shape of an invoice. `status` is null for a provider-synced invoice
 * until the provider reports one. `customerId` is the counterparty billed;
 * `customPaymentLink` is only ever set on invoices created through the
 * Platform API, and is null on those created without one. Dates are calendar days (`YYYY-MM-DD`), `invoiceDate` being the day
 * it posts to the books. `memo` is internal, never shown to the customer.
 */
export const platformInvoiceSchema = z.object({
    id: z.string().uuid(),
    entityId: z.string().uuid(),
    source: invoiceSourceSchema,
    status: invoiceStatusSchema.nullable(),
    invoiceNumber: z.string().nullable(),
    customerId: z.string().uuid().nullable(),
    customPaymentLink: z.string().nullable(),
    currency: z.string(),
    subtotal: z.number(),
    tax: z.number(),
    discount: z.number(),
    deposit: z.number(),
    total: z.number(),
    invoiceDate: z.string().date().nullable(),
    dueDate: z.string().date().nullable(),
    paidDate: z.string().date().nullable(),
    voidedDate: z.string().date().nullable(),
    uncollectableDate: z.string().date().nullable(),
    memo: z.string().nullable(),
    lines: z.array(platformInvoiceLineSchema),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export type PlatformInvoice = z.infer<typeof platformInvoiceSchema>;

/**
 * Invoices are listed across every entity of a workspace, so the routes nest
 * under the workspace uuid. They require a plan with invoicing.
 */
export const platformInvoicesPathParamsSchema = z.object({
    workspaceId: z.string().uuid(),
});

export const platformInvoicePathParamsSchema =
    platformInvoicesPathParamsSchema.extend({
        invoiceId: z.string().uuid(),
    });

/**
 * Newest invoice date first. `startDate`/`endDate` are inclusive calendar
 * days; the upstream "start on or before end" refine is left off and Kick's
 * 400 explains an inverted range. An entity or counterparty outside the
 * workspace answers 400.
 */
export const platformInvoicesListQuerySchema =
    platformPaginationQuerySchema.extend({
        entityIds: uuidArrayQueryParamSchema,
        sources: arrayQueryParamSchema(invoiceSourceSchema),
        status: invoiceStatusSchema.optional(),
        customerIds: arrayQueryParamSchema(z.string().uuid(), {
            maxItems: 100,
        }),
        startDate: z.string().date().optional(),
        endDate: z.string().date().optional(),
    });

export type PlatformInvoicesListQuery = z.input<
    typeof platformInvoicesListQuerySchema
>;

export const platformInvoicesListResponseSchema = z.object({
    data: z.array(platformInvoiceSchema),
    pagination: platformPaginationSchema,
});

export type PlatformInvoicesListResponse = z.infer<
    typeof platformInvoicesListResponseSchema
>;

export const platformInvoiceResponseSchema = z.object({
    invoice: platformInvoiceSchema,
});

const adjustmentSchema = z.number().finite().min(0).max(INVOICE_MONETARY_MAX);
const quantitySchema = z.number().finite().positive().max(INVOICE_QUANTITY_MAX);
const unitAmountSchema = z
    .number()
    .finite()
    .min(-INVOICE_MONETARY_MAX)
    .max(INVOICE_MONETARY_MAX);
const lineDescriptionSchema = z.string().trim().min(1).max(1000);
const invoiceNumberSchema = z.string().trim().min(1).max(255);
const memoSchema = z.string().max(1000).nullable();
const customPaymentLinkSchema = z
    .string()
    .max(2048)
    .url()
    .refine((value) => value.startsWith("https://"), {
        message: "must be an https URL",
    });

/**
 * A line takes its accounts and classes from its own fields first, then from
 * its catalog item, then from the entity's defaults. `productOrService`
 * defaults to the catalog item's name. The line amount is `quantity` ×
 * `unitAmount`, computed by Kick.
 */
const lineFields = {
    tax: adjustmentSchema.optional(),
    discount: adjustmentSchema.optional(),
    deposit: adjustmentSchema.optional(),
    productOrService: z.string().trim().min(1).max(255).nullable().optional(),
    catalogItemId: z.string().uuid().nullable().optional(),
    catalogItemPriceId: z.string().uuid().nullable().optional(),
    revenueAccountId: z.string().uuid().nullable().optional(),
    receivablesAccountId: z.string().uuid().nullable().optional(),
    classIds: z.array(z.string().uuid()).max(100).optional(),
};

export const platformInvoiceCreateLineSchema = z
    .object({
        description: lineDescriptionSchema,
        quantity: quantitySchema.optional(),
        unitAmount: unitAmountSchema,
        ...lineFields,
    })
    .strict();

export type PlatformInvoiceCreateLine = z.infer<
    typeof platformInvoiceCreateLineSchema
>;

/**
 * Created as a `draft` unless `status` is `open`, which issues it and posts
 * its journal entries; nothing is emailed either way. `customPaymentLink` is
 * optional and can be added later with an update while the invoice isn't
 * void. Tax goes on lines only;
 * discount and deposit go on lines or on the invoice, not both. An invoice
 * date in a locked period answers 409. The upstream `dueDate >= invoiceDate`
 * and "discount/deposit on one level" refines are left off like the other
 * top-level refines.
 */
export const platformInvoiceCreateBodySchema = z
    .object({
        entityId: z.string().uuid(),
        customerId: z.string().uuid(),
        customPaymentLink: customPaymentLinkSchema.optional(),
        status: z.enum(["draft", "open"]).optional(),
        invoiceNumber: invoiceNumberSchema.optional(),
        invoiceDate: z.string().date(),
        dueDate: z.string().date().optional(),
        currency: z.enum(INVOICE_CURRENCIES),
        memo: memoSchema.optional(),
        discount: adjustmentSchema.optional(),
        deposit: adjustmentSchema.optional(),
        lines: z
            .array(platformInvoiceCreateLineSchema)
            .min(1)
            .max(INVOICE_MAX_LINES),
    })
    .strict();

export type PlatformInvoiceCreateBody = z.infer<
    typeof platformInvoiceCreateBodySchema
>;

/**
 * A line sent with its `id` is kept and only the fields sent change; a line
 * without `id` is added and needs `description` and `unitAmount` (the
 * upstream refine saying so is left off).
 */
export const platformInvoiceUpdateLineSchema = z
    .object({
        id: z.string().uuid().optional(),
        description: lineDescriptionSchema.optional(),
        quantity: quantitySchema.optional(),
        unitAmount: unitAmountSchema.optional(),
        ...lineFields,
    })
    .strict();

export type PlatformInvoiceUpdateLine = z.infer<
    typeof platformInvoiceUpdateLineSchema
>;

/**
 * What can change depends on the source and status: provider-owned invoices
 * take `memo` only; `importer`, `mcp` and `quickbooks` invoices take `memo`,
 * `dueDate`, `status` and the status dates; `manual` invoices take everything
 * while a draft, and after that `memo`, `dueDate`, `status`, the status dates
 * and `customPaymentLink`. A status date goes only with its status and
 * defaults to the workspace's today. `lines` replaces the whole list. The
 * upstream top-level refines are left off.
 */
export const platformInvoiceUpdateBodySchema = z
    .object({
        customerId: z.string().uuid().optional(),
        customPaymentLink: customPaymentLinkSchema.optional(),
        status: invoiceStatusSchema.optional(),
        paidDate: z.string().date().optional(),
        voidedDate: z.string().date().optional(),
        uncollectableDate: z.string().date().optional(),
        invoiceNumber: invoiceNumberSchema.optional(),
        invoiceDate: z.string().date().optional(),
        dueDate: z.string().date().nullable().optional(),
        memo: memoSchema.optional(),
        discount: adjustmentSchema.optional(),
        deposit: adjustmentSchema.optional(),
        lines: z
            .array(platformInvoiceUpdateLineSchema)
            .min(1)
            .max(INVOICE_MAX_LINES)
            .optional(),
    })
    .strict();

export type PlatformInvoiceUpdateBody = z.infer<
    typeof platformInvoiceUpdateBodySchema
>;
