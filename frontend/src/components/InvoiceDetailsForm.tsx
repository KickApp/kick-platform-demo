import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
    PlatformInvoice,
    PlatformInvoiceUpdateBody,
} from "@kick-demo/shared";
import { updateInvoice } from "../api/invoices";
import {
    canEditDueDate,
    canEditPaymentLink,
    invalidateInvoiceQueries,
} from "../lib/invoices";
import { ErrorMessageBox } from "./StatusMessage";

/**
 * The fields an invoice keeps writable after it is issued, offered per the
 * source and status rules: every invoice takes `memo`; all but
 * provider-owned and void ones take `dueDate`; only invoices created in Kick
 * take `customPaymentLink`, and not once void. Only changed fields are sent,
 * so a provider-owned invoice never gets a field it would refuse.
 */
export function InvoiceDetailsForm({
    workspaceId,
    invoice,
}: {
    workspaceId: string;
    invoice: PlatformInvoice;
}) {
    const queryClient = useQueryClient();
    const [memo, setMemo] = useState(invoice.memo ?? "");
    const [dueDate, setDueDate] = useState(invoice.dueDate ?? "");
    const [customPaymentLink, setCustomPaymentLink] = useState(
        invoice.customPaymentLink ?? "",
    );
    const isDueDateEditable = canEditDueDate(invoice);
    const isPaymentLinkEditable = canEditPaymentLink(invoice);

    const body: PlatformInvoiceUpdateBody = {
        ...(memo.trim() !== (invoice.memo ?? "") && {
            memo: memo.trim() === "" ? null : memo.trim(),
        }),
        ...(isDueDateEditable &&
            dueDate !== (invoice.dueDate ?? "") && {
                dueDate: dueDate === "" ? null : dueDate,
            }),
        ...(isPaymentLinkEditable &&
            customPaymentLink.trim() !== "" &&
            customPaymentLink.trim() !== (invoice.customPaymentLink ?? "") && {
                customPaymentLink: customPaymentLink.trim(),
            }),
    };
    const hasChanges = Object.keys(body).length > 0;

    const mutation = useMutation({
        mutationFn: () =>
            updateInvoice({ workspaceId, invoiceId: invoice.id, body }),
        onSuccess: async (updated) => {
            queryClient.setQueryData(
                ["invoice", workspaceId, updated.id],
                updated,
            );
            await invalidateInvoiceQueries({
                queryClient,
                workspaceId,
                invoice: updated,
            });
        },
    });

    return (
        <form
            className="card form-card"
            onSubmit={(event) => {
                event.preventDefault();
                if (hasChanges) {
                    mutation.mutate();
                }
            }}
        >
            <h4 className="form-title">Details</h4>
            <label className="field">
                <span className="field-label">Memo</span>
                <input
                    type="text"
                    value={memo}
                    maxLength={1000}
                    onChange={(event) => setMemo(event.target.value)}
                />
                <span className="field-hint">
                    Internal note, not shown to the customer.
                </span>
            </label>
            {isDueDateEditable && (
                <label className="field">
                    <span className="field-label">Due date</span>
                    <input
                        type="date"
                        value={dueDate}
                        min={invoice.invoiceDate ?? undefined}
                        onChange={(event) => setDueDate(event.target.value)}
                    />
                    <span className="field-hint">Empty clears it.</span>
                </label>
            )}
            {isPaymentLinkEditable && (
                <label className="field">
                    <span className="field-label">Payment link</span>
                    <input
                        type="url"
                        value={customPaymentLink}
                        maxLength={2048}
                        pattern="https://.*"
                        onChange={(event) =>
                            setCustomPaymentLink(event.target.value)
                        }
                    />
                </label>
            )}
            {mutation.error !== null && (
                <ErrorMessageBox error={mutation.error} />
            )}
            <div className="form-actions">
                <button
                    type="submit"
                    className="button button-primary"
                    disabled={mutation.isPending || !hasChanges}
                >
                    {mutation.isPending ? "Saving…" : "Save details"}
                </button>
            </div>
        </form>
    );
}
