import { initClient } from "@ts-rest/core";
import {
    PLATFORM_PAGE_LIMIT_MAX,
    platformContract,
    type CreatePlatformEntityBody,
    type CreatePlatformWorkspaceBody,
    type PlatformAccount,
    type PlatformBulkCreateAccountsBody,
    type PlatformCreateAccountBody,
    type PlatformMergeAccountsBody,
    type PlatformTransactionUpdateBody,
    type PlatformUpdateAccountBody,
    type ReportGroupBy,
} from "@kick-demo/shared";
import { ApiError, toApiError } from "./errors";

/**
 * Client against the demo BFF, which mirrors the Kick Platform API contract
 * under `/api` (proxied to the backend by the Vite dev server).
 */
const api = initClient(platformContract, { baseUrl: "/api" });

export async function fetchWorkspaces(query: {
    limit: number;
    offset: number;
}) {
    const result = await api.workspaces.list({ query });
    if (result.status === 200) {
        return result.body;
    }
    throw toApiError(result);
}

export async function fetchWorkspace(workspaceId: string) {
    const result = await api.workspaces.get({ params: { workspaceId } });
    if (result.status === 200) {
        return result.body.workspace;
    }
    throw toApiError(result);
}

export async function createWorkspace(body: CreatePlatformWorkspaceBody) {
    const result = await api.workspaces.create({ body });
    if (result.status === 201) {
        return result.body.workspace;
    }
    throw toApiError(result);
}

export async function fetchEntities(query: {
    workspaceId: string;
    limit: number;
    offset: number;
}) {
    const result = await api.entities.list({ query });
    if (result.status === 200) {
        return result.body;
    }
    throw toApiError(result);
}

export async function createEntity(body: CreatePlatformEntityBody) {
    const result = await api.entities.create({ body });
    if (result.status === 201) {
        return result.body.entity;
    }
    throw toApiError(result);
}

export async function fetchPlaidConnections(query: {
    workspaceId: string;
    entityIds?: string[];
    limit: number;
    offset: number;
}) {
    const result = await api.plaidConnections.list({ query });
    if (result.status === 200) {
        return result.body;
    }
    throw toApiError(result);
}

export async function deletePlaidConnection(connectionId: string) {
    const result = await api.plaidConnections.delete({
        params: { connectionId },
    });
    if (result.status === 200) {
        return;
    }
    throw toApiError(result);
}

export async function fetchTransactions(query: {
    workspaceId: string;
    startDate?: string;
    endDate?: string;
    limit: number;
    offset: number;
}) {
    const { workspaceId, ...rest } = query;
    const result = await api.transactions.list({
        params: { workspaceId },
        query: rest,
    });
    if (result.status === 200) {
        return result.body;
    }
    throw toApiError(result);
}

/**
 * The API only touches the fields present in the body, so passing a single key
 * leaves the rest of the transaction alone.
 */
export async function updateTransaction({
    workspaceId,
    transactionId,
    body,
}: {
    workspaceId: string;
    transactionId: string;
    body: PlatformTransactionUpdateBody;
}) {
    const result = await api.transactions.update({
        params: { workspaceId, transactionId },
        body,
    });
    if (result.status === 200) {
        return result.body.transaction;
    }
    throw toApiError(result);
}

export async function fetchChartOfAccounts(query: {
    entityId: string;
    limit: number;
    offset: number;
}) {
    const { entityId, ...rest } = query;
    const result = await api.chartOfAccounts.list({
        params: { entityId },
        query: rest,
    });
    if (result.status === 200) {
        return result.body;
    }
    throw toApiError(result);
}

/**
 * Resolving the account a transaction points at needs the whole chart, and the
 * API caps a page at 100 accounts, so walk the offsets until the reported total
 * is covered.
 */
export async function fetchAllChartOfAccounts(
    entityId: string,
): Promise<PlatformAccount[]> {
    const accounts: PlatformAccount[] = [];
    let offset = 0;
    let total = 0;
    do {
        const page = await fetchChartOfAccounts({
            entityId,
            limit: PLATFORM_PAGE_LIMIT_MAX,
            offset,
        });
        accounts.push(...page.data);
        total = page.pagination.total;
        offset += PLATFORM_PAGE_LIMIT_MAX;
    } while (accounts.length < total);
    return accounts;
}

export async function createAccount({
    entityId,
    body,
}: {
    entityId: string;
    body: PlatformCreateAccountBody;
}) {
    const result = await api.chartOfAccounts.create({
        params: { entityId },
        body,
    });
    if (result.status === 201) {
        return result.body.account;
    }
    throw toApiError(result);
}

/** Atomic upstream: a batch that fails validation creates nothing. */
export async function bulkCreateAccounts({
    entityId,
    body,
}: {
    entityId: string;
    body: PlatformBulkCreateAccountsBody;
}) {
    const result = await api.chartOfAccounts.bulkCreate({
        params: { entityId },
        body,
    });
    if (result.status === 201) {
        return result.body.data;
    }
    throw toApiError(result);
}

/** Renaming is the only update: type, class and code are fixed on creation. */
export async function updateAccount({
    entityId,
    accountId,
    body,
}: {
    entityId: string;
    accountId: string;
    body: PlatformUpdateAccountBody;
}) {
    const result = await api.chartOfAccounts.update({
        params: { entityId, accountId },
        body,
    });
    if (result.status === 200) {
        return result.body.account;
    }
    throw toApiError(result);
}

export async function disableAccount({
    entityId,
    accountId,
}: {
    entityId: string;
    accountId: string;
}) {
    const result = await api.chartOfAccounts.disable({
        params: { entityId, accountId },
    });
    if (result.status === 200) {
        return result.body.account;
    }
    throw toApiError(result);
}

export async function enableAccount({
    entityId,
    accountId,
}: {
    entityId: string;
    accountId: string;
}) {
    const result = await api.chartOfAccounts.enable({
        params: { entityId, accountId },
    });
    if (result.status === 200) {
        return result.body.account;
    }
    throw toApiError(result);
}

/** Answers 409 once the account has journal entries; archive it instead. */
export async function deleteAccount({
    entityId,
    accountId,
}: {
    entityId: string;
    accountId: string;
}) {
    const result = await api.chartOfAccounts.delete({
        params: { entityId, accountId },
    });
    if (result.status === 200) {
        return;
    }
    throw toApiError(result);
}

/**
 * Merges the source account into the target and deletes the source. A merge
 * blocked by the accounts' state answers 409 with structured blockers, which
 * are folded into the error message so the form can show why Kick declined.
 */
export async function mergeAccounts({
    entityId,
    body,
}: {
    entityId: string;
    body: PlatformMergeAccountsBody;
}) {
    const result = await api.chartOfAccounts.merge({
        params: { entityId },
        body,
    });
    if (result.status === 200) {
        return result.body.account;
    }
    if (result.status === 409) {
        const reasons = result.body.blockers
            .map((blocker) => blocker.message)
            .join("; ");
        throw new ApiError(
            result.status,
            reasons !== "" ? reasons : result.body.message,
        );
    }
    throw toApiError(result);
}

/**
 * The demo keeps books on the cash basis only, so every report goes out on that
 * basis even though the Platform API also serves accruals.
 */
export type ReportQuery = {
    entityId: string;
    startDate: string;
    endDate: string;
    groupBy: ReportGroupBy;
};

const CASH_BASIS = "cash" as const;

function toReportRequest({ entityId, ...query }: ReportQuery) {
    return {
        params: { entityId },
        query: { ...query, ledgerBasis: CASH_BASIS },
    };
}

export async function fetchProfitAndLossReport(query: ReportQuery) {
    const result = await api.reports.profitAndLoss(toReportRequest(query));
    if (result.status === 200) {
        return result.body.report;
    }
    throw toApiError(result);
}

export async function fetchBalanceSheetReport(query: ReportQuery) {
    const result = await api.reports.balanceSheet(toReportRequest(query));
    if (result.status === 200) {
        return result.body.report;
    }
    throw toApiError(result);
}

export async function fetchCashFlowReport(query: ReportQuery) {
    const result = await api.reports.cashFlow(toReportRequest(query));
    if (result.status === 200) {
        return result.body.report;
    }
    throw toApiError(result);
}

export async function fetchTrialBalanceReport(query: ReportQuery) {
    const result = await api.reports.trialBalance(toReportRequest(query));
    if (result.status === 200) {
        return result.body.report;
    }
    throw toApiError(result);
}

export async function fetchGeneralLedgerReport({
    entityId,
    startDate,
    endDate,
}: Omit<ReportQuery, "groupBy">) {
    const result = await api.reports.generalLedger({
        params: { entityId },
        query: { startDate, endDate, ledgerBasis: CASH_BASIS },
    });
    if (result.status === 200) {
        return result.body.report;
    }
    throw toApiError(result);
}
