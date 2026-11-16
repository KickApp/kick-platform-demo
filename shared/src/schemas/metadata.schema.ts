import { z } from "zod";

export const PLATFORM_METADATA_MAX_BYTES = 1024;

export type PlatformMetadataValue =
    | string
    | number
    | boolean
    | null
    | PlatformMetadataValue[]
    | { [key: string]: PlatformMetadataValue };

export type PlatformMetadata = Record<string, PlatformMetadataValue>;

const platformMetadataValueSchema: z.ZodType<PlatformMetadataValue> = z.lazy(
    () =>
        z.union([
            z.string(),
            z.number().finite(),
            z.boolean(),
            z.null(),
            z.array(platformMetadataValueSchema),
            z.record(platformMetadataValueSchema),
        ]),
);

/**
 * Free-form JSON object owned by the API client; Kick stores it as-is and
 * never reads it. Unbounded on reads: the size limit is a write-time rule.
 */
export const platformMetadataWireSchema: z.ZodType<PlatformMetadata> = z.record(
    platformMetadataValueSchema,
);

/**
 * Replaces the stored metadata in full (`{}` clears it), at most
 * `PLATFORM_METADATA_MAX_BYTES` once serialized as UTF-8 JSON.
 */
export const platformMetadataSchema = platformMetadataWireSchema.refine(
    (metadata) =>
        new TextEncoder().encode(JSON.stringify(metadata)).length <=
        PLATFORM_METADATA_MAX_BYTES,
    {
        message: `Metadata must be ${PLATFORM_METADATA_MAX_BYTES} bytes or less`,
    },
);
