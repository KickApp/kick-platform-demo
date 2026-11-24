import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    CATALOG_ITEM_SOURCE_LABELS,
    CATALOG_ITEM_TYPE_LABELS,
    type PlatformAccount,
    type PlatformCatalogItem,
} from "@kick-demo/shared";
import { deleteCatalogItem, updateCatalogItem } from "../api/catalog-items";
import { formatAccountLabel } from "../lib/use-entity-accounts";
import {
    defaultPrice,
    formatPriceLabel,
} from "../lib/use-entity-catalog-items";
import { CatalogItemPricesEditor } from "./CatalogItemPricesEditor";

type CatalogItemAction = "rename" | "archive" | "delete";

const COLUMN_COUNT = 8;

/**
 * One catalog item, with rename, archive/enable and delete inline, and its
 * prices in an expandable editor below the row. Deleting an item used on
 * invoices answers 409; the row then offers archiving instead, which keeps
 * the item on existing invoices.
 */
export function CatalogItemRow({
    workspaceId,
    item,
    entityName,
    accounts,
}: {
    workspaceId: string;
    item: PlatformCatalogItem;
    entityName: string | null;
    accounts: PlatformAccount[];
}) {
    const queryClient = useQueryClient();
    const [isRenaming, setIsRenaming] = useState(false);
    const [name, setName] = useState(item.name);
    const [isEditingPrices, setIsEditingPrices] = useState(false);

    const mutation = useMutation({
        mutationFn: async ({
            action,
            renamedTo,
        }: {
            action: CatalogItemAction;
            renamedTo?: string;
        }) => {
            const params = { workspaceId, catalogItemId: item.id };
            switch (action) {
                case "rename":
                    await updateCatalogItem({
                        ...params,
                        body: { name: renamedTo ?? item.name },
                    });
                    return;
                case "archive":
                    await updateCatalogItem({
                        ...params,
                        body: { active: !item.active },
                    });
                    return;
                case "delete":
                    await deleteCatalogItem(params);
                    return;
            }
        },
        onSuccess: async () => {
            setIsRenaming(false);
            await queryClient.invalidateQueries({
                queryKey: ["catalog-items", workspaceId],
            });
        },
        onError: () => {
            setIsRenaming(false);
            setName(item.name);
        },
    });

    const submitRename = () => {
        const renamedTo = name.trim();
        if (renamedTo === "" || renamedTo === item.name) {
            setName(item.name);
            setIsRenaming(false);
            return;
        }
        mutation.mutate({ action: "rename", renamedTo });
    };

    const price = defaultPrice(item);
    const revenueAccount =
        item.revenueAccountId !== null
            ? accounts.find((account) => account.id === item.revenueAccountId)
            : undefined;
    const isDeleteRefused =
        mutation.error !== null &&
        mutation.variables?.action === "delete" &&
        item.active;

    return (
        <>
            <tr>
                <td>
                    {isRenaming ? (
                        <div className="cell-editor">
                            <input
                                type="text"
                                value={name}
                                maxLength={255}
                                autoFocus
                                onChange={(event) =>
                                    setName(event.target.value)
                                }
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        submitRename();
                                    }
                                    if (event.key === "Escape") {
                                        setName(item.name);
                                        setIsRenaming(false);
                                    }
                                }}
                                onBlur={submitRename}
                            />
                        </div>
                    ) : (
                        <div className="cell-editable">
                            <button
                                type="button"
                                className="cell-button"
                                disabled={mutation.isPending}
                                onClick={() => {
                                    mutation.reset();
                                    setIsRenaming(true);
                                }}
                            >
                                {item.name}
                            </button>
                        </div>
                    )}
                    {item.description !== null && (
                        <span className="cell-meta">{item.description}</span>
                    )}
                    {mutation.error !== null && (
                        <span className="cell-error">
                            {mutation.error.message}
                        </span>
                    )}
                </td>
                <td>{entityName ?? "—"}</td>
                <td className="mono">{item.sku ?? "—"}</td>
                <td>{CATALOG_ITEM_TYPE_LABELS[item.type]}</td>
                <td>{price !== null ? formatPriceLabel(price) : "—"}</td>
                <td>
                    {item.revenueAccountId === null
                        ? "Entity default"
                        : revenueAccount !== undefined
                          ? formatAccountLabel(revenueAccount)
                          : item.revenueAccountId}
                </td>
                <td>
                    {item.active ? (
                        <span className="badge badge-success">Active</span>
                    ) : (
                        <span className="badge">Archived</span>
                    )}
                    {item.source !== null && (
                        <span className="cell-meta">
                            From {CATALOG_ITEM_SOURCE_LABELS[item.source]}
                        </span>
                    )}
                </td>
                <td>
                    <div className="row-actions">
                        {mutation.isPending ? (
                            <span className="cell-pending">Saving…</span>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    className="button button-secondary"
                                    onClick={() =>
                                        setIsEditingPrices(!isEditingPrices)
                                    }
                                >
                                    {isEditingPrices
                                        ? "Close prices"
                                        : "Prices"}
                                </button>
                                <button
                                    type="button"
                                    className={
                                        isDeleteRefused
                                            ? "button button-primary"
                                            : "button button-secondary"
                                    }
                                    onClick={() =>
                                        mutation.mutate({ action: "archive" })
                                    }
                                >
                                    {item.active ? "Archive" : "Enable"}
                                </button>
                                <button
                                    type="button"
                                    className="button button-danger"
                                    onClick={() => {
                                        const confirmed = window.confirm(
                                            `Delete "${item.name}" and its prices? Deletion is permanent; archive it instead to keep it on existing invoices.`,
                                        );
                                        if (confirmed) {
                                            mutation.mutate({
                                                action: "delete",
                                            });
                                        }
                                    }}
                                >
                                    Delete
                                </button>
                            </>
                        )}
                    </div>
                </td>
            </tr>
            {isEditingPrices && (
                <tr className="row-editor">
                    <td colSpan={COLUMN_COUNT}>
                        <CatalogItemPricesEditor
                            workspaceId={workspaceId}
                            item={item}
                        />
                    </td>
                </tr>
            )}
        </>
    );
}
