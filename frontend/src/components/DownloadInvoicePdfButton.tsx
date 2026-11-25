import { useMutation } from "@tanstack/react-query";
import type { PlatformInvoice } from "@kick-demo/shared";
import { downloadInvoicePdf } from "../api/invoices";

export function DownloadInvoicePdfButton({
    workspaceId,
    invoice,
}: {
    workspaceId: string;
    invoice: PlatformInvoice;
}) {
    const mutation = useMutation({
        mutationFn: () =>
            downloadInvoicePdf({
                workspaceId,
                invoiceId: invoice.id,
                fallbackFilename: `invoice-${invoice.invoiceNumber ?? invoice.id}.pdf`,
            }),
    });
    return (
        <>
            <button
                type="button"
                className="button button-secondary"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate()}
            >
                {mutation.isPending ? "Downloading…" : "Download PDF"}
            </button>
            {mutation.error !== null && (
                <span className="cell-error">{mutation.error.message}</span>
            )}
        </>
    );
}
