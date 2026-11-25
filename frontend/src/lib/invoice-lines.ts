import {
    INVOICE_MONETARY_MAX,
    INVOICE_QUANTITY_MAX,
    type PlatformCatalogItem,
    type PlatformInvoiceCreateLine,
    type PlatformInvoiceLine,
    type PlatformInvoiceUpdateLine,
} from "@kick-demo/shared";
import { defaultPrice } from "./use-entity-catalog-items";

export const NO_SELECTION = "";

/**
 * One editable invoice line. Numbers are kept as the input's strings so a
 * half-typed value survives a re-render. `original` is set on a line the
 * invoice already has: on update it is sent with its `id`, carrying only the
 * fields that changed, so Kick keeps the rest (tax included).
 */
export interface InvoiceLineDraft {
    key: string;
    original: PlatformInvoiceLine | null;
    catalogItemId: string;
    catalogItemPriceId: string;
    description: string;
    quantity: string;
    unitAmount: string;
    tax: string;
    revenueAccountId: string;
}

let nextDraftKey = 0;

function newDraftKey(): string {
    nextDraftKey += 1;
    return `line-${nextDraftKey}`;
}

export function emptyLineDraft(): InvoiceLineDraft {
    return {
        key: newDraftKey(),
        original: null,
        catalogItemId: NO_SELECTION,
        catalogItemPriceId: NO_SELECTION,
        description: "",
        quantity: "1",
        unitAmount: "",
        tax: "",
        revenueAccountId: NO_SELECTION,
    };
}

export function lineDraftFromLine(line: PlatformInvoiceLine): InvoiceLineDraft {
    return {
        key: newDraftKey(),
        original: line,
        catalogItemId: line.catalogItemId ?? NO_SELECTION,
        catalogItemPriceId: line.catalogItemPriceId ?? NO_SELECTION,
        description: line.description ?? "",
        quantity: line.quantity !== null ? `${line.quantity}` : "1",
        unitAmount: line.unitAmount !== null ? `${line.unitAmount}` : "",
        tax: line.tax !== 0 ? `${line.tax}` : "",
        revenueAccountId: line.revenueAccountId ?? NO_SELECTION,
    };
}

/**
 * Picking an item prefills the line from it — description, default price —
 * the way the Kick app does; the line still takes its amount from
 * `unitAmount`, so both stay editable.
 */
export function applyCatalogItem(
    draft: InvoiceLineDraft,
    item: PlatformCatalogItem | null,
): InvoiceLineDraft {
    if (item === null) {
        return {
            ...draft,
            catalogItemId: NO_SELECTION,
            catalogItemPriceId: NO_SELECTION,
        };
    }
    const price = defaultPrice(item);
    return {
        ...draft,
        catalogItemId: item.id,
        catalogItemPriceId: price?.id ?? NO_SELECTION,
        description: item.description ?? item.name,
        ...(price !== null && { unitAmount: `${price.unitAmount}` }),
    };
}

function parseNumber(value: string): number | null {
    if (value.trim() === "") {
        return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

export function isLineDraftComplete(draft: InvoiceLineDraft): boolean {
    const quantity = parseNumber(draft.quantity);
    const unitAmount = parseNumber(draft.unitAmount);
    const tax = parseNumber(draft.tax);
    return (
        draft.description.trim() !== "" &&
        quantity !== null &&
        quantity > 0 &&
        quantity <= INVOICE_QUANTITY_MAX &&
        unitAmount !== null &&
        Math.abs(unitAmount) <= INVOICE_MONETARY_MAX &&
        (draft.tax.trim() === "" ||
            (tax !== null && tax >= 0 && tax <= INVOICE_MONETARY_MAX))
    );
}

/** quantity × unitAmount + tax, as the line would add to the total. */
export function lineDraftAmount(draft: InvoiceLineDraft): number {
    const quantity = parseNumber(draft.quantity) ?? 0;
    const unitAmount = parseNumber(draft.unitAmount) ?? 0;
    const tax = parseNumber(draft.tax) ?? 0;
    return Math.round(quantity * unitAmount * 100) / 100 + tax;
}

function optionalId(value: string): string | null {
    return value === NO_SELECTION ? null : value;
}

export function toCreateLine(
    draft: InvoiceLineDraft,
): PlatformInvoiceCreateLine {
    const tax = parseNumber(draft.tax);
    return {
        description: draft.description.trim(),
        quantity: parseNumber(draft.quantity) ?? 1,
        unitAmount: parseNumber(draft.unitAmount) ?? 0,
        ...(tax !== null && tax > 0 && { tax }),
        ...(draft.catalogItemId !== NO_SELECTION && {
            catalogItemId: draft.catalogItemId,
        }),
        ...(draft.catalogItemPriceId !== NO_SELECTION && {
            catalogItemPriceId: draft.catalogItemPriceId,
        }),
        ...(draft.revenueAccountId !== NO_SELECTION && {
            revenueAccountId: draft.revenueAccountId,
        }),
    };
}

export function toUpdateLine(
    draft: InvoiceLineDraft,
): PlatformInvoiceUpdateLine {
    const { original } = draft;
    if (original === null) {
        return toCreateLine(draft);
    }
    const description = draft.description.trim();
    const quantity = parseNumber(draft.quantity) ?? 1;
    const unitAmount = parseNumber(draft.unitAmount) ?? 0;
    const tax = parseNumber(draft.tax) ?? 0;
    const catalogItemId = optionalId(draft.catalogItemId);
    const catalogItemPriceId = optionalId(draft.catalogItemPriceId);
    const revenueAccountId = optionalId(draft.revenueAccountId);
    return {
        id: original.id,
        ...(description !== (original.description ?? "") && { description }),
        ...(quantity !== original.quantity && { quantity }),
        ...(unitAmount !== original.unitAmount && { unitAmount }),
        ...(tax !== original.tax && { tax }),
        ...(catalogItemId !== original.catalogItemId && { catalogItemId }),
        ...(catalogItemPriceId !== original.catalogItemPriceId && {
            catalogItemPriceId,
        }),
        ...(revenueAccountId !== original.revenueAccountId && {
            revenueAccountId,
        }),
    };
}
