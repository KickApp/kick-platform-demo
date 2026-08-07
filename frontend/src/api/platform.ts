import { initClient } from "@ts-rest/core";
import {
    platformContract,
    type CreatePlatformEntityBody,
    type CreatePlatformWorkspaceBody,
} from "@kick-demo/shared";
import { toApiError } from "./errors";

/**
 * Client against the demo BFF, which mirrors the Kick Platform API contract
 * under `/api` (proxied to the backend by the Vite dev server).
 */
const api = initClient(platformContract, { baseUrl: "/api" });

export async function fetchWorkspaces(query: {
    limit: number;
    offset: number;
}) {
    const result = await api.workspaces.list({ query });
    if (result.status === 200) {
        return result.body;
    }
    throw toApiError(result);
}

export async function fetchWorkspace(workspaceId: string) {
    const result = await api.workspaces.get({ params: { workspaceId } });
    if (result.status === 200) {
        return result.body.workspace;
    }
    throw toApiError(result);
}

export async function createWorkspace(body: CreatePlatformWorkspaceBody) {
    const result = await api.workspaces.create({ body });
    if (result.status === 201) {
        return result.body.workspace;
    }
    throw toApiError(result);
}

export async function fetchEntities(query: {
    workspaceId: string;
    limit: number;
    offset: number;
}) {
    const result = await api.entities.list({ query });
    if (result.status === 200) {
        return result.body;
    }
    throw toApiError(result);
}

export async function createEntity(body: CreatePlatformEntityBody) {
    const result = await api.entities.create({ body });
    if (result.status === 201) {
        return result.body.entity;
    }
    throw toApiError(result);
}

export async function fetchPlaidConnections(query: {
    workspaceId: string;
    entityIds?: string[];
    limit: number;
    offset: number;
}) {
    const result = await api.plaidConnections.list({ query });
    if (result.status === 200) {
        return result.body;
    }
    throw toApiError(result);
}

export async function deletePlaidConnection(connectionId: string) {
    const result = await api.plaidConnections.delete({
        params: { connectionId },
    });
    if (result.status === 200) {
        return;
    }
    throw toApiError(result);
}

export async function fetchTransactions(query: {
    workspaceId: string;
    startDate?: string;
    endDate?: string;
    limit: number;
    offset: number;
}) {
    const { workspaceId, ...rest } = query;
    const result = await api.transactions.list({
        params: { workspaceId },
        query: rest,
    });
    if (result.status === 200) {
        return result.body;
    }
    throw toApiError(result);
}
