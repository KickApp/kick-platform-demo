import { z } from "zod";
import {
    platformPaginationQuerySchema,
    platformPaginationSchema,
} from "./pagination.schema";
import { arrayQueryParamSchema } from "./query.schema";
import { platformUserIdentitySchema } from "./task.schema";

/**
 * `shared` messages are visible to everyone working on the task, `internal`
 * ones only to the token's organization.
 */
export const TASK_MESSAGE_VISIBILITIES = ["shared", "internal"] as const;

export const taskMessageVisibilitySchema = z.enum(TASK_MESSAGE_VISIBILITIES);

export type TaskMessageVisibility = z.infer<typeof taskMessageVisibilitySchema>;

export const TASK_MESSAGE_VISIBILITY_LABELS: Record<
    TaskMessageVisibility,
    string
> = {
    shared: "Shared",
    internal: "Internal",
};

export const TASK_MESSAGE_VISIBILITY_HINTS: Record<
    TaskMessageVisibility,
    string
> = {
    shared: "Everyone working on the task sees it.",
    internal: "Only your organization sees it.",
};

/**
 * Wire shape of a message in a task's thread. `content` is plain text, one
 * line per paragraph or list item, and null once the message is deleted.
 * `parentMessageId` points a reply at the message it answers; it is null on
 * the main timeline. `authorId` is null for system messages and for messages
 * posted through the Platform API. `author` is present only when requested
 * through `relations`.
 */
export const platformTaskMessageSchema = z.object({
    id: z.string().uuid(),
    taskId: z.string().uuid(),
    parentMessageId: z.string().uuid().nullable(),
    authorId: z.string().uuid().nullable(),
    content: z.string().nullable(),
    visibility: taskMessageVisibilitySchema,
    isDeleted: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
    author: platformUserIdentitySchema.nullable().optional(),
});

export type PlatformTaskMessage = z.infer<typeof platformTaskMessageSchema>;

export const TASK_MESSAGE_RELATIONS = ["author"] as const;

export const platformTaskMessagesPathParamsSchema = z.object({
    workspaceId: z.string().uuid(),
    taskId: z.string().uuid(),
});

/** Messages are listed oldest first, replies included. */
export const platformTaskMessagesListQuerySchema =
    platformPaginationQuerySchema.extend({
        relations: arrayQueryParamSchema(z.enum(TASK_MESSAGE_RELATIONS)),
    });

export type PlatformTaskMessagesListQuery = z.infer<
    typeof platformTaskMessagesListQuerySchema
>;

export const platformTaskMessagesListResponseSchema = z.object({
    data: z.array(platformTaskMessageSchema),
    pagination: platformPaginationSchema,
});

export type PlatformTaskMessagesListResponse = z.infer<
    typeof platformTaskMessagesListResponseSchema
>;

export const PLATFORM_TASK_MESSAGE_MAX_LENGTH = 10000;

/**
 * Posts to the main timeline of the task's thread, never as a reply, and
 * without an author: Kick labels it as coming from the Platform API.
 * `visibility` defaults to `shared` upstream.
 */
export const platformCreateTaskMessageBodySchema = z
    .object({
        content: z.string().trim().min(1).max(PLATFORM_TASK_MESSAGE_MAX_LENGTH),
        visibility: taskMessageVisibilitySchema.optional(),
    })
    .strict();

export type PlatformCreateTaskMessageBody = z.infer<
    typeof platformCreateTaskMessageBodySchema
>;

export const platformTaskMessageResponseSchema = z.object({
    message: platformTaskMessageSchema,
});

export type PlatformTaskMessageResponse = z.infer<
    typeof platformTaskMessageResponseSchema
>;
