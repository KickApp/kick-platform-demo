import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
    InvoiceStatus,
    PlatformInvoice,
    PlatformInvoiceUpdateBody,
} from "@kick-demo/shared";
import { updateInvoice } from "../api/invoices";
import {
    allowedStatusTransitions,
    invalidateInvoiceQueries,
} from "../lib/invoices";
import { ErrorMessageBox } from "./StatusMessage";

const TRANSITION_LABELS: Record<InvoiceStatus, string> = {
    draft: "Back to draft",
    open: "Issue",
    paid: "Mark paid",
    void: "Void",
    uncollectable: "Write off as uncollectable",
};

function statusDateField(
    status: InvoiceStatus,
    date: string,
): Partial<PlatformInvoiceUpdateBody> {
    if (date === "") {
        return {};
    }
    switch (status) {
        case "paid":
            return { paidDate: date };
        case "void":
            return { voidedDate: date };
        case "uncollectable":
            return { uncollectableDate: date };
        default:
            return {};
    }
}

/**
 * Offers only the transitions Kick allows from the current status, and none
 * on a provider-owned invoice, whose status the provider reports. Paying,
 * voiding and writing off take an optional day, which Kick otherwise sets to
 * today in the workspace's timezone.
 */
export function InvoiceStatusActions({
    workspaceId,
    invoice,
}: {
    workspaceId: string;
    invoice: PlatformInvoice;
}) {
    const queryClient = useQueryClient();
    const [statusDate, setStatusDate] = useState("");
    const transitions = allowedStatusTransitions(invoice);
    const takesDate = transitions.some((status) => status !== "open");

    const mutation = useMutation({
        mutationFn: (status: InvoiceStatus) =>
            updateInvoice({
                workspaceId,
                invoiceId: invoice.id,
                body: { status, ...statusDateField(status, statusDate) },
            }),
        onSuccess: async (updated) => {
            setStatusDate("");
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

    if (transitions.length === 0) {
        return null;
    }

    return (
        <div className="card form-card">
            <h4 className="form-title">Change status</h4>
            {takesDate && (
                <label className="field">
                    <span className="field-label">
                        Paid, voided or written-off day (optional)
                    </span>
                    <input
                        type="date"
                        value={statusDate}
                        onChange={(event) => setStatusDate(event.target.value)}
                    />
                    <span className="field-hint">
                        Defaults to today in the workspace&apos;s timezone.
                    </span>
                </label>
            )}
            {mutation.error !== null && (
                <ErrorMessageBox error={mutation.error} />
            )}
            <div className="row-actions">
                {transitions.map((status) => (
                    <button
                        key={status}
                        type="button"
                        className={
                            status === "void" || status === "uncollectable"
                                ? "button button-danger"
                                : "button button-primary"
                        }
                        disabled={mutation.isPending}
                        onClick={() => {
                            const isConfirmed =
                                status !== "void" ||
                                window.confirm(
                                    "Void this invoice? A void invoice only takes a memo afterwards.",
                                );
                            if (isConfirmed) {
                                mutation.mutate(status);
                            }
                        }}
                    >
                        {mutation.isPending && mutation.variables === status
                            ? "Saving…"
                            : TRANSITION_LABELS[status]}
                    </button>
                ))}
            </div>
        </div>
    );
}
