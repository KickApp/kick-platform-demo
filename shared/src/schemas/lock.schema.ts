import { z } from "zod";
import {
    platformPaginationQuerySchema,
    platformPaginationSchema,
} from "./pagination.schema";
import { uuidArrayQueryParamSchema } from "./query.schema";

/**
 * Wire shape of a Platform API lock. An entity has at most one lock, keyed by
 * the entity: `date` is the last locked calendar day (YYYY-MM-DD), inclusive,
 * and Kick blocks changes to transactions and journal entries dated on or
 * before it.
 */
export const platformLockSchema = z.object({
    entityId: z.string().uuid(),
    workspaceId: z.string().uuid(),
    date: z.string().date().nullable(),
});

export type PlatformLock = z.infer<typeof platformLockSchema>;

/**
 * The list is scoped to one workspace, optionally narrowed to some of its
 * entities; an entity outside the workspace answers 400. Unlocked entities
 * are left out of the listing.
 */
export const platformLocksListQuerySchema =
    platformPaginationQuerySchema.extend({
        workspaceId: z.string().uuid(),
        entityIds: uuidArrayQueryParamSchema,
    });

export type PlatformLocksListQuery = z.infer<
    typeof platformLocksListQuerySchema
>;

export const platformLocksListResponseSchema = z.object({
    data: z.array(platformLockSchema),
    pagination: platformPaginationSchema,
});

export type PlatformLocksListResponse = z.infer<
    typeof platformLocksListResponseSchema
>;

/** A null `date` unlocks the entity. */
export const platformSetLockBodySchema = z
    .object({
        entityId: z.string().uuid(),
        date: z.string().date().nullable(),
    })
    .strict();

export type PlatformSetLockBody = z.infer<typeof platformSetLockBodySchema>;

export const platformLockResponseSchema = z.object({
    lock: platformLockSchema,
});

export type PlatformLockResponse = z.infer<typeof platformLockResponseSchema>;
