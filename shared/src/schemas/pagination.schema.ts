import { z } from "zod";

/**
 * Offset/limit paging shared by Platform API list endpoints. Vendored from
 * `common/schemas/platform/pagination.platform.schema.ts` in the kick repo.
 */
export const PLATFORM_PAGE_LIMIT_DEFAULT = 100;
export const PLATFORM_PAGE_LIMIT_MAX = 100;

export const platformPaginationQuerySchema = z.object({
    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(PLATFORM_PAGE_LIMIT_MAX)
        .default(PLATFORM_PAGE_LIMIT_DEFAULT),
    offset: z.coerce.number().int().min(0).default(0),
});

export type PlatformPaginationQuery = z.infer<
    typeof platformPaginationQuerySchema
>;

export const platformPaginationSchema = z.object({
    limit: z.number().int(),
    offset: z.number().int(),
    total: z.number().int(),
});

export type PlatformPagination = z.infer<typeof platformPaginationSchema>;
