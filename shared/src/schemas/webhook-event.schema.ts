import { z } from "zod";

/**
 * Wire shapes of the webhooks Kick delivers to a Platform partner. Every
 * delivery is wrapped in the same envelope carrying the event name; `version`
 * versions the envelope, so a receiver can tell a reshaped delivery from the
 * one it was written against. `occurredAt` is Unix seconds rather than the ISO
 * strings the REST resources use.
 */
export const KICK_WEBHOOK_ENVELOPE_VERSION = 1;

export const kickWebhookEnvelopeSchema = z.object({
    event: z.string(),
    version: z.literal(KICK_WEBHOOK_ENVELOPE_VERSION),
    occurredAt: z.number().int().nonnegative(),
    payload: z.unknown(),
});

export type KickWebhookEnvelope = z.infer<typeof kickWebhookEnvelopeSchema>;

export const PLAID_CONNECTION_DISCONNECTED_EVENT =
    "plaid.connection.disconnected";

export const ENTITY_LOCK_DATE_CHANGED_EVENT = "entity.lock_date.changed";

export const PLAID_CONNECTION_ERROR_CODES = [
    "disconnected",
    "mfa_required",
] as const;

export const plaidConnectionErrorCodeSchema = z.enum(
    PLAID_CONNECTION_ERROR_CODES,
);

export type PlaidConnectionErrorCode = z.infer<
    typeof plaidConnectionErrorCodeSchema
>;

/**
 * `plaid.connection.disconnected`: one of the organization's connections
 * stopped syncing and the business owner has to reconnect it.
 */
export const plaidConnectionDisconnectedPayloadSchema = z.object({
    connectionId: z.string().uuid(),
    workspaceId: z.string().uuid(),
    entityId: z.string().uuid(),
    bankName: z.string(),
    errorCode: plaidConnectionErrorCodeSchema,
});

export type PlaidConnectionDisconnectedPayload = z.infer<
    typeof plaidConnectionDisconnectedPayloadSchema
>;

/**
 * `entity.lock_date.changed`: an entity's lock date moved, through the
 * Platform API or in the Kick app. Both dates are YYYY-MM-DD; a null `date`
 * means the change unlocked the entity, a null `previousDate` that it had no
 * lock before.
 */
export const entityLockDateChangedPayloadSchema = z.object({
    entityId: z.string().uuid(),
    workspaceId: z.string().uuid(),
    date: z.string().date().nullable(),
    previousDate: z.string().date().nullable(),
});

export type EntityLockDateChangedPayload = z.infer<
    typeof entityLockDateChangedPayloadSchema
>;

export const KICK_WEBHOOK_EVENTS = [
    {
        name: PLAID_CONNECTION_DISCONNECTED_EVENT,
        schema: plaidConnectionDisconnectedPayloadSchema,
    },
    {
        name: ENTITY_LOCK_DATE_CHANGED_EVENT,
        schema: entityLockDateChangedPayloadSchema,
    },
] as const;

export type KickWebhookEventName = (typeof KICK_WEBHOOK_EVENTS)[number]["name"];

export type KickWebhookIdentification =
    | { kind: "known"; event: KickWebhookEventName }
    | { kind: "unknown"; event: string }
    | { kind: "unrecognized" };

/**
 * Names a delivery by its envelope's `event`. An event this demo does not
 * vendor — or a known event whose payload no longer matches the vendored
 * schema — is `unknown`, which is what a Kick-side addition or reshape looks
 * like from here; a body that is not an envelope at all is `unrecognized`.
 */
export function identifyKickWebhookEvent(
    body: unknown,
): KickWebhookIdentification {
    const envelope = kickWebhookEnvelopeSchema.safeParse(body);
    if (!envelope.success) {
        return { kind: "unrecognized" };
    }
    const { event, payload } = envelope.data;
    const known = KICK_WEBHOOK_EVENTS.find(
        (candidate) =>
            candidate.name === event &&
            candidate.schema.safeParse(payload).success,
    );
    return known !== undefined
        ? { kind: "known", event: known.name }
        : { kind: "unknown", event };
}
