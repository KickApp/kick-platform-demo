import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    CATALOG_ITEM_STATUS_FILTERS,
    type CatalogItemStatusFilter,
} from "@kick-demo/shared";
import { fetchCatalogItems } from "../api/catalog-items";
import { CatalogItemRow } from "../components/CatalogItemRow";
import { CreateCatalogItemForm } from "../components/CreateCatalogItemForm";
import { Pagination } from "../components/Pagination";
import {
    EmptyMessage,
    ErrorMessageBox,
    LoadingMessage,
} from "../components/StatusMessage";
import { useDebouncedValue } from "../lib/use-debounced-value";
import { useEntityAccounts } from "../lib/use-entity-accounts";
import { useWorkspaceEntities } from "../lib/use-workspace-entities";
import { useWorkspaceContext } from "../lib/workspace-context";

const PAGE_SIZE = 25;
const ALL_ENTITIES = "";

const STATUS_FILTER_LABELS: Record<CatalogItemStatusFilter, string> = {
    active: "Active",
    archived: "Archived",
    all: "All",
};

/**
 * The products and services the workspace sells on invoices, across its
 * entities, with the form that creates one. Listing them needs a plan with
 * invoicing; Kick's 403 says so otherwise.
 */
export function WorkspaceCatalogItemsPage() {
    const { workspaceId } = useWorkspaceContext();
    const { entities, entityName } = useWorkspaceEntities(workspaceId);
    const [offset, setOffset] = useState(0);
    const [entityId, setEntityId] = useState(ALL_ENTITIES);
    const [searchInput, setSearchInput] = useState("");
    const search = useDebouncedValue(searchInput.trim());
    const [status, setStatus] = useState<CatalogItemStatusFilter>("active");
    const [isCreating, setIsCreating] = useState(false);

    const itemsQuery = useQuery({
        queryKey: [
            "catalog-items",
            workspaceId,
            entityId,
            search,
            status,
            offset,
        ],
        queryFn: () =>
            fetchCatalogItems({
                workspaceId,
                ...(entityId !== ALL_ENTITIES && { entityIds: [entityId] }),
                ...(search !== "" && { search }),
                status,
                limit: PAGE_SIZE,
                offset,
            }),
    });

    const items = itemsQuery.data?.data ?? [];
    const { accountsFor } = useEntityAccounts(
        items
            .filter((item) => item.revenueAccountId !== null)
            .map((item) => item.entityId),
    );
    const hasFilters =
        entityId !== ALL_ENTITIES || searchInput !== "" || status !== "active";

    return (
        <section>
            <div className="page-header">
                <div>
                    <h3 className="section-title">Catalog items</h3>
                    {itemsQuery.data && (
                        <p className="page-meta">
                            {itemsQuery.data.pagination.total} items, sorted by
                            name
                        </p>
                    )}
                </div>
                {!isCreating && (
                    <div className="row-actions">
                        <button
                            type="button"
                            className="button button-primary"
                            onClick={() => setIsCreating(true)}
                            disabled={entities.length === 0}
                        >
                            Create catalog item
                        </button>
                    </div>
                )}
            </div>

            {isCreating && (
                <CreateCatalogItemForm
                    workspaceId={workspaceId}
                    entities={entities}
                    onDone={() => setIsCreating(false)}
                />
            )}

            <div className="filter-bar">
                <label className="field-inline">
                    <span className="field-label">Entity</span>
                    <select
                        value={entityId}
                        onChange={(event) => {
                            setEntityId(event.target.value);
                            setOffset(0);
                        }}
                    >
                        <option value={ALL_ENTITIES}>All entities</option>
                        {entities.map((entity) => (
                            <option key={entity.id} value={entity.id}>
                                {entity.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="field-inline">
                    <span className="field-label">Search</span>
                    <input
                        type="search"
                        placeholder="Name or SKU…"
                        value={searchInput}
                        maxLength={255}
                        onChange={(event) => {
                            setSearchInput(event.target.value);
                            setOffset(0);
                        }}
                    />
                </label>
                <label className="field-inline">
                    <span className="field-label">Status</span>
                    <select
                        value={status}
                        onChange={(event) => {
                            setStatus(
                                CATALOG_ITEM_STATUS_FILTERS.find(
                                    (value) => value === event.target.value,
                                ) ?? "active",
                            );
                            setOffset(0);
                        }}
                    >
                        {CATALOG_ITEM_STATUS_FILTERS.map((value) => (
                            <option key={value} value={value}>
                                {STATUS_FILTER_LABELS[value]}
                            </option>
                        ))}
                    </select>
                </label>
                {hasFilters && (
                    <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => {
                            setEntityId(ALL_ENTITIES);
                            setSearchInput("");
                            setStatus("active");
                            setOffset(0);
                        }}
                    >
                        Clear filters
                    </button>
                )}
            </div>

            {itemsQuery.isPending && <LoadingMessage label="catalog items" />}
            {itemsQuery.error !== null && (
                <ErrorMessageBox error={itemsQuery.error} />
            )}

            {itemsQuery.data && items.length === 0 && (
                <EmptyMessage>
                    {hasFilters
                        ? "No catalog items match these filters."
                        : "No catalog items in this workspace yet."}
                </EmptyMessage>
            )}

            {items.length > 0 && (
                <div className="card table-card">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Entity</th>
                                <th>SKU</th>
                                <th>Type</th>
                                <th>Default price</th>
                                <th>Revenue account</th>
                                <th>Status</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <CatalogItemRow
                                    key={item.id}
                                    workspaceId={workspaceId}
                                    item={item}
                                    entityName={entityName(item.entityId)}
                                    accounts={accountsFor(item.entityId)}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {itemsQuery.data && (
                <Pagination
                    pagination={itemsQuery.data.pagination}
                    onOffsetChange={setOffset}
                />
            )}
        </section>
    );
}
