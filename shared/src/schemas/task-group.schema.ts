import { z } from "zod";
import {
    platformPaginationQuerySchema,
    platformPaginationSchema,
} from "./pagination.schema";
import {
    arrayQueryParamSchema,
    uuidArrayQueryParamSchema,
} from "./query.schema";

/**
 * Where a task group is defined: `global` groups are shared by every
 * workspace, `workspace` groups belong to the workspace and `organization`
 * groups belong to the token's organization.
 */
export const TASK_GROUP_SCOPES = [
    "global",
    "workspace",
    "organization",
] as const;

export const taskGroupScopeSchema = z.enum(TASK_GROUP_SCOPES);

export type TaskGroupScope = z.infer<typeof taskGroupScopeSchema>;

export const TASK_GROUP_SCOPE_LABELS: Record<TaskGroupScope, string> = {
    global: "Global",
    workspace: "Workspace",
    organization: "Organization",
};

/** `isSystem` marks groups managed by Kick rather than by users. */
export const platformTaskGroupSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    scope: taskGroupScopeSchema,
    isSystem: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export type PlatformTaskGroup = z.infer<typeof platformTaskGroupSchema>;

/**
 * Task groups are listed for a workspace: the global groups, the workspace's
 * own and the organization's, sorted by name.
 */
export const platformTaskGroupsPathParamsSchema = z.object({
    workspaceId: z.string().uuid(),
});

export const platformTaskGroupsListQuerySchema =
    platformPaginationQuerySchema.extend({
        ids: uuidArrayQueryParamSchema,
        scopes: arrayQueryParamSchema(taskGroupScopeSchema),
        search: z.string().min(1).max(200).optional(),
    });

export type PlatformTaskGroupsListQuery = z.infer<
    typeof platformTaskGroupsListQuerySchema
>;

export const platformTaskGroupsListResponseSchema = z.object({
    data: z.array(platformTaskGroupSchema),
    pagination: platformPaginationSchema,
});

export type PlatformTaskGroupsListResponse = z.infer<
    typeof platformTaskGroupsListResponseSchema
>;
