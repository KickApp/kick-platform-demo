import { z } from "zod";
import { PLAID_INSTITUTION_ID_PATTERN } from "./plaid-connection.schema";

/**
 * Schemas for the demo BFF's own Plaid Link endpoints. Unlike the rest of
 * `shared/`, these mirror nothing upstream: minting a processor token is the
 * partner's job, so it is this demo — not the Kick API — that owns the Link
 * flow and these shapes.
 */
export const plaidLinkConfigResponseSchema = z.object({
    configured: z
        .boolean()
        .describe("Whether the BFF has Plaid API credentials to run Link."),
    environment: z.string().nullable(),
});

export type PlaidLinkConfigResponse = z.infer<
    typeof plaidLinkConfigResponseSchema
>;

export const createPlaidLinkTokenResponseSchema = z.object({
    linkToken: z.string(),
    expiration: z.string(),
});

export type CreatePlaidLinkTokenResponse = z.infer<
    typeof createPlaidLinkTokenResponseSchema
>;

/**
 * `publicToken` is what Plaid Link hands the browser on success. `accountId`
 * is the account the user picked in Link; when Link is not configured for
 * single-account select it may be absent, and the BFF then resolves the one
 * eligible account itself. `institutionId` is the institution Link reported;
 * some flows (e.g. same-day micro-deposit items) report none, and the BFF
 * then reads it off the Item itself.
 */
export const createPlaidLinkConnectionBodySchema = z.object({
    entityId: z.string().uuid(),
    publicToken: z.string().min(1).max(200),
    accountId: z.string().min(1).max(200).optional(),
    institutionId: z
        .string()
        .max(64)
        .regex(PLAID_INSTITUTION_ID_PATTERN)
        .optional(),
});

export type CreatePlaidLinkConnectionBody = z.infer<
    typeof createPlaidLinkConnectionBodySchema
>;
