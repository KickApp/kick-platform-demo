import { z } from "zod";
import {
    platformPaginationQuerySchema,
    platformPaginationSchema,
} from "./pagination.schema";

/**
 * Financial account types the Platform API reports. Mirrors
 * `FinancialAccountType` from the kick repo
 * (`common/types/financialAccount.ts`).
 */
export const FINANCIAL_ACCOUNT_TYPES = [
    "checking",
    "savings",
    "credit_card",
    "loan",
    "line_of_credit",
    "investment",
    "payment_processor",
    "cash",
    "other",
] as const;

export const financialAccountTypeSchema = z.enum(FINANCIAL_ACCOUNT_TYPES);

export type FinancialAccountType = z.infer<typeof financialAccountTypeSchema>;

export const FINANCIAL_ACCOUNT_TYPE_LABELS: Record<
    FinancialAccountType,
    string
> = {
    checking: "Checking",
    savings: "Savings",
    credit_card: "Credit card",
    loan: "Loan",
    line_of_credit: "Line of credit",
    investment: "Investment",
    payment_processor: "Payment processor",
    cash: "Cash",
    other: "Other",
};

/**
 * Processor tokens look like `processor-<environment>-<identifier>`. Kick
 * validates the shape too, so keeping the pattern here turns a mistyped token
 * into a client-side error instead of a round trip.
 */
export const PROCESSOR_TOKEN_PATTERN =
    /^processor-(sandbox|development|production)-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)*$/;

/**
 * Wire shape of a Platform API Plaid connection, vendored from
 * `common/schemas/platform/plaid-connection.platform.schema.ts` in the kick
 * repo. `createdAt` is an ISO-8601 datetime string. The processor token is
 * never echoed back.
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

/**
 * A single value or a repeated `entityIds` query param both normalize to an
 * array, matching how the upstream API parses the filter.
 */
export const platformPlaidConnectionListEntityIdsSchema = z.preprocess(
    (value) => {
        if (value === undefined || value === null || value === "") {
            return undefined;
        }
        return Array.isArray(value) ? value : [value];
    },
    z.array(z.string().uuid()).min(1).optional(),
);

export const platformPlaidConnectionListQuerySchema =
    platformPaginationQuerySchema.extend({
        workspaceId: z.string().uuid(),
        entityIds: platformPlaidConnectionListEntityIdsSchema,
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
 * public-token exchange on this surface.
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
});

export type CreatePlatformPlaidConnectionBody = z.infer<
    typeof createPlatformPlaidConnectionBodySchema
>;
