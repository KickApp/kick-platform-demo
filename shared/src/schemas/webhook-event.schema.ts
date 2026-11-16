import { z } from "zod";
import { taskStatusSchema } from "./task.schema";

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

export const PLAID_CONNECTION_RECONNECTED_EVENT = "plaid.connection.reconnected";

export const ENTITY_LOCK_DATE_CHANGED_EVENT = "entity.lock_date.changed";

export const FINANCIAL_ACCOUNT_CREATED_EVENT = "financial_account.created";
export const FINANCIAL_ACCOUNT_UPDATED_EVENT = "financial_account.updated";
export const FINANCIAL_ACCOUNT_MOVED_EVENT = "financial_account.moved";
export const FINANCIAL_ACCOUNT_DELETED_EVENT = "financial_account.deleted";

export const TASK_CREATED_EVENT = "task.created";
export const TASK_UPDATED_EVENT = "task.updated";
export const TASK_STATUS_CHANGED_EVENT = "task.status_changed";
export const TASK_COMMENTED_EVENT = "task.commented";
export const TASK_DELETED_EVENT = "task.deleted";

export const PLAID_CONNECTION_ERROR_CODES = [
    "disconnected",
    "mfa_required",
    "item_not_supported",
    "item_removed",
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
 * `plaid.connection.reconnected`: a disconnected connection syncs again.
 * `disconnectedAt` is Unix seconds, like the envelope's `occurredAt`.
 */
export const plaidConnectionReconnectedPayloadSchema = z.object({
    connectionId: z.string().uuid(),
    workspaceId: z.string().uuid(),
    entityId: z.string().uuid(),
    bankName: z.string(),
    previousErrorCode: plaidConnectionErrorCodeSchema,
    disconnectedAt: z.number().int().nonnegative(),
});

export type PlaidConnectionReconnectedPayload = z.infer<
    typeof plaidConnectionReconnectedPayloadSchema
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

/**
 * Financial account fields whose change fires `financial_account.updated`.
 * Balance and sync timestamps refresh on every sync and never do.
 */
export const FINANCIAL_ACCOUNT_CHANGED_FIELDS = [
    "name",
    "type",
    "disabled",
    "bookkeepingStartDate",
    "bookkeepingEndDate",
] as const;

/** `financial_account.created` and `financial_account.deleted`. */
export const financialAccountEventPayloadSchema = z.object({
    financialAccountId: z.string().uuid(),
    workspaceId: z.string().uuid(),
    entityId: z.string().uuid(),
});

export type FinancialAccountEventPayload = z.infer<
    typeof financialAccountEventPayloadSchema
>;

export const financialAccountUpdatedPayloadSchema =
    financialAccountEventPayloadSchema.extend({
        changedFields: z.array(z.enum(FINANCIAL_ACCOUNT_CHANGED_FIELDS)).min(1),
    });

export type FinancialAccountUpdatedPayload = z.infer<
    typeof financialAccountUpdatedPayloadSchema
>;

/** `entityId` is where the account moved to. */
export const financialAccountMovedPayloadSchema =
    financialAccountEventPayloadSchema.extend({
        previousEntityId: z.string().uuid(),
    });

export type FinancialAccountMovedPayload = z.infer<
    typeof financialAccountMovedPayloadSchema
>;

/**
 * Task fields whose change fires `task.updated`; a status change is sent as
 * `task.status_changed` instead.
 */
export const TASK_CHANGED_FIELDS = [
    "title",
    "priority",
    "dueDate",
    "assigneeId",
    "groupId",
    "entityIds",
] as const;

const taskEventItemSchema = z.object({
    taskId: z.string().uuid(),
    entityIds: z.array(z.string().uuid()),
});

/**
 * Task events are batched: one delivery covers up to 100 tasks touched by the
 * same action in one workspace, and larger actions are split.
 */
const taskEventPayloadSchema = <TItem extends z.ZodTypeAny>(itemSchema: TItem) =>
    z.object({
        workspaceId: z.string().uuid(),
        tasks: z.array(itemSchema).min(1).max(100),
    });

export const taskCreatedPayloadSchema = taskEventPayloadSchema(
    taskEventItemSchema.extend({ status: taskStatusSchema }),
);

export const taskUpdatedPayloadSchema = taskEventPayloadSchema(
    taskEventItemSchema.extend({
        changedFields: z.array(z.enum(TASK_CHANGED_FIELDS)).min(1),
    }),
);

export const taskStatusChangedPayloadSchema = taskEventPayloadSchema(
    taskEventItemSchema.extend({
        status: taskStatusSchema,
        previousStatus: taskStatusSchema,
    }),
);

/** `authorId` is null for system comments; `content` is plain text. */
export const taskCommentedPayloadSchema = taskEventPayloadSchema(
    taskEventItemSchema.extend({
        commentId: z.string().uuid(),
        authorId: z.string().uuid().nullable(),
        content: z.string(),
    }),
);

export const taskDeletedPayloadSchema =
    taskEventPayloadSchema(taskEventItemSchema);

export const KICK_WEBHOOK_EVENTS = [
    {
        name: PLAID_CONNECTION_DISCONNECTED_EVENT,
        schema: plaidConnectionDisconnectedPayloadSchema,
    },
    {
        name: PLAID_CONNECTION_RECONNECTED_EVENT,
        schema: plaidConnectionReconnectedPayloadSchema,
    },
    {
        name: ENTITY_LOCK_DATE_CHANGED_EVENT,
        schema: entityLockDateChangedPayloadSchema,
    },
    {
        name: FINANCIAL_ACCOUNT_CREATED_EVENT,
        schema: financialAccountEventPayloadSchema,
    },
    {
        name: FINANCIAL_ACCOUNT_UPDATED_EVENT,
        schema: financialAccountUpdatedPayloadSchema,
    },
    {
        name: FINANCIAL_ACCOUNT_MOVED_EVENT,
        schema: financialAccountMovedPayloadSchema,
    },
    {
        name: FINANCIAL_ACCOUNT_DELETED_EVENT,
        schema: financialAccountEventPayloadSchema,
    },
    { name: TASK_CREATED_EVENT, schema: taskCreatedPayloadSchema },
    { name: TASK_UPDATED_EVENT, schema: taskUpdatedPayloadSchema },
    { name: TASK_STATUS_CHANGED_EVENT, schema: taskStatusChangedPayloadSchema },
    { name: TASK_COMMENTED_EVENT, schema: taskCommentedPayloadSchema },
    { name: TASK_DELETED_EVENT, schema: taskDeletedPayloadSchema },
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
