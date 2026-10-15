import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchFinancialAccounts } from "../api/platform";
import { FinancialAccountRow } from "../components/FinancialAccountRow";
import { Pagination } from "../components/Pagination";
import {
    EmptyMessage,
    ErrorMessageBox,
    LoadingMessage,
} from "../components/StatusMessage";
import { useWorkspaceEntities } from "../lib/use-workspace-entities";
import { useWorkspaceContext } from "../lib/workspace-context";

const PAGE_SIZE = 25;

export function WorkspaceFinancialAccountsPage() {
    const { workspaceId } = useWorkspaceContext();
    const { entities, entityName } = useWorkspaceEntities(workspaceId);
    const [offset, setOffset] = useState(0);
    const [entityFilter, setEntityFilter] = useState("");

    const accountsQuery = useQuery({
        queryKey: ["financialAccounts", workspaceId, entityFilter, offset],
        queryFn: () =>
            fetchFinancialAccounts({
                workspaceId,
                entityIds: entityFilter !== "" ? [entityFilter] : undefined,
                limit: PAGE_SIZE,
                offset,
            }),
    });

    return (
        <section>
            <div className="page-header">
                <div>
                    <h3 className="section-title">Financial accounts</h3>
                    {accountsQuery.data && (
                        <p className="page-meta">
                            {accountsQuery.data.pagination.total} total — every
                            source, integrations, file imports and manual
                            accounts alike
                        </p>
                    )}
                </div>
            </div>

            <div className="filter-bar">
                <label className="field-inline">
                    <span className="field-label">Entity</span>
                    <select
                        value={entityFilter}
                        onChange={(event) => {
                            setEntityFilter(event.target.value);
                            setOffset(0);
                        }}
                    >
                        <option value="">All entities</option>
                        {entities.map((entity) => (
                            <option key={entity.id} value={entity.id}>
                                {entity.name ?? entity.id}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            {accountsQuery.isPending && (
                <LoadingMessage label="financial accounts" />
            )}
            {accountsQuery.error !== null && (
                <ErrorMessageBox error={accountsQuery.error} />
            )}

            {accountsQuery.data && accountsQuery.data.data.length === 0 && (
                <EmptyMessage>
                    No financial accounts
                    {entityFilter !== "" ? " for this entity" : ""} yet. Connect
                    one from the Plaid connections tab.
                </EmptyMessage>
            )}

            {accountsQuery.data && accountsQuery.data.data.length > 0 && (
                <div className="card table-card">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Institution</th>
                                <th>Type</th>
                                <th>Source</th>
                                <th>Entity</th>
                                <th className="amount">Balance</th>
                                <th>Books from</th>
                                <th>Books to</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {accountsQuery.data.data.map((account) => (
                                <FinancialAccountRow
                                    key={account.id}
                                    account={account}
                                    workspaceId={workspaceId}
                                    entities={entities}
                                    entityName={entityName}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {accountsQuery.data && (
                <Pagination
                    pagination={accountsQuery.data.pagination}
                    onOffsetChange={setOffset}
                />
            )}
        </section>
    );
}
