import { useQuery } from "@tanstack/react-query";
import type {
    PlatformCatalogItem,
    PlatformCatalogItemPrice,
} from "@kick-demo/shared";
import { fetchCatalogItems } from "../api/catalog-items";

/** One page of the Platform API's maximum size is plenty for a demo entity. */
const CATALOG_ITEM_LOOKUP_LIMIT = 100;

/**
 * The active catalog items of one entity, the ones Kick lets a new invoice
 * line use. Disabled until an entity is picked.
 */
export function useEntityCatalogItems({
    workspaceId,
    entityId,
}: {
    workspaceId: string;
    entityId: string;
}) {
    const query = useQuery({
        queryKey: ["catalog-items", workspaceId, "lookup", entityId],
        queryFn: () =>
            fetchCatalogItems({
                workspaceId,
                entityIds: [entityId],
                status: "active",
                limit: CATALOG_ITEM_LOOKUP_LIMIT,
                offset: 0,
            }),
        enabled: entityId !== "",
    });

    return {
        catalogItems: query.data?.data ?? [],
        isPending: query.isPending && entityId !== "",
        error: query.error,
    };
}

export function defaultPrice(
    item: PlatformCatalogItem,
): PlatformCatalogItemPrice | null {
    return item.prices.find((price) => price.isDefault) ?? null;
}

export function activePrices(
    item: PlatformCatalogItem,
): PlatformCatalogItemPrice[] {
    return item.prices.filter((price) => price.active);
}

export function formatPriceLabel(price: PlatformCatalogItemPrice): string {
    const amount = new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: price.currency.toUpperCase(),
    }).format(price.unitAmount);
    return price.description !== null && price.description !== ""
        ? `${amount} — ${price.description}`
        : amount;
}
