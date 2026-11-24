import type {
    PlatformCatalogItemCreateBody,
    PlatformCatalogItemsListQuery,
    PlatformCatalogItemUpdateBody,
} from "@kick-demo/shared";
import { toApiError } from "./errors";
import { api } from "./platform";

export async function fetchCatalogItems({
    workspaceId,
    ...query
}: { workspaceId: string } & PlatformCatalogItemsListQuery) {
    const result = await api.catalogItems.list({
        params: { workspaceId },
        query,
    });
    if (result.status === 200) {
        return result.body;
    }
    throw toApiError(result);
}

/** Reads archived items and prices too. */
export async function fetchCatalogItem({
    workspaceId,
    catalogItemId,
}: {
    workspaceId: string;
    catalogItemId: string;
}) {
    const result = await api.catalogItems.get({
        params: { workspaceId, catalogItemId },
    });
    if (result.status === 200) {
        return result.body.catalogItem;
    }
    throw toApiError(result);
}

/** A name an active item of the entity already has answers 409. */
export async function createCatalogItem({
    workspaceId,
    body,
}: {
    workspaceId: string;
    body: PlatformCatalogItemCreateBody;
}) {
    const result = await api.catalogItems.create({
        params: { workspaceId },
        body,
    });
    if (result.status === 201) {
        return result.body.catalogItem;
    }
    throw toApiError(result);
}

/**
 * The item's fields and its price operations are saved together or not at
 * all; a refused price batch answers 409.
 */
export async function updateCatalogItem({
    workspaceId,
    catalogItemId,
    body,
}: {
    workspaceId: string;
    catalogItemId: string;
    body: PlatformCatalogItemUpdateBody;
}) {
    const result = await api.catalogItems.update({
        params: { workspaceId, catalogItemId },
        body,
    });
    if (result.status === 200) {
        return result.body;
    }
    throw toApiError(result);
}

/** An item used on invoices answers 409; archive it instead. */
export async function deleteCatalogItem({
    workspaceId,
    catalogItemId,
}: {
    workspaceId: string;
    catalogItemId: string;
}) {
    const result = await api.catalogItems.delete({
        params: { workspaceId, catalogItemId },
    });
    if (result.status === 200) {
        return;
    }
    throw toApiError(result);
}
