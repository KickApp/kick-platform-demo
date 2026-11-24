import type {
    PlatformInvoiceCreateBody,
    PlatformInvoicesListQuery,
    PlatformInvoiceUpdateBody,
} from "@kick-demo/shared";
import { toApiError } from "./errors";
import { api } from "./platform";

export async function fetchInvoices({
    workspaceId,
    ...query
}: { workspaceId: string } & PlatformInvoicesListQuery) {
    const result = await api.invoices.list({
        params: { workspaceId },
        query,
    });
    if (result.status === 200) {
        return result.body;
    }
    throw toApiError(result);
}

export async function fetchInvoice({
    workspaceId,
    invoiceId,
}: {
    workspaceId: string;
    invoiceId: string;
}) {
    const result = await api.invoices.get({
        params: { workspaceId, invoiceId },
    });
    if (result.status === 200) {
        return result.body.invoice;
    }
    throw toApiError(result);
}

/** No email is sent; `status: "open"` issues it and posts its entries. */
export async function createInvoice({
    workspaceId,
    body,
}: {
    workspaceId: string;
    body: PlatformInvoiceCreateBody;
}) {
    const result = await api.invoices.create({
        params: { workspaceId },
        body,
    });
    if (result.status === 201) {
        return result.body.invoice;
    }
    throw toApiError(result);
}

export async function updateInvoice({
    workspaceId,
    invoiceId,
    body,
}: {
    workspaceId: string;
    invoiceId: string;
    body: PlatformInvoiceUpdateBody;
}) {
    const result = await api.invoices.update({
        params: { workspaceId, invoiceId },
        body,
    });
    if (result.status === 200) {
        return result.body.invoice;
    }
    throw toApiError(result);
}

/** Only drafts of `manual`, `importer` and `mcp` invoices; others answer 400. */
export async function deleteInvoice({
    workspaceId,
    invoiceId,
}: {
    workspaceId: string;
    invoiceId: string;
}) {
    const result = await api.invoices.delete({
        params: { workspaceId, invoiceId },
    });
    if (result.status === 200) {
        return;
    }
    throw toApiError(result);
}
