import { z } from "zod";

/**
 * Error envelope returned by the Kick API. Mirrors `ErrorMessageSchema` from
 * the kick repo (`common/schemas/error.schema.ts`); `statusCode` is added by
 * the NestJS error envelope on the wire.
 */
export const errorMessageSchema = z.object({
    message: z.string(),
    statusCode: z.number().int().optional(),
    traceId: z.string().nullable().optional(),
});

export type ErrorMessage = z.infer<typeof errorMessageSchema>;
