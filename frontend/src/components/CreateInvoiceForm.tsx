import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import type {
    PlatformCounterparty,
    PlatformEntity,
    PlatformInvoiceCreateBody,
} from "@kick-demo/shared";
import { createInvoice } from "../api/invoices";
import { formatAmount, todayIsoDate } from "../lib/format";
import {
    emptyLineDraft,
    isLineDraftComplete,
    lineDraftAmount,
    toCreateLine,
    type InvoiceLineDraft,
} from "../lib/invoice-lines";
import { invalidateInvoiceQueries } from "../lib/invoices";
import { useEntityAccounts } from "../lib/use-entity-accounts";
import { useEntityCatalogItems } from "../lib/use-entity-catalog-items";
import { CounterpartyPicker } from "./CounterpartyPicker";
import { InvoiceLinesEditor } from "./InvoiceLinesEditor";
import { ErrorMessageBox } from "./StatusMessage";

type CreateStatus = "draft" | "open";

function parseAdjustment(value: string): number | null {
    if (value.trim() === "") {
        return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : Number.NaN;
}

/**
 * Creates an invoice in Kick for an existing counterparty. Kick sends no
 * email, so the partner owns delivery and payment: `customPaymentLink` is
 * where the customer pays. Discount and deposit are offered on the invoice
 * only, which keeps the "on the invoice or on its lines, not both" rule from
 * ever being broken. "Create & issue" sends `status: open`, which posts the
 * invoice's journal entries right away.
 */
export function CreateInvoiceForm({
    workspaceId,
    entities,
    onDone,
}: {
    workspaceId: string;
    entities: PlatformEntity[];
    onDone: () => void;
}) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [entityId, setEntityId] = useState(entities[0]?.id ?? "");
    const [customer, setCustomer] = useState<PlatformCounterparty | null>(null);
    const [customPaymentLink, setCustomPaymentLink] = useState("");
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [invoiceDate, setInvoiceDate] = useState(todayIsoDate());
    const [dueDate, setDueDate] = useState("");
    const [memo, setMemo] = useState("");
    const [discount, setDiscount] = useState("");
    const [deposit, setDeposit] = useState("");
    const [drafts, setDrafts] = useState<InvoiceLineDraft[]>(() => [
        emptyLineDraft(),
    ]);

    const { catalogItems, error: catalogItemsError } = useEntityCatalogItems({
        workspaceId,
        entityId,
    });
    const { accountsFor } = useEntityAccounts(
        entityId !== "" ? [entityId] : [],
    );

    const parsedDiscount = parseAdjustment(discount);
    const parsedDeposit = parseAdjustment(deposit);
    const total =
        drafts.reduce((sum, draft) => sum + lineDraftAmount(draft), 0) -
        (parsedDiscount ?? 0) -
        (parsedDeposit ?? 0);

    const isSubmittable =
        entityId !== "" &&
        customer !== null &&
        customPaymentLink.startsWith("https://") &&
        invoiceDate !== "" &&
        (dueDate === "" || dueDate >= invoiceDate) &&
        !Number.isNaN(parsedDiscount) &&
        !Number.isNaN(parsedDeposit) &&
        drafts.length > 0 &&
        drafts.every(isLineDraftComplete);

    const toBody = (status: CreateStatus): PlatformInvoiceCreateBody => ({
        entityId,
        customerId: customer?.id ?? "",
        customPaymentLink: customPaymentLink.trim(),
        status,
        invoiceDate,
        currency: "usd",
        ...(invoiceNumber.trim() !== "" && {
            invoiceNumber: invoiceNumber.trim(),
        }),
        ...(dueDate !== "" && { dueDate }),
        ...(memo.trim() !== "" && { memo: memo.trim() }),
        ...(parsedDiscount !== null &&
            parsedDiscount > 0 && { discount: parsedDiscount }),
        ...(parsedDeposit !== null &&
            parsedDeposit > 0 && { deposit: parsedDeposit }),
        lines: drafts.map(toCreateLine),
    });

    const mutation = useMutation({
        mutationFn: (status: CreateStatus) =>
            createInvoice({ workspaceId, body: toBody(status) }),
        onSuccess: async (invoice) => {
            queryClient.setQueryData(
                ["invoice", workspaceId, invoice.id],
                invoice,
            );
            await invalidateInvoiceQueries({
                queryClient,
                workspaceId,
                invoice,
            });
            await navigate(invoice.id);
        },
    });

    return (
        <form
            className="card form-card form-card-wide"
            onSubmit={(event) => {
                event.preventDefault();
                if (isSubmittable) {
                    mutation.mutate("draft");
                }
            }}
        >
            <h3 className="form-title">Create invoice</h3>
            <div className="field-grid">
                <label className="field">
                    <span className="field-label">Entity</span>
                    <select
                        value={entityId}
                        onChange={(event) => {
                            setEntityId(event.target.value);
                            setDrafts([emptyLineDraft()]);
                        }}
                        required
                    >
                        {entities.map((entity) => (
                            <option key={entity.id} value={entity.id}>
                                {entity.name}
                            </option>
                        ))}
                    </select>
                    <span className="field-hint">
                        Issues the invoice; catalog items and accounts come from
                        it.
                    </span>
                </label>
                <label className="field">
                    <span className="field-label">
                        Invoice number (optional)
                    </span>
                    <input
                        type="text"
                        value={invoiceNumber}
                        maxLength={255}
                        onChange={(event) =>
                            setInvoiceNumber(event.target.value)
                        }
                        placeholder="Next number of the entity"
                    />
                </label>
            </div>
            <label className="field">
                <span className="field-label">Customer</span>
                <CounterpartyPicker
                    workspaceId={workspaceId}
                    selected={customer}
                    onSelect={setCustomer}
                />
                <span className="field-hint">
                    Its name, primary contact and default address are printed on
                    the invoice.
                </span>
            </label>
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
                    placeholder="https://pay.example.com/inv_123"
                    required
                />
                <span className="field-hint">
                    Where the customer pays. Must be https; the invoice
                    email&apos;s pay button opens it.
                </span>
            </label>
            <div className="field-grid">
                <label className="field">
                    <span className="field-label">Invoice date</span>
                    <input
                        type="date"
                        value={invoiceDate}
                        onChange={(event) => setInvoiceDate(event.target.value)}
                        required
                    />
                    <span className="field-hint">
                        The day it posts to the books.
                    </span>
                </label>
                <label className="field">
                    <span className="field-label">Due date (optional)</span>
                    <input
                        type="date"
                        value={dueDate}
                        min={invoiceDate}
                        onChange={(event) => setDueDate(event.target.value)}
                    />
                </label>
            </div>
            <label className="field">
                <span className="field-label">Memo (optional)</span>
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

            {catalogItemsError !== null && (
                <ErrorMessageBox error={catalogItemsError} />
            )}
            <InvoiceLinesEditor
                drafts={drafts}
                onChange={setDrafts}
                catalogItems={catalogItems}
                accounts={accountsFor(entityId)}
                isDisabled={mutation.isPending}
            />

            <div className="field-grid">
                <label className="field">
                    <span className="field-label">
                        Discount (USD, optional)
                    </span>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={discount}
                        onChange={(event) => setDiscount(event.target.value)}
                    />
                </label>
                <label className="field">
                    <span className="field-label">
                        Deposit collected (USD, optional)
                    </span>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={deposit}
                        onChange={(event) => setDeposit(event.target.value)}
                    />
                </label>
            </div>
            <p className="page-meta">
                Estimated total {formatAmount(total)}. Kick computes the final
                amounts and refuses a negative total.
            </p>

            {mutation.error !== null && (
                <ErrorMessageBox error={mutation.error} />
            )}
            <div className="form-actions">
                <button
                    type="button"
                    className="button button-secondary"
                    onClick={onDone}
                    disabled={mutation.isPending}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="button button-secondary"
                    disabled={mutation.isPending || !isSubmittable}
                >
                    {mutation.isPending && mutation.variables === "draft"
                        ? "Saving…"
                        : "Save draft"}
                </button>
                <button
                    type="button"
                    className="button button-primary"
                    disabled={mutation.isPending || !isSubmittable}
                    onClick={() => mutation.mutate("open")}
                >
                    {mutation.isPending && mutation.variables === "open"
                        ? "Issuing…"
                        : "Create & issue"}
                </button>
            </div>
        </form>
    );
}
