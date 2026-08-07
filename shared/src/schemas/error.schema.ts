import { z } from "zod";

/**
 * Error envelope returned by the Kick API. `message` is always present;
 * `statusCode` and `traceId` are optional because not every error carries them.
 */
export const errorMessageSchema = z.object({
    message: z.string(),
    statusCode: z.number().int().optional(),
    traceId: z.string().nullable().optional(),
});

export type ErrorMessage = z.infer<typeof errorMessageSchema>;
