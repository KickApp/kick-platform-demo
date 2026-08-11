import { z } from "zod";

/**
 * Wire shapes of the webhooks Kick delivers to a Platform partner. Every
 * payload carries a `version` so a receiver can tell a reshaped payload from
 * the one it was written against.
 */
export const KICK_WEBHOOK_PAYLOAD_VERSION = 1;

export const PLAID_CONNECTION_DISCONNECTED_EVENT =
    "plaid.connection.disconnected";

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
 * stopped syncing and the business owner has to reconnect it. `occurredAt` is
 * Unix seconds rather than the ISO strings the REST resources use.
 */
export const plaidConnectionDisconnectedPayloadSchema = z.object({
    version: z.literal(KICK_WEBHOOK_PAYLOAD_VERSION),
    connectionId: z.string().uuid(),
    workspaceId: z.string().uuid(),
    entityId: z.string().uuid(),
    bankName: z.string(),
    errorCode: plaidConnectionErrorCodeSchema,
    occurredAt: z.number().int().nonnegative(),
});

export type PlaidConnectionDisconnectedPayload = z.infer<
    typeof plaidConnectionDisconnectedPayloadSchema
>;

export const KICK_WEBHOOK_EVENTS = [
    {
        name: PLAID_CONNECTION_DISCONNECTED_EVENT,
        schema: plaidConnectionDisconnectedPayloadSchema,
    },
] as const;

export type KickWebhookEventName = (typeof KICK_WEBHOOK_EVENTS)[number]["name"];

/**
 * The delivered body is the bare payload: the event name is set on the Svix
 * message and never reaches the wire, so the only way to name an incoming
 * event is to match its shape. Returns `null` for a payload this demo does not
 * know, which is what a Kick-side addition looks like from here.
 */
export function identifyKickWebhookEvent(
    payload: unknown,
): KickWebhookEventName | null {
    const event = KICK_WEBHOOK_EVENTS.find(
        (candidate) => candidate.schema.safeParse(payload).success,
    );
    return event?.name ?? null;
}
