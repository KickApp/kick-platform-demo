import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";
import { INVOICE_SOURCE_LABELS, type PlatformInvoice } from "@kick-demo/shared";
import { deleteInvoice, fetchInvoice } from "../api/invoices";
import { DownloadInvoicePdfButton } from "../components/DownloadInvoicePdfButton";
import { InvoiceDetailsForm } from "../components/InvoiceDetailsForm";
import { InvoiceDraftEditor } from "../components/InvoiceDraftEditor";
import { InvoiceLinesTable } from "../components/InvoiceLinesTable";
import { InvoiceStatusActions } from "../components/InvoiceStatusActions";
import { InvoiceStatusBadge } from "../components/InvoiceStatusBadge";
import {
    EmptyMessage,
    ErrorMessageBox,
    LoadingMessage,
} from "../components/StatusMessage";
import { formatDateTime } from "../lib/format";
import {
    formatIsoDay,
    hasInvoicePdf,
    invalidateInvoiceQueries,
    isEditableDraft,
    isInvoiceDeletable,
    isProviderOwned,
    useCustomerNames,
} from "../lib/invoices";
import { useEntityAccounts } from "../lib/use-entity-accounts";
import { useWorkspaceEntities } from "../lib/use-workspace-entities";
import { useWorkspaceContext } from "../lib/workspace-context";

function SummaryItem({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="summary-item">
            <span className="summary-label">{label}</span>
            <span className="summary-value summary-value-text">{children}</span>
        </div>
    );
}

function DeleteInvoiceButton({
    workspaceId,
    invoice,
}: {
    workspaceId: string;
    invoice: PlatformInvoice;
}) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const mutation = useMutation({
        mutationFn: () => deleteInvoice({ workspaceId, invoiceId: invoice.id }),
        onSuccess: async () => {
            queryClient.removeQueries({
                queryKey: ["invoice", workspaceId, invoice.id],
            });
            await invalidateInvoiceQueries({
                queryClient,
                workspaceId,
                invoice,
            });
            await navigate("..", { relative: "path" });
        },
    });
    return (
        <>
            <button
                type="button"
                className="button button-danger"
                disabled={mutation.isPending}
                onClick={() => {
                    if (window.confirm("Delete this draft invoice?")) {
                        mutation.mutate();
                    }
                }}
            >
                {mutation.isPending ? "Deleting…" : "Delete draft"}
            </button>
            {mutation.error !== null && (
                <span className="cell-error">{mutation.error.message}</span>
            )}
        </>
    );
}

/**
 * One invoice through the Platform API's `get`, with the writes its source
 * and status allow: the full draft editor for a draft created in Kick, the
 * fields that stay writable afterwards, the status transitions, and delete
 * for a deletable draft. A provider-owned invoice only takes a memo.
 */
export function WorkspaceInvoicePage() {
    const { workspaceId } = useWorkspaceContext();
    const { invoiceId } = useParams();
    const { entityName } = useWorkspaceEntities(workspaceId);

    const invoiceQuery = useQuery({
        queryKey: ["invoice", workspaceId, invoiceId],
        queryFn: () =>
            fetchInvoice({ workspaceId, invoiceId: invoiceId ?? "" }),
        enabled: invoiceId !== undefined,
    });
    const invoice = invoiceQuery.data;
    const { accountsFor } = useEntityAccounts(
        invoice !== undefined ? [invoice.entityId] : [],
    );
    const { customerName } = useCustomerNames({
        workspaceId,
        customerIds:
            invoice?.customerId !== null && invoice?.customerId !== undefined
                ? [invoice.customerId]
                : [],
    });

    if (invoiceId === undefined) {
        return <EmptyMessage>Invoice not specified.</EmptyMessage>;
    }

    return (
        <section>
            <Link to=".." relative="path" className="back-link">
                ← All invoices
            </Link>

            {invoiceQuery.isPending && <LoadingMessage label="invoice" />}
            {invoiceQuery.error !== null && (
                <ErrorMessageBox error={invoiceQuery.error} />
            )}

            {invoice && (
                <>
                    <div className="page-header">
                        <div>
                            <h3 className="section-title">
                                Invoice{" "}
                                {invoice.invoiceNumber ?? "(unnumbered)"}{" "}
                                <InvoiceStatusBadge status={invoice.status} />
                            </h3>
                            <p className="page-meta mono">{invoice.id}</p>
                        </div>
                        {(hasInvoicePdf(invoice) ||
                            isInvoiceDeletable(invoice)) && (
                            <div className="row-actions">
                                {hasInvoicePdf(invoice) && (
                                    <DownloadInvoicePdfButton
                                        workspaceId={workspaceId}
                                        invoice={invoice}
                                    />
                                )}
                                {isInvoiceDeletable(invoice) && (
                                    <DeleteInvoiceButton
                                        workspaceId={workspaceId}
                                        invoice={invoice}
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    <div className="card summary-card">
                        <SummaryItem label="Customer">
                            {invoice.customerId !== null ? (
                                <Link
                                    className="row-link"
                                    to={`../../counterparties/${invoice.customerId}`}
                                    relative="path"
                                >
                                    {customerName(invoice.customerId) ??
                                        invoice.customerId}
                                </Link>
                            ) : (
                                "—"
                            )}
                        </SummaryItem>
                        <SummaryItem label="Entity">
                            {entityName(invoice.entityId) ?? invoice.entityId}
                        </SummaryItem>
                        <SummaryItem label="Source">
                            {INVOICE_SOURCE_LABELS[invoice.source]}
                        </SummaryItem>
                        <SummaryItem label="Invoice date">
                            {formatIsoDay(invoice.invoiceDate)}
                        </SummaryItem>
                        <SummaryItem label="Due">
                            {formatIsoDay(invoice.dueDate)}
                        </SummaryItem>
                        {invoice.paidDate !== null && (
                            <SummaryItem label="Paid">
                                {formatIsoDay(invoice.paidDate)}
                            </SummaryItem>
                        )}
                        {invoice.voidedDate !== null && (
                            <SummaryItem label="Voided">
                                {formatIsoDay(invoice.voidedDate)}
                            </SummaryItem>
                        )}
                        {invoice.uncollectableDate !== null && (
                            <SummaryItem label="Written off">
                                {formatIsoDay(invoice.uncollectableDate)}
                            </SummaryItem>
                        )}
                        <SummaryItem label="Payment link">
                            {invoice.customPaymentLink !== null ? (
                                <a
                                    className="row-link"
                                    href={invoice.customPaymentLink}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    {invoice.customPaymentLink}
                                </a>
                            ) : (
                                "—"
                            )}
                        </SummaryItem>
                        <SummaryItem label="Updated">
                            {formatDateTime(invoice.updatedAt)}
                        </SummaryItem>
                    </div>

                    <InvoiceLinesTable
                        invoice={invoice}
                        accounts={accountsFor(invoice.entityId)}
                    />

                    {isProviderOwned(invoice) && (
                        <div className="status status-info">
                            {INVOICE_SOURCE_LABELS[invoice.source]} owns this
                            invoice, so the Platform API only lets partners
                            change its memo.
                        </div>
                    )}

                    <InvoiceStatusActions
                        workspaceId={workspaceId}
                        invoice={invoice}
                    />

                    {isEditableDraft(invoice) && (
                        <InvoiceDraftEditor
                            key={`draft-${invoice.updatedAt}`}
                            workspaceId={workspaceId}
                            invoice={invoice}
                            accounts={accountsFor(invoice.entityId)}
                        />
                    )}

                    <InvoiceDetailsForm
                        key={`details-${invoice.updatedAt}`}
                        workspaceId={workspaceId}
                        invoice={invoice}
                    />
                </>
            )}
        </section>
    );
}
