import { INVOICE_STATUS_LABELS, type InvoiceStatus } from "@kick-demo/shared";

const BADGE_CLASSES: Record<InvoiceStatus, string> = {
    draft: "badge",
    open: "badge",
    paid: "badge badge-success",
    void: "badge badge-danger",
    uncollectable: "badge badge-danger",
};

/** A provider-synced invoice has no status until the provider reports one. */
export function InvoiceStatusBadge({
    status,
}: {
    status: InvoiceStatus | null;
}) {
    if (status === null) {
        return <span className="badge">Not reported</span>;
    }
    return (
        <span className={BADGE_CLASSES[status]}>
            {INVOICE_STATUS_LABELS[status]}
        </span>
    );
}
