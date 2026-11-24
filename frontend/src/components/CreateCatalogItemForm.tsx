import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    CATALOG_ITEM_MONETARY_MAX,
    CATALOG_ITEM_TYPE_LABELS,
    CATALOG_ITEM_TYPES,
    type CatalogItemType,
    type PlatformCatalogItemCreateBody,
    type PlatformEntity,
} from "@kick-demo/shared";
import { createCatalogItem } from "../api/catalog-items";
import { useEntityAccounts } from "../lib/use-entity-accounts";
import { AccountOptions } from "./AccountOptions";
import { ErrorMessageBox } from "./StatusMessage";

const ENTITY_DEFAULT_ACCOUNT = "";

/**
 * Creates an item with at most one starting price, made the default. More
 * prices are added afterwards from the item's row. Only the fields filled in
 * are sent, so an empty account leaves the entity default in place.
 */
export function CreateCatalogItemForm({
    workspaceId,
    entities,
    onDone,
}: {
    workspaceId: string;
    entities: PlatformEntity[];
    onDone: () => void;
}) {
    const queryClient = useQueryClient();
    const [entityId, setEntityId] = useState(entities[0]?.id ?? "");
    const [name, setName] = useState("");
    const [type, setType] = useState<CatalogItemType>("service");
    const [sku, setSku] = useState("");
    const [description, setDescription] = useState("");
    const [revenueAccountId, setRevenueAccountId] = useState(
        ENTITY_DEFAULT_ACCOUNT,
    );
    const [unitAmount, setUnitAmount] = useState("");
    const { accountsFor, error: accountsError } = useEntityAccounts(
        entityId !== "" ? [entityId] : [],
    );

    const parsedAmount = Number(unitAmount);
    const hasPrice = unitAmount.trim() !== "";
    const isPriceValid =
        !hasPrice ||
        (Number.isFinite(parsedAmount) &&
            Math.abs(parsedAmount) <= CATALOG_ITEM_MONETARY_MAX);

    const toBody = (): PlatformCatalogItemCreateBody => ({
        entityId,
        name: name.trim(),
        type,
        currency: "usd",
        ...(sku.trim() !== "" && { sku: sku.trim() }),
        ...(description.trim() !== "" && { description: description.trim() }),
        ...(revenueAccountId !== ENTITY_DEFAULT_ACCOUNT && {
            revenueAccountId,
        }),
        ...(hasPrice && {
            prices: [
                {
                    op: "create" as const,
                    clientId: "starting-price",
                    unitAmount: parsedAmount,
                    currency: "usd",
                    isDefault: true,
                },
            ],
        }),
    });

    const mutation = useMutation({
        mutationFn: () => createCatalogItem({ workspaceId, body: toBody() }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ["catalog-items", workspaceId],
            });
            onDone();
        },
    });

    return (
        <form
            className="card form-card form-card-wide"
            onSubmit={(event) => {
                event.preventDefault();
                mutation.mutate();
            }}
        >
            <h3 className="form-title">Create catalog item</h3>
            <div className="field-grid">
                <label className="field">
                    <span className="field-label">Entity</span>
                    <select
                        value={entityId}
                        onChange={(event) => {
                            setEntityId(event.target.value);
                            setRevenueAccountId(ENTITY_DEFAULT_ACCOUNT);
                        }}
                        required
                    >
                        {entities.map((entity) => (
                            <option key={entity.id} value={entity.id}>
                                {entity.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="field">
                    <span className="field-label">Type</span>
                    <select
                        value={type}
                        onChange={(event) =>
                            setType(
                                CATALOG_ITEM_TYPES.find(
                                    (value) => value === event.target.value,
                                ) ?? "service",
                            )
                        }
                    >
                        {CATALOG_ITEM_TYPES.map((value) => (
                            <option key={value} value={value}>
                                {CATALOG_ITEM_TYPE_LABELS[value]}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="field">
                    <span className="field-label">Name</span>
                    <input
                        type="text"
                        value={name}
                        maxLength={255}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Monthly bookkeeping"
                        required
                        autoFocus
                    />
                    <span className="field-hint">
                        Unique among the entity&apos;s active items, ignoring
                        case.
                    </span>
                </label>
                <label className="field">
                    <span className="field-label">SKU (optional)</span>
                    <input
                        type="text"
                        value={sku}
                        maxLength={255}
                        onChange={(event) => setSku(event.target.value)}
                    />
                </label>
            </div>
            <label className="field">
                <span className="field-label">Description (optional)</span>
                <input
                    type="text"
                    value={description}
                    maxLength={1000}
                    onChange={(event) => setDescription(event.target.value)}
                />
            </label>
            <label className="field">
                <span className="field-label">Revenue account</span>
                <select
                    value={revenueAccountId}
                    onChange={(event) =>
                        setRevenueAccountId(event.target.value)
                    }
                >
                    <AccountOptions
                        accounts={accountsFor(entityId)}
                        emptyValue={ENTITY_DEFAULT_ACCOUNT}
                        emptyLabel="Entity default"
                    />
                </select>
                <span className="field-hint">
                    Copied onto invoice lines created from the item, usually an
                    income account.
                </span>
                {accountsError !== null && (
                    <span className="field-error">{accountsError.message}</span>
                )}
            </label>
            <label className="field">
                <span className="field-label">
                    Default price, USD (optional)
                </span>
                <input
                    type="number"
                    step="0.01"
                    value={unitAmount}
                    onChange={(event) => setUnitAmount(event.target.value)}
                    placeholder="500.00"
                />
            </label>
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
                    className="button button-primary"
                    disabled={
                        mutation.isPending ||
                        entityId === "" ||
                        name.trim() === "" ||
                        !isPriceValid
                    }
                >
                    {mutation.isPending ? "Creating…" : "Create catalog item"}
                </button>
            </div>
        </form>
    );
}
