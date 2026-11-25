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

function filenameFromDisposition(disposition: string | null): string | null {
    if (disposition === null) {
        return null;
    }
    const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
    if (encoded !== undefined) {
        return decodeURIComponent(encoded);
    }
    return /filename="?([^";]+)"?/i.exec(disposition)?.[1] ?? null;
}

async function readErrorBody(response: Response): Promise<unknown> {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

/**
 * Only invoices created in Kick (`manual`) have a PDF; others answer 400.
 * The ts-rest client decodes non-JSON bodies as text, so this uses `fetch`.
 */
export async function downloadInvoicePdf({
    workspaceId,
    invoiceId,
    fallbackFilename,
}: {
    workspaceId: string;
    invoiceId: string;
    fallbackFilename: string;
}) {
    const response = await fetch(
        `/api/platform/v1/workspaces/${workspaceId}/invoices/${invoiceId}/pdf`,
    );
    if (!response.ok) {
        throw toApiError({
            status: response.status,
            body: await readErrorBody(response),
        });
    }
    const blob = await response.blob();
    const filename =
        filenameFromDisposition(response.headers.get("content-disposition")) ??
        fallbackFilename;
    const url = URL.createObjectURL(blob);
    try {
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.append(link);
        link.click();
        link.remove();
    } finally {
        URL.revokeObjectURL(url);
    }
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
