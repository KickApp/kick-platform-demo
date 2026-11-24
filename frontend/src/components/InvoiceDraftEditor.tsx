import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
    PlatformAccount,
    PlatformCounterparty,
    PlatformInvoice,
    PlatformInvoiceUpdateBody,
} from "@kick-demo/shared";
import { updateInvoice } from "../api/invoices";
import { fetchCounterparty } from "../api/platform";
import {
    isLineDraftComplete,
    lineDraftFromLine,
    toUpdateLine,
    type InvoiceLineDraft,
} from "../lib/invoice-lines";
import { invalidateInvoiceQueries } from "../lib/invoices";
import { useEntityCatalogItems } from "../lib/use-entity-catalog-items";
import { CounterpartyPicker } from "./CounterpartyPicker";
import { InvoiceLinesEditor } from "./InvoiceLinesEditor";
import { ErrorMessageBox } from "./StatusMessage";

function parseAdjustment(value: string): number {
    return value.trim() === "" ? 0 : Number(value);
}

/**
 * The content of a draft created in Kick, the only invoice Kick lets every
 * field of change: customer, number, date, discount, deposit and lines. Only
 * changed fields are sent. `lines` replaces the whole list, so it is sent
 * whenever a line was added, removed or edited; kept lines go with their `id`
 * and just the fields that changed, which keeps Kick's own values (their
 * line-level discount or deposit, for one) for the rest.
 */
export function InvoiceDraftEditor({
    workspaceId,
    invoice,
    accounts,
}: {
    workspaceId: string;
    invoice: PlatformInvoice;
    accounts: PlatformAccount[];
}) {
    const queryClient = useQueryClient();
    const [pickedCustomer, setPickedCustomer] =
        useState<PlatformCounterparty | null>(null);
    const [invoiceNumber, setInvoiceNumber] = useState(
        invoice.invoiceNumber ?? "",
    );
    const [invoiceDate, setInvoiceDate] = useState(invoice.invoiceDate ?? "");
    const [discount, setDiscount] = useState(
        invoice.discount !== 0 ? `${invoice.discount}` : "",
    );
    const [deposit, setDeposit] = useState(
        invoice.deposit !== 0 ? `${invoice.deposit}` : "",
    );
    const [drafts, setDrafts] = useState<InvoiceLineDraft[]>(() =>
        invoice.lines.map(lineDraftFromLine),
    );

    const currentCustomerQuery = useQuery({
        queryKey: ["counterparty", workspaceId, invoice.customerId],
        queryFn: () =>
            fetchCounterparty({
                workspaceId,
                counterpartyId: invoice.customerId ?? "",
            }),
        enabled: invoice.customerId !== null,
        retry: false,
    });
    const customer = pickedCustomer ?? currentCustomerQuery.data ?? null;

    const { catalogItems } = useEntityCatalogItems({
        workspaceId,
        entityId: invoice.entityId,
    });

    const parsedDiscount = parseAdjustment(discount);
    const parsedDeposit = parseAdjustment(deposit);
    const updateLines = drafts.map(toUpdateLine);
    const haveLinesChanged =
        drafts.length !== invoice.lines.length ||
        updateLines.some(
            (line) => line.id === undefined || Object.keys(line).length > 1,
        );

    const body: PlatformInvoiceUpdateBody = {
        ...(pickedCustomer !== null &&
            pickedCustomer.id !== invoice.customerId && {
                customerId: pickedCustomer.id,
            }),
        ...(invoiceNumber.trim() !== "" &&
            invoiceNumber.trim() !== (invoice.invoiceNumber ?? "") && {
                invoiceNumber: invoiceNumber.trim(),
            }),
        ...(invoiceDate !== "" &&
            invoiceDate !== invoice.invoiceDate && { invoiceDate }),
        ...(parsedDiscount !== invoice.discount && {
            discount: parsedDiscount,
        }),
        ...(parsedDeposit !== invoice.deposit && { deposit: parsedDeposit }),
        ...(haveLinesChanged && { lines: updateLines }),
    };
    const hasChanges = Object.keys(body).length > 0;
    const isValid =
        Number.isFinite(parsedDiscount) &&
        parsedDiscount >= 0 &&
        Number.isFinite(parsedDeposit) &&
        parsedDeposit >= 0 &&
        drafts.length > 0 &&
        drafts.every(isLineDraftComplete);

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
            className="card form-card form-card-wide"
            onSubmit={(event) => {
                event.preventDefault();
                if (hasChanges && isValid) {
                    mutation.mutate();
                }
            }}
        >
            <h4 className="form-title">Edit draft</h4>
            <label className="field">
                <span className="field-label">Customer</span>
                <CounterpartyPicker
                    workspaceId={workspaceId}
                    selected={customer}
                    onSelect={setPickedCustomer}
                />
            </label>
            <div className="field-grid">
                <label className="field">
                    <span className="field-label">Invoice number</span>
                    <input
                        type="text"
                        value={invoiceNumber}
                        maxLength={255}
                        onChange={(event) =>
                            setInvoiceNumber(event.target.value)
                        }
                    />
                </label>
                <label className="field">
                    <span className="field-label">Invoice date</span>
                    <input
                        type="date"
                        value={invoiceDate}
                        max={invoice.dueDate ?? undefined}
                        onChange={(event) => setInvoiceDate(event.target.value)}
                    />
                </label>
            </div>

            <InvoiceLinesEditor
                drafts={drafts}
                onChange={setDrafts}
                catalogItems={catalogItems}
                accounts={accounts}
                isDisabled={mutation.isPending}
            />

            <div className="field-grid">
                <label className="field">
                    <span className="field-label">Discount (USD)</span>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={discount}
                        onChange={(event) => setDiscount(event.target.value)}
                    />
                    <span className="field-hint">
                        Changing it moves the discount onto the whole invoice.
                    </span>
                </label>
                <label className="field">
                    <span className="field-label">Deposit collected (USD)</span>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={deposit}
                        onChange={(event) => setDeposit(event.target.value)}
                    />
                </label>
            </div>

            {mutation.error !== null && (
                <ErrorMessageBox error={mutation.error} />
            )}
            <div className="form-actions">
                <button
                    type="submit"
                    className="button button-primary"
                    disabled={mutation.isPending || !hasChanges || !isValid}
                >
                    {mutation.isPending ? "Saving…" : "Save draft"}
                </button>
            </div>
        </form>
    );
}
