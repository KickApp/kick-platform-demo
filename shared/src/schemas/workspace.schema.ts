import { z } from "zod";
import { platformPaginationSchema } from "./pagination.schema";

/**
 * Wire shape of a Platform API workspace, i.e. the JSON the endpoint actually
 * returns rather than the server's internal representation of it.
 * `createdAt` is an ISO-8601 datetime string.
 *
 * Any Kick-internal fields the upstream API may include are deliberately
 * omitted; the BFF's response validation strips unmodeled fields before they
 * reach the browser.
 */
export const platformWorkspaceSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    createdAt: z.string(),
});

export type PlatformWorkspace = z.infer<typeof platformWorkspaceSchema>;

export const platformWorkspacePathParamsSchema = z.object({
    workspaceId: z.string().uuid(),
});

export const platformWorkspacesListResponseSchema = z.object({
    data: z.array(platformWorkspaceSchema),
    pagination: platformPaginationSchema,
});

export type PlatformWorkspacesListResponse = z.infer<
    typeof platformWorkspacesListResponseSchema
>;

export const platformWorkspaceResponseSchema = z.object({
    workspace: platformWorkspaceSchema,
});

export type PlatformWorkspaceResponse = z.infer<
    typeof platformWorkspaceResponseSchema
>;

export const createPlatformWorkspaceBodySchema = z.object({
    name: z.string().min(1).max(200),
});

export type CreatePlatformWorkspaceBody = z.infer<
    typeof createPlatformWorkspaceBodySchema
>;
