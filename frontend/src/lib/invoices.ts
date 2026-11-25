import { useQueries, type QueryClient } from "@tanstack/react-query";
import {
    DELETABLE_INVOICE_SOURCES,
    INVOICE_STATUS_TRANSITIONS,
    PROVIDER_OWNED_INVOICE_SOURCES,
    type InvoiceStatus,
    type PlatformInvoice,
} from "@kick-demo/shared";
import { fetchCounterparty } from "../api/platform";

/**
 * Issuing, paying or voiding an invoice posts or reverses journal entries, so
 * an invoice write also refreshes the entity's journal entries and reports.
 */
export async function invalidateInvoiceQueries({
    queryClient,
    workspaceId,
    invoice,
}: {
    queryClient: QueryClient;
    workspaceId: string;
    invoice: PlatformInvoice;
}) {
    await Promise.all([
        queryClient.invalidateQueries({
            queryKey: ["invoices", workspaceId],
        }),
        queryClient.invalidateQueries({
            queryKey: ["invoice", workspaceId, invoice.id],
        }),
        queryClient.invalidateQueries({
            queryKey: ["journal-entries", invoice.entityId],
        }),
        queryClient.invalidateQueries({ queryKey: ["report"] }),
    ]);
}

export function isProviderOwned(invoice: PlatformInvoice): boolean {
    return PROVIDER_OWNED_INVOICE_SOURCES.includes(invoice.source);
}

/** The statuses Kick lets this invoice move to; none for provider-owned. */
export function allowedStatusTransitions(
    invoice: PlatformInvoice,
): readonly InvoiceStatus[] {
    if (isProviderOwned(invoice) || invoice.status === null) {
        return [];
    }
    return INVOICE_STATUS_TRANSITIONS[invoice.status];
}

export function isInvoiceDeletable(invoice: PlatformInvoice): boolean {
    return (
        invoice.status === "draft" &&
        DELETABLE_INVOICE_SOURCES.includes(invoice.source)
    );
}

/** Every field is writable only on a draft created in Kick. */
export function isEditableDraft(invoice: PlatformInvoice): boolean {
    return invoice.source === "manual" && invoice.status === "draft";
}

/** Kick only renders a PDF for invoices created in Kick, drafts included. */
export function hasInvoicePdf(invoice: PlatformInvoice): boolean {
    return invoice.source === "manual";
}

/** Due date and status dates: everything but provider-owned and void. */
export function canEditDueDate(invoice: PlatformInvoice): boolean {
    return !isProviderOwned(invoice) && invoice.status !== "void";
}

export function canEditPaymentLink(invoice: PlatformInvoice): boolean {
    return invoice.source === "manual" && invoice.status !== "void";
}

/**
 * Invoices reference their customer by counterparty uuid only. One cached
 * `get` per customer — the same cache the counterparty page uses — resolves
 * the names on screen. A counterparty the routes don't show reads as null.
 */
export function useCustomerNames({
    workspaceId,
    customerIds,
}: {
    workspaceId: string;
    customerIds: string[];
}) {
    const uniqueIds = [...new Set(customerIds)].sort();
    const queries = useQueries({
        queries: uniqueIds.map((counterpartyId) => ({
            queryKey: ["counterparty", workspaceId, counterpartyId],
            queryFn: () => fetchCounterparty({ workspaceId, counterpartyId }),
            retry: false,
        })),
    });
    const namesById = new Map<string, string>();
    uniqueIds.forEach((counterpartyId, index) => {
        const counterparty = queries[index]?.data;
        if (counterparty !== undefined) {
            namesById.set(counterpartyId, counterparty.name);
        }
    });
    return {
        customerName: (customerId: string) => namesById.get(customerId) ?? null,
    };
}

export function formatIsoDay(isoDate: string | null): string {
    if (isoDate === null) {
        return "—";
    }
    const date = new Date(`${isoDate}T00:00:00Z`);
    return Number.isNaN(date.getTime())
        ? isoDate
        : date.toLocaleDateString(undefined, {
              dateStyle: "medium",
              timeZone: "UTC",
          });
}
