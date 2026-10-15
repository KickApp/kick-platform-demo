import { z } from "zod";
import {
    platformPaginationQuerySchema,
    platformPaginationSchema,
} from "./pagination.schema";
import { financialAccountTypeSchema } from "./financial-account.schema";
import { uuidArrayQueryParamSchema } from "./query.schema";

/**
 * Processor tokens look like `processor-<environment>-<identifier>`. Kick
 * validates the shape too, so keeping the pattern here turns a mistyped token
 * into a client-side error instead of a round trip.
 */
export const PROCESSOR_TOKEN_PATTERN =
    /^processor-(sandbox|development|production)-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)*$/;

/**
 * Plaid institution ids look like `ins_109508`. Kick validates the shape too,
 * so keeping the pattern here turns a name or a mistyped id into a
 * client-side error instead of a round trip.
 */
export const PLAID_INSTITUTION_ID_PATTERN = /^ins_[0-9a-zA-Z]+$/;

/**
 * Plaid account types, as the partner's own Link flow reports them. Mirrors
 * the Plaid SDK's `AccountType` enum, restated upstream for the wire schema.
 */
export const platformPlaidAccountTypeSchema = z.enum([
    "depository",
    "credit",
    "loan",
    "investment",
    "brokerage",
    "other",
]);

export type PlatformPlaidAccountType = z.infer<
    typeof platformPlaidAccountTypeSchema
>;

/**
 * Wire shape of a Platform API Plaid connection. `createdAt` is an ISO-8601
 * datetime string. The processor token is never echoed back.
 */
export const platformPlaidConnectionSchema = z.object({
    id: z.string().uuid(),
    institutionName: z.string(),
    institutionId: z.string().nullable(),
    createdAt: z.string(),
});

export type PlatformPlaidConnection = z.infer<
    typeof platformPlaidConnectionSchema
>;

export const platformPlaidAccountSchema = z.object({
    id: z.string().uuid(),
    entityId: z.string().uuid(),
    name: z.string().nullable(),
    accountNumberMask: z.string().nullable(),
    type: financialAccountTypeSchema,
    createdAt: z.string(),
});

export type PlatformPlaidAccount = z.infer<typeof platformPlaidAccountSchema>;

export const platformPlaidConnectionPathParamsSchema = z.object({
    connectionId: z.string().uuid(),
});

export const platformPlaidConnectionListQuerySchema =
    platformPaginationQuerySchema.extend({
        workspaceId: z.string().uuid(),
        entityIds: uuidArrayQueryParamSchema,
    });

export type PlatformPlaidConnectionListQuery = z.infer<
    typeof platformPlaidConnectionListQuerySchema
>;

export const platformPlaidConnectionListItemSchema = z.object({
    connection: platformPlaidConnectionSchema,
    accounts: z.array(platformPlaidAccountSchema),
});

export type PlatformPlaidConnectionListItem = z.infer<
    typeof platformPlaidConnectionListItemSchema
>;

export const platformPlaidConnectionListResponseSchema = z.object({
    data: z.array(platformPlaidConnectionListItemSchema),
    pagination: platformPaginationSchema,
});

export type PlatformPlaidConnectionListResponse = z.infer<
    typeof platformPlaidConnectionListResponseSchema
>;

export const platformPlaidConnectionResponseSchema = z.object({
    connection: platformPlaidConnectionSchema,
    account: platformPlaidAccountSchema,
});

export type PlatformPlaidConnectionResponse = z.infer<
    typeof platformPlaidConnectionResponseSchema
>;

/**
 * The partner owns the Plaid Link flow under its own credentials and hands
 * Kick the resulting `processor_token`, so there is no link-token or
 * public-token exchange on this surface. `institutionId` is required: no
 * processor endpoint names the institution, and it is what resolves the
 * connection's institution name and logo. Kick makes no Plaid account call at
 * creation time, so the account the token points at is declared here too:
 * `accountId` and `accountType` are required (`investment` and `brokerage`
 * types are rejected), and the account is created from `accountName` (the
 * institution name when omitted) and `accountNumberMask`.
 */
export const createPlatformPlaidConnectionBodySchema = z.object({
    entityId: z.string().uuid(),
    processorToken: z
        .string()
        .max(200)
        .regex(
            PROCESSOR_TOKEN_PATTERN,
            "processorToken must look like processor-<environment>-<identifier>",
        ),
    institutionId: z
        .string()
        .max(64)
        .regex(
            PLAID_INSTITUTION_ID_PATTERN,
            "institutionId must be a Plaid institution id like ins_109508",
        ),
    accountId: z.string().min(1).max(128),
    accountType: platformPlaidAccountTypeSchema,
    accountSubtype: z.string().min(1).max(64).optional(),
    accountName: z.string().min(1).max(100).optional(),
    accountNumberMask: z.string().min(1).max(20).optional(),
});

export type CreatePlatformPlaidConnectionBody = z.infer<
    typeof createPlatformPlaidConnectionBodySchema
>;
