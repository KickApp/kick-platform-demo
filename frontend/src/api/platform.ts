import { initClient } from "@ts-rest/core";
import {
    errorMessageSchema,
    platformContract,
    type CreatePlatformEntityBody,
    type CreatePlatformWorkspaceBody,
} from "@kick-demo/shared";

/**
 * Client against the demo BFF, which mirrors the Kick Platform API contract
 * under `/api` (proxied to the backend by the Vite dev server).
 */
const api = initClient(platformContract, { baseUrl: "/api" });

export class ApiError extends Error {
    constructor(
        readonly status: number,
        message: string,
    ) {
        super(message);
    }
}

function toApiError(result: { status: number; body: unknown }): ApiError {
    const parsedBody = errorMessageSchema.safeParse(result.body);
    const message = parsedBody.success
        ? parsedBody.data.message
        : `Request failed with status ${result.status}`;
    return new ApiError(result.status, message);
}

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
