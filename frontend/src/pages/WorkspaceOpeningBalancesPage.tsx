import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    fetchAllChartOfAccounts,
    fetchAllOpeningBalances,
} from "../api/platform";
import { BulkSetOpeningBalancesForm } from "../components/BulkSetOpeningBalancesForm";
import { OpeningBalancesTable } from "../components/OpeningBalancesTable";
import {
    EmptyMessage,
    ErrorMessageBox,
    LoadingMessage,
} from "../components/StatusMessage";
import { formatDate } from "../lib/format";
import { useWorkspaceEntities } from "../lib/use-workspace-entities";
import { useWorkspaceContext } from "../lib/workspace-context";

/**
 * Opening balances belong to the accounts of one entity's chart, so the tab
 * picks an entity the way the chart of accounts tab does and reads the chart
 * under the same query key, joining each account's opening balance state onto
 * it.
 */
export function WorkspaceOpeningBalancesPage() {
    const { workspaceId } = useWorkspaceContext();
    const entities = useWorkspaceEntities(workspaceId);
    const [selectedEntityId, setSelectedEntityId] = useState("");
    const [isBulkFormOpen, setIsBulkFormOpen] = useState(false);
    const [showAccountsWithoutBalance, setShowAccountsWithoutBalance] =
        useState(false);

    const entityId =
        selectedEntityId !== ""
            ? selectedEntityId
            : (entities.entities[0]?.id ?? "");
    const entity = entities.entities.find((each) => each.id === entityId);

    const accountsQuery = useQuery({
        queryKey: ["chart-of-accounts", entityId],
        queryFn: () => fetchAllChartOfAccounts(entityId),
        enabled: entityId !== "",
    });

    const openingBalancesQuery = useQuery({
        queryKey: ["opening-balances", entityId],
        queryFn: () => fetchAllOpeningBalances(entityId),
        enabled: entityId !== "",
    });

    if (entities.isPending) {
        return <LoadingMessage label="entities" />;
    }

    if (entities.error !== null) {
        return <ErrorMessageBox error={entities.error} />;
    }

    if (entities.entities.length === 0 || entity === undefined) {
        return (
            <EmptyMessage>
                This workspace has no entities yet, and opening balances always
                belong to the chart of accounts of one.
            </EmptyMessage>
        );
    }

    const isLoaded =
        accountsQuery.data !== undefined &&
        openingBalancesQuery.data !== undefined;
    const balanceCount = openingBalancesQuery.data?.length ?? 0;

    return (
        <section>
            <div className="page-header">
                <div>
                    <h3 className="section-title">Opening balances</h3>
                    <p className="page-meta">
                        {openingBalancesQuery.data !== undefined
                            ? `${balanceCount} ${balanceCount === 1 ? "account has" : "accounts have"} an opening balance — `
                            : ""}
                        each account can carry a main opening balance booked
                        before the bookkeeping start date (
                        {formatDate(`${entity.bookkeepingStartDate}T00:00:00Z`)}
                        ) and an adjustment booked on it. An entity with opening
                        balances cannot start an accounting migration.
                    </p>
                </div>
                {!isBulkFormOpen && isLoaded && (
                    <button
                        type="button"
                        className="button button-primary"
                        onClick={() => setIsBulkFormOpen(true)}
                    >
                        Set in bulk
                    </button>
                )}
            </div>

            <div className="filter-bar">
                <label className="field-inline">
                    <span className="field-label">Entity</span>
                    <select
                        value={entityId}
                        onChange={(event) => {
                            setSelectedEntityId(event.target.value);
                            setIsBulkFormOpen(false);
                        }}
                    >
                        {entities.entities.map((each) => (
                            <option key={each.id} value={each.id}>
                                {each.name ?? each.id}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="field-checkbox">
                    <input
                        type="checkbox"
                        checked={showAccountsWithoutBalance}
                        onChange={(event) =>
                            setShowAccountsWithoutBalance(event.target.checked)
                        }
                    />
                    Show accounts without an opening balance
                </label>
            </div>

            {isBulkFormOpen && accountsQuery.data !== undefined && (
                <BulkSetOpeningBalancesForm
                    entityId={entityId}
                    accounts={accountsQuery.data}
                    onDone={() => setIsBulkFormOpen(false)}
                />
            )}

            {(accountsQuery.isPending || openingBalancesQuery.isPending) && (
                <LoadingMessage label="opening balances" />
            )}
            {accountsQuery.error !== null && (
                <ErrorMessageBox error={accountsQuery.error} />
            )}
            {openingBalancesQuery.error !== null && (
                <ErrorMessageBox error={openingBalancesQuery.error} />
            )}

            {accountsQuery.data !== undefined &&
                openingBalancesQuery.data !== undefined &&
                (balanceCount === 0 && !showAccountsWithoutBalance ? (
                    <EmptyMessage>
                        No account of this entity has an opening balance yet.
                        Set several at once in bulk, or show the accounts
                        without one to set them individually.
                    </EmptyMessage>
                ) : (
                    <OpeningBalancesTable
                        accounts={accountsQuery.data}
                        openingBalances={openingBalancesQuery.data}
                        showAccountsWithoutBalance={showAccountsWithoutBalance}
                        entityId={entityId}
                        bookkeepingStartDate={entity.bookkeepingStartDate}
                    />
                ))}
        </section>
    );
}
