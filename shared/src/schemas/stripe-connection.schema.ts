import { z } from "zod";
import { financialAccountTypeSchema } from "./financial-account.schema";

/**
 * Stripe account ids look like `acct_1PqXyZ2eZvKYlo2C`. Kick validates the
 * shape too, so keeping the pattern here turns a mistyped id or another kind
 * of Stripe id into a client-side error instead of a round trip.
 */
export const STRIPE_ACCOUNT_ID_PATTERN = /^acct_[0-9a-zA-Z]+$/;

/**
 * Wire shape of a Platform API Stripe connection. `name` is the Stripe
 * account's dashboard name, business name, email or id. `createdAt` is an
 * ISO-8601 datetime string.
 */
export const platformStripeConnectionSchema = z.object({
    id: z.string().uuid(),
    stripeAccountId: z.string(),
    name: z.string().nullable(),
    createdAt: z.string(),
});

export type PlatformStripeConnection = z.infer<
    typeof platformStripeConnectionSchema
>;

export const platformStripeAccountSchema = z.object({
    id: z.string().uuid(),
    entityId: z.string().uuid(),
    name: z.string().nullable(),
    type: financialAccountTypeSchema,
    createdAt: z.string(),
});

export type PlatformStripeAccount = z.infer<typeof platformStripeAccountSchema>;

export const platformStripeConnectionResponseSchema = z.object({
    connection: platformStripeConnectionSchema,
    account: platformStripeAccountSchema,
});

export type PlatformStripeConnectionResponse = z.infer<
    typeof platformStripeConnectionResponseSchema
>;

export const platformStripeConnectionPathParamsSchema = z.object({
    connectionId: z.string().uuid(),
});

/**
 * The partner connects an account of its own Stripe platform by id; Kick
 * reads it with the Stripe API key stored in the organization's API settings
 * and answers 400 until one is stored. There is no OAuth grant.
 */
export const createPlatformStripeConnectionBodySchema = z
    .object({
        entityId: z.string().uuid(),
        stripeAccountId: z
            .string()
            .max(64)
            .regex(
                STRIPE_ACCOUNT_ID_PATTERN,
                "stripeAccountId must be a Stripe account id like acct_1PqXyZ2eZvKYlo2C",
            ),
    })
    .strict();

export type CreatePlatformStripeConnectionBody = z.infer<
    typeof createPlatformStripeConnectionBodySchema
>;
