import { z } from "zod";
import { platformPaginationSchema } from "./pagination.schema";

/**
 * Wire shape of a Platform API workspace. The kick repo's server-side schema
 * (`common/schemas/platform/workspace.platform.schema.ts`) transforms internal
 * entity rows into this shape; here we describe the resulting JSON directly.
 * `createdAt` is an ISO-8601 datetime string.
 */
export const platformWorkspaceSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    glFirstEnabled: z.boolean(),
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
    bookkeepingStartDate: z.string().date(),
});

export type CreatePlatformWorkspaceBody = z.infer<
    typeof createPlatformWorkspaceBodySchema
>;
