import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    CATALOG_ITEM_MONETARY_MAX,
    type PlatformCatalogItem,
    type PlatformCatalogItemPriceOperation,
} from "@kick-demo/shared";
import { updateCatalogItem } from "../api/catalog-items";
import {
    defaultPrice,
    formatPriceLabel,
} from "../lib/use-entity-catalog-items";
import { formatDateTime } from "../lib/format";
import { ErrorMessageBox } from "./StatusMessage";

const NEW_PRICE_CLIENT_ID = "new-price";

/**
 * Prices are immutable, so a price change is a new price plus archiving the
 * old one. The add form sends both as one ordered `update` batch — the new
 * price takes the default first, which is what lets the old default be
 * archived in the same request. Every other action is a one-operation batch.
 * Kick's 409 explains a refused batch (no active price left, archiving or
 * deleting the default, deleting a price used on invoices).
 */
export function CatalogItemPricesEditor({
    workspaceId,
    item,
}: {
    workspaceId: string;
    item: PlatformCatalogItem;
}) {
    const queryClient = useQueryClient();
    const currentDefault = defaultPrice(item);
    const [unitAmount, setUnitAmount] = useState("");
    const [description, setDescription] = useState("");
    const [isDefault, setIsDefault] = useState(item.prices.length === 0);
    const [shouldArchiveOldDefault, setShouldArchiveOldDefault] =
        useState(true);

    const mutation = useMutation({
        mutationFn: (prices: PlatformCatalogItemPriceOperation[]) =>
            updateCatalogItem({
                workspaceId,
                catalogItemId: item.id,
                body: { prices },
            }),
        onSuccess: async (_result, prices) => {
            if (prices.some((operation) => operation.op === "create")) {
                setUnitAmount("");
                setDescription("");
            }
            await queryClient.invalidateQueries({
                queryKey: ["catalog-items", workspaceId],
            });
        },
    });

    const parsedAmount = Number(unitAmount);
    const isAmountValid =
        unitAmount.trim() !== "" &&
        Number.isFinite(parsedAmount) &&
        Math.abs(parsedAmount) <= CATALOG_ITEM_MONETARY_MAX;

    const submitNewPrice = () => {
        const operations: PlatformCatalogItemPriceOperation[] = [
            {
                op: "create",
                clientId: NEW_PRICE_CLIENT_ID,
                unitAmount: parsedAmount,
                currency: "usd",
                ...(isDefault && { isDefault: true }),
                ...(description.trim() !== "" && {
                    description: description.trim(),
                }),
            },
        ];
        if (isDefault && shouldArchiveOldDefault && currentDefault !== null) {
            operations.push({
                op: "update",
                priceId: currentDefault.id,
                active: false,
            });
        }
        mutation.mutate(operations);
    };

    return (
        <div className="card form-card form-card-wide">
            <h4 className="form-title">Prices of {item.name}</h4>
            {item.prices.length === 0 ? (
                <p className="page-meta">No prices yet.</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Price</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {item.prices.map((price) => (
                            <tr key={price.id}>
                                <td>{formatPriceLabel(price)}</td>
                                <td>
                                    {price.isDefault && (
                                        <span className="badge badge-success">
                                            Default
                                        </span>
                                    )}{" "}
                                    {!price.active && (
                                        <span className="badge">Archived</span>
                                    )}
                                </td>
                                <td>{formatDateTime(price.createdAt)}</td>
                                <td>
                                    <div className="row-actions">
                                        {price.active && !price.isDefault && (
                                            <button
                                                type="button"
                                                className="button button-secondary"
                                                disabled={mutation.isPending}
                                                onClick={() =>
                                                    mutation.mutate([
                                                        {
                                                            op: "update",
                                                            priceId: price.id,
                                                            isDefault: true,
                                                        },
                                                    ])
                                                }
                                            >
                                                Make default
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className="button button-secondary"
                                            disabled={mutation.isPending}
                                            onClick={() =>
                                                mutation.mutate([
                                                    {
                                                        op: "update",
                                                        priceId: price.id,
                                                        active: !price.active,
                                                    },
                                                ])
                                            }
                                        >
                                            {price.active
                                                ? "Archive"
                                                : "Enable"}
                                        </button>
                                        <button
                                            type="button"
                                            className="button button-danger"
                                            disabled={mutation.isPending}
                                            onClick={() =>
                                                mutation.mutate([
                                                    {
                                                        op: "delete",
                                                        priceId: price.id,
                                                    },
                                                ])
                                            }
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    if (isAmountValid) {
                        submitNewPrice();
                    }
                }}
            >
                <h4 className="form-section-title">Add a price</h4>
                <div className="field-grid">
                    <label className="field">
                        <span className="field-label">Unit amount (USD)</span>
                        <input
                            type="number"
                            step="0.01"
                            value={unitAmount}
                            onChange={(event) =>
                                setUnitAmount(event.target.value)
                            }
                            placeholder="150.00"
                            required
                        />
                    </label>
                    <label className="field">
                        <span className="field-label">
                            Description (optional)
                        </span>
                        <input
                            type="text"
                            value={description}
                            maxLength={1000}
                            onChange={(event) =>
                                setDescription(event.target.value)
                            }
                            placeholder="Hourly rate"
                        />
                    </label>
                </div>
                <label className="field-checkbox">
                    <input
                        type="checkbox"
                        checked={isDefault}
                        onChange={(event) => setIsDefault(event.target.checked)}
                    />
                    Make it the default price
                </label>
                {isDefault && currentDefault !== null && (
                    <label className="field-checkbox">
                        <input
                            type="checkbox"
                            checked={shouldArchiveOldDefault}
                            onChange={(event) =>
                                setShouldArchiveOldDefault(event.target.checked)
                            }
                        />
                        Archive the current default (
                        {formatPriceLabel(currentDefault)}) in the same request
                    </label>
                )}
                {mutation.error !== null && (
                    <ErrorMessageBox error={mutation.error} />
                )}
                <div className="form-actions">
                    <button
                        type="submit"
                        className="button button-primary"
                        disabled={mutation.isPending || !isAmountValid}
                    >
                        {mutation.isPending ? "Saving…" : "Add price"}
                    </button>
                </div>
            </form>
        </div>
    );
}
