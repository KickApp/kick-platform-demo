import { initContract } from "@ts-rest/core";
import { errorMessageSchema } from "../schemas/error.schema";
import { platformPaginationQuerySchema } from "../schemas/pagination.schema";
import {
    platformChartOfAccountsListQuerySchema,
    platformChartOfAccountsListResponseSchema,
    platformChartOfAccountsPathParamsSchema,
} from "../schemas/chart-of-accounts.schema";
import {
    createPlatformEntityBodySchema,
    platformEntitiesListQuerySchema,
    platformEntitiesListResponseSchema,
    platformEntityPathParamsSchema,
    platformEntityResponseSchema,
} from "../schemas/entity.schema";
import {
    platformBalanceSheetResponseSchema,
    platformCashFlowResponseSchema,
    platformGeneralLedgerQuerySchema,
    platformGeneralLedgerResponseSchema,
    platformProfitAndLossResponseSchema,
    platformReportPathParamsSchema,
    platformReportQuerySchema,
    platformTrialBalanceResponseSchema,
} from "../schemas/report.schema";
import {
    createPlatformPlaidConnectionBodySchema,
    platformPlaidConnectionListQuerySchema,
    platformPlaidConnectionListResponseSchema,
    platformPlaidConnectionPathParamsSchema,
    platformPlaidConnectionResponseSchema,
} from "../schemas/plaid-connection.schema";
import {
    platformTransactionPathParamsSchema,
    platformTransactionResponseSchema,
    platformTransactionsListQuerySchema,
    platformTransactionsListResponseSchema,
    platformTransactionsPathParamsSchema,
    platformTransactionUpdateBodySchema,
} from "../schemas/transaction.schema";
import {
    createPlatformWorkspaceBodySchema,
    platformWorkspacePathParamsSchema,
    platformWorkspaceResponseSchema,
    platformWorkspacesListResponseSchema,
} from "../schemas/workspace.schema";

const c = initContract();

/**
 * Vendored mirror of the Kick Platform API, restricted to the resources this
 * demo uses. Paths match the upstream API
 * exactly, so the same contract drives both the backend's upstream client
 * (base `https://use-dev.kick.co/api`) and the frontend's client against the
 * BFF (base `/api`).
 *
 * Error responses are declared as the superset {400, 401, 404, 409, 429} on
 * every route so the BFF can pass upstream errors through uniformly. Deleting
 * a Plaid connection and updating a transaction inside a locked bookkeeping
 * period are the two routes that actually answer 409 today.
 */
const errorResponses = {
    400: errorMessageSchema,
    401: errorMessageSchema,
    404: errorMessageSchema,
    409: errorMessageSchema,
    429: errorMessageSchema,
};

const workspacesContract = c.router(
    {
        list: {
            method: "GET",
            path: "",
            query: platformPaginationQuerySchema,
            responses: {
                200: platformWorkspacesListResponseSchema,
                ...errorResponses,
            },
        },
        create: {
            method: "POST",
            path: "",
            body: createPlatformWorkspaceBodySchema,
            responses: {
                201: platformWorkspaceResponseSchema,
                ...errorResponses,
            },
        },
        get: {
            method: "GET",
            path: "/:workspaceId",
            pathParams: platformWorkspacePathParamsSchema,
            responses: {
                200: platformWorkspaceResponseSchema,
                ...errorResponses,
            },
        },
    },
    { pathPrefix: "/platform/v1/workspaces" },
);

const entitiesContract = c.router(
    {
        list: {
            method: "GET",
            path: "",
            query: platformEntitiesListQuerySchema,
            responses: {
                200: platformEntitiesListResponseSchema,
                ...errorResponses,
            },
        },
        create: {
            method: "POST",
            path: "",
            body: createPlatformEntityBodySchema,
            responses: {
                201: platformEntityResponseSchema,
                ...errorResponses,
            },
        },
        get: {
            method: "GET",
            path: "/:entityId",
            pathParams: platformEntityPathParamsSchema,
            responses: {
                200: platformEntityResponseSchema,
                ...errorResponses,
            },
        },
    },
    { pathPrefix: "/platform/v1/entities" },
);

/**
 * The partner runs Plaid Link under its own credentials and passes Kick the
 * resulting processor token, so creation needs no link/public token exchange.
 * Listing is scoped to one workspace and only ever returns the connections the
 * partner created.
 */
const plaidConnectionsContract = c.router(
    {
        list: {
            method: "GET",
            path: "",
            query: platformPlaidConnectionListQuerySchema,
            responses: {
                200: platformPlaidConnectionListResponseSchema,
                ...errorResponses,
            },
        },
        create: {
            method: "POST",
            path: "",
            body: createPlatformPlaidConnectionBodySchema,
            responses: {
                201: platformPlaidConnectionResponseSchema,
                ...errorResponses,
            },
        },
        delete: {
            method: "DELETE",
            path: "/:connectionId",
            pathParams: platformPlaidConnectionPathParamsSchema,
            body: c.noBody(),
            responses: {
                200: c.noBody(),
                ...errorResponses,
            },
        },
    },
    { pathPrefix: "/platform/v1/plaid-connections" },
);

/**
 * Transactions are read across every entity of a workspace, so the routes are
 * nested under the workspace uuid. `update` only touches the fields present in
 * the body, which is how the demo reassigns a transaction's account without
 * disturbing anything else. Retrieving a single transaction is not vendored:
 * the listing already carries the whole row.
 */
const transactionsContract = c.router(
    {
        list: {
            method: "GET",
            path: "",
            pathParams: platformTransactionsPathParamsSchema,
            query: platformTransactionsListQuerySchema,
            responses: {
                200: platformTransactionsListResponseSchema,
                ...errorResponses,
            },
        },
        update: {
            method: "PATCH",
            path: "/:transactionId",
            pathParams: platformTransactionPathParamsSchema,
            body: platformTransactionUpdateBodySchema,
            responses: {
                200: platformTransactionResponseSchema,
                ...errorResponses,
            },
        },
    },
    { pathPrefix: "/platform/v1/workspaces/:workspaceId/transactions" },
);

/**
 * A chart of accounts belongs to a single entity, so the route is nested under
 * the entity uuid. Only listing is vendored: the demo reads the chart to show
 * and pick account names, and never edits it.
 */
const chartOfAccountsContract = c.router(
    {
        list: {
            method: "GET",
            path: "",
            pathParams: platformChartOfAccountsPathParamsSchema,
            query: platformChartOfAccountsListQuerySchema,
            responses: {
                200: platformChartOfAccountsListResponseSchema,
                ...errorResponses,
            },
        },
    },
    { pathPrefix: "/platform/v1/entities/:entityId/chart-of-accounts" },
);

/**
 * Reports are scoped to a single entity and a single date range. `groupBy`
 * splits that range into columns without changing the response shape; the
 * general ledger lists individual postings instead of period aggregates and so
 * is the one report that takes no `groupBy`.
 */
const reportsContract = c.router(
    {
        profitAndLoss: {
            method: "GET",
            path: "/profit-and-loss",
            pathParams: platformReportPathParamsSchema,
            query: platformReportQuerySchema,
            responses: {
                200: platformProfitAndLossResponseSchema,
                ...errorResponses,
            },
        },
        balanceSheet: {
            method: "GET",
            path: "/balance-sheet",
            pathParams: platformReportPathParamsSchema,
            query: platformReportQuerySchema,
            responses: {
                200: platformBalanceSheetResponseSchema,
                ...errorResponses,
            },
        },
        cashFlow: {
            method: "GET",
            path: "/cash-flow",
            pathParams: platformReportPathParamsSchema,
            query: platformReportQuerySchema,
            responses: {
                200: platformCashFlowResponseSchema,
                ...errorResponses,
            },
        },
        trialBalance: {
            method: "GET",
            path: "/trial-balance",
            pathParams: platformReportPathParamsSchema,
            query: platformReportQuerySchema,
            responses: {
                200: platformTrialBalanceResponseSchema,
                ...errorResponses,
            },
        },
        generalLedger: {
            method: "GET",
            path: "/general-ledger",
            pathParams: platformReportPathParamsSchema,
            query: platformGeneralLedgerQuerySchema,
            responses: {
                200: platformGeneralLedgerResponseSchema,
                ...errorResponses,
            },
        },
    },
    { pathPrefix: "/platform/v1/entities/:entityId/reports" },
);

export const platformContract = c.router({
    workspaces: workspacesContract,
    entities: entitiesContract,
    plaidConnections: plaidConnectionsContract,
    transactions: transactionsContract,
    chartOfAccounts: chartOfAccountsContract,
    reports: reportsContract,
});
