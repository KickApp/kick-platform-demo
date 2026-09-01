import { useQueries } from "@tanstack/react-query";
import { ACCOUNT_CLASSES, type PlatformAccount } from "@kick-demo/shared";
import { fetchAllChartOfAccounts } from "../api/platform";

/**
 * Transactions reference their account by uuid, and a chart of accounts belongs
 * to one entity, so a workspace-wide listing needs the chart of every entity it
 * touches. One query per entity keeps each chart cached on its own and lets a
 * page load only the ones it actually shows.
 */
export function useEntityAccounts(entityIds: string[]) {
    const uniqueEntityIds = [...new Set(entityIds)].sort();

    const queries = useQueries({
        queries: uniqueEntityIds.map((entityId) => ({
            queryKey: ["chart-of-accounts", entityId],
            queryFn: () => fetchAllChartOfAccounts(entityId),
        })),
    });

    const accountsByEntityId = new Map<string, PlatformAccount[]>();
    uniqueEntityIds.forEach((entityId, index) => {
        const accounts = queries[index]?.data;
        if (accounts !== undefined) {
            accountsByEntityId.set(entityId, accounts);
        }
    });

    return {
        isPending: queries.some((query) => query.isPending),
        error: queries.find((query) => query.error !== null)?.error ?? null,
        accountsFor: (entityId: string) =>
            accountsByEntityId.get(entityId) ?? [],
    };
}

/** Accounts read as `1200 — Accounts Receivable`, or just the name when uncoded. */
export function formatAccountLabel(account: PlatformAccount): string {
    return account.code !== null
        ? `${account.code} — ${account.name}`
        : account.name;
}

/**
 * A chart of accounts is long, so both the account picker and the management
 * table group it by class, in the balance-sheet-then-income-statement order
 * the classes are declared in.
 */
export function groupAccountsByClass(accounts: PlatformAccount[]) {
    return ACCOUNT_CLASSES.map((accountClass) => ({
        accountClass,
        accounts: accounts.filter((account) => account.class === accountClass),
    })).filter((group) => group.accounts.length > 0);
}
