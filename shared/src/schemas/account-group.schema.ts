import { z } from "zod";
import { accountTypeSchema } from "./chart-of-accounts.schema";
import {
    platformPaginationQuerySchema,
    platformPaginationSchema,
} from "./pagination.schema";

export const ACCOUNT_GROUP_NAME_MAX_LENGTH = 80;

/**
 * Wire shape of a Platform API account group. Groups organize an entity's
 * chart of accounts into a hierarchy: a group and every account inside it
 * share one account type, `parentGroupId` nests groups of the same type, and
 * the listing comes back in the order the chart displays.
 */
export const platformAccountGroupSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    type: accountTypeSchema,
    parentGroupId: z.string().uuid().nullable(),
    createdAt: z.string(),
});

export type PlatformAccountGroup = z.infer<typeof platformAccountGroupSchema>;

/** Account groups belong to one entity, so the routes nest under it. */
export const platformAccountGroupsPathParamsSchema = z.object({
    entityId: z.string().uuid(),
});

export const platformAccountGroupPathParamsSchema =
    platformAccountGroupsPathParamsSchema.extend({
        groupId: z.string().uuid(),
    });

export const platformAccountGroupsListQuerySchema =
    platformPaginationQuerySchema;

export type PlatformAccountGroupsListQuery = z.infer<
    typeof platformAccountGroupsListQuerySchema
>;

export const platformAccountGroupsListResponseSchema = z.object({
    data: z.array(platformAccountGroupSchema),
    pagination: platformPaginationSchema,
});

export type PlatformAccountGroupsListResponse = z.infer<
    typeof platformAccountGroupsListResponseSchema
>;

export const platformAccountGroupResponseSchema = z.object({
    group: platformAccountGroupSchema,
});

export type PlatformAccountGroupResponse = z.infer<
    typeof platformAccountGroupResponseSchema
>;

/**
 * A group's parent must share its type and names must be unique among
 * siblings of the same type; Kick answers 400 when either rule is broken.
 */
export const platformCreateAccountGroupBodySchema = z.object({
    name: z.string().trim().min(1).max(ACCOUNT_GROUP_NAME_MAX_LENGTH),
    type: accountTypeSchema,
    parentGroupId: z.string().uuid().nullable().optional(),
});

export type PlatformCreateAccountGroupBody = z.infer<
    typeof platformCreateAccountGroupBodySchema
>;

/**
 * A group's type is fixed once it exists; `update` renames and/or moves the
 * group under a different parent (null re-roots it at the top level).
 */
export const platformUpdateAccountGroupBodySchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(1)
            .max(ACCOUNT_GROUP_NAME_MAX_LENGTH)
            .optional(),
        parentGroupId: z.string().uuid().nullable().optional(),
    })
    .refine(
        (body) => body.name !== undefined || body.parentGroupId !== undefined,
        { message: "At least one field must be provided" },
    );

export type PlatformUpdateAccountGroupBody = z.infer<
    typeof platformUpdateAccountGroupBodySchema
>;
