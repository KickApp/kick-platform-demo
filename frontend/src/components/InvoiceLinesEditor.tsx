import {
    INVOICE_MAX_LINES,
    type PlatformAccount,
    type PlatformCatalogItem,
} from "@kick-demo/shared";
import { formatAmount } from "../lib/format";
import {
    applyCatalogItem,
    emptyLineDraft,
    lineDraftAmount,
    NO_SELECTION,
    type InvoiceLineDraft,
} from "../lib/invoice-lines";
import {
    activePrices,
    formatPriceLabel,
} from "../lib/use-entity-catalog-items";
import { AccountOptions } from "./AccountOptions";

/**
 * The item lines of an invoice. A line can start from a catalog item of the
 * invoice's entity, which prefills its description and price; its accounts
 * then come from the item unless the line picks its own. Tax is per line —
 * the only level Kick takes it on.
 */
export function InvoiceLinesEditor({
    drafts,
    onChange,
    catalogItems,
    accounts,
    isDisabled,
}: {
    drafts: InvoiceLineDraft[];
    onChange: (drafts: InvoiceLineDraft[]) => void;
    catalogItems: PlatformCatalogItem[];
    accounts: PlatformAccount[];
    isDisabled: boolean;
}) {
    const patch = (key: string, changes: Partial<InvoiceLineDraft>) =>
        onChange(
            drafts.map((draft) =>
                draft.key === key ? { ...draft, ...changes } : draft,
            ),
        );

    return (
        <fieldset className="form-fieldset" disabled={isDisabled}>
            <h4 className="form-section-title">Lines</h4>
            {drafts.map((draft) => {
                const item =
                    catalogItems.find(
                        (candidate) => candidate.id === draft.catalogItemId,
                    ) ?? null;
                return (
                    <div className="card form-card" key={draft.key}>
                        <div className="field-grid">
                            <label className="field">
                                <span className="field-label">
                                    Catalog item (optional)
                                </span>
                                <select
                                    value={draft.catalogItemId}
                                    onChange={(event) =>
                                        onChange(
                                            drafts.map((candidate) =>
                                                candidate.key === draft.key
                                                    ? applyCatalogItem(
                                                          candidate,
                                                          catalogItems.find(
                                                              (catalogItem) =>
                                                                  catalogItem.id ===
                                                                  event.target
                                                                      .value,
                                                          ) ?? null,
                                                      )
                                                    : candidate,
                                            ),
                                        )
                                    }
                                >
                                    <option value={NO_SELECTION}>None</option>
                                    {draft.catalogItemId !== NO_SELECTION &&
                                        item === null && (
                                            <option value={draft.catalogItemId}>
                                                {draft.original
                                                    ?.productOrService ??
                                                    "Archived item"}
                                            </option>
                                        )}
                                    {catalogItems.map((catalogItem) => (
                                        <option
                                            key={catalogItem.id}
                                            value={catalogItem.id}
                                        >
                                            {catalogItem.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="field">
                                <span className="field-label">Price</span>
                                <select
                                    value={draft.catalogItemPriceId}
                                    disabled={item === null}
                                    onChange={(event) => {
                                        const price = item?.prices.find(
                                            (candidate) =>
                                                candidate.id ===
                                                event.target.value,
                                        );
                                        patch(draft.key, {
                                            catalogItemPriceId:
                                                event.target.value,
                                            ...(price !== undefined && {
                                                unitAmount: `${price.unitAmount}`,
                                            }),
                                        });
                                    }}
                                >
                                    <option value={NO_SELECTION}>
                                        No price
                                    </option>
                                    {item !== null &&
                                        activePrices(item).map((price) => (
                                            <option
                                                key={price.id}
                                                value={price.id}
                                            >
                                                {formatPriceLabel(price)}
                                            </option>
                                        ))}
                                </select>
                            </label>
                        </div>
                        <label className="field">
                            <span className="field-label">Description</span>
                            <input
                                type="text"
                                value={draft.description}
                                maxLength={1000}
                                onChange={(event) =>
                                    patch(draft.key, {
                                        description: event.target.value,
                                    })
                                }
                                placeholder="Bookkeeping, October"
                                required
                            />
                        </label>
                        <div className="line-editor">
                            <label className="field">
                                <span className="field-label">Quantity</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={draft.quantity}
                                    onChange={(event) =>
                                        patch(draft.key, {
                                            quantity: event.target.value,
                                        })
                                    }
                                    required
                                />
                            </label>
                            <label className="field">
                                <span className="field-label">
                                    Unit amount (USD)
                                </span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={draft.unitAmount}
                                    onChange={(event) =>
                                        patch(draft.key, {
                                            unitAmount: event.target.value,
                                        })
                                    }
                                    required
                                />
                            </label>
                            <label className="field">
                                <span className="field-label">Tax (USD)</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={draft.tax}
                                    onChange={(event) =>
                                        patch(draft.key, {
                                            tax: event.target.value,
                                        })
                                    }
                                    placeholder="0.00"
                                />
                            </label>
                        </div>
                        <label className="field">
                            <span className="field-label">Revenue account</span>
                            <select
                                value={draft.revenueAccountId}
                                onChange={(event) =>
                                    patch(draft.key, {
                                        revenueAccountId: event.target.value,
                                    })
                                }
                            >
                                <AccountOptions
                                    accounts={accounts}
                                    emptyValue={NO_SELECTION}
                                    emptyLabel={
                                        item !== null
                                            ? "From the catalog item"
                                            : "Entity default"
                                    }
                                />
                            </select>
                        </label>
                        <div className="form-actions line-editor-footer">
                            <span className="page-meta">
                                Line total{" "}
                                {formatAmount(lineDraftAmount(draft))}
                            </span>
                            {drafts.length > 1 && (
                                <button
                                    type="button"
                                    className="button button-secondary"
                                    onClick={() =>
                                        onChange(
                                            drafts.filter(
                                                (candidate) =>
                                                    candidate.key !== draft.key,
                                            ),
                                        )
                                    }
                                >
                                    Remove line
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
            <div className="form-actions">
                <button
                    type="button"
                    className="button button-secondary"
                    disabled={drafts.length >= INVOICE_MAX_LINES}
                    onClick={() => onChange([...drafts, emptyLineDraft()])}
                >
                    Add line
                </button>
            </div>
        </fieldset>
    );
}
