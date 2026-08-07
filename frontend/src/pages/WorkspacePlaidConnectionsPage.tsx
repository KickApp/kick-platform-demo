import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FINANCIAL_ACCOUNT_TYPE_LABELS } from "@kick-demo/shared";
import { deletePlaidConnection, fetchPlaidConnections } from "../api/platform";
import { CreatePlaidConnectionForm } from "../components/CreatePlaidConnectionForm";
import { Pagination } from "../components/Pagination";
import {
    EmptyMessage,
    ErrorMessageBox,
    LoadingMessage,
} from "../components/StatusMessage";
import { formatDateTime } from "../lib/format";
import { useWorkspaceEntities } from "../lib/use-workspace-entities";
import { useWorkspaceContext } from "../lib/workspace-context";

const PAGE_SIZE = 25;

export function WorkspacePlaidConnectionsPage() {
    const { workspaceId } = useWorkspaceContext();
    const queryClient = useQueryClient();
    const { entities, entityName } = useWorkspaceEntities(workspaceId);
    const [offset, setOffset] = useState(0);
    const [entityFilter, setEntityFilter] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    const connectionsQuery = useQuery({
        queryKey: ["plaidConnections", workspaceId, entityFilter, offset],
        queryFn: () =>
            fetchPlaidConnections({
                workspaceId,
                entityIds: entityFilter !== "" ? [entityFilter] : undefined,
                limit: PAGE_SIZE,
                offset,
            }),
    });

    const deleteMutation = useMutation({
        mutationFn: deletePlaidConnection,
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ["plaidConnections", workspaceId],
            });
        },
    });

    return (
        <section>
            <div className="page-header">
                <div>
                    <h3 className="section-title">Plaid connections</h3>
                    {connectionsQuery.data && (
                        <p className="page-meta">
                            {connectionsQuery.data.pagination.total} total —
                            only connections created through the Platform API
                            are listed
                        </p>
                    )}
                </div>
                {!isCreating && (
                    <button
                        type="button"
                        className="button button-primary"
                        onClick={() => setIsCreating(true)}
                    >
                        New connection
                    </button>
                )}
            </div>

            {isCreating && (
                <CreatePlaidConnectionForm
                    workspaceId={workspaceId}
                    onDone={() => setIsCreating(false)}
                />
            )}

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

            {connectionsQuery.isPending && (
                <LoadingMessage label="Plaid connections" />
            )}
            {connectionsQuery.error !== null && (
                <ErrorMessageBox error={connectionsQuery.error} />
            )}
            {deleteMutation.error !== null && (
                <ErrorMessageBox error={deleteMutation.error} />
            )}

            {connectionsQuery.data &&
                connectionsQuery.data.data.length === 0 && (
                    <EmptyMessage>
                        No Plaid connections yet. Create one from a processor
                        token issued by your own Plaid Link flow.
                    </EmptyMessage>
                )}

            {connectionsQuery.data?.data.map(({ connection, accounts }) => (
                <div className="card connection-card" key={connection.id}>
                    <div className="connection-header">
                        <div>
                            <h4 className="connection-title">
                                {connection.institutionName}
                            </h4>
                            <p className="page-meta">
                                Connected {formatDateTime(connection.createdAt)}{" "}
                                · Institution{" "}
                                {connection.institutionId ?? "unknown"}
                            </p>
                            <p className="page-meta mono">{connection.id}</p>
                        </div>
                        <button
                            type="button"
                            className="button button-danger"
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                                const confirmed = window.confirm(
                                    `Delete the ${connection.institutionName} connection? Its accounts and their transactions are deleted too.`,
                                );
                                if (confirmed) {
                                    deleteMutation.mutate(connection.id);
                                }
                            }}
                        >
                            {deleteMutation.isPending &&
                            deleteMutation.variables === connection.id
                                ? "Deleting…"
                                : "Delete"}
                        </button>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Account</th>
                                <th>Mask</th>
                                <th>Type</th>
                                <th>Entity</th>
                                <th>ID</th>
                            </tr>
                        </thead>
                        <tbody>
                            {accounts.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="page-meta">
                                        No accounts on this connection.
                                    </td>
                                </tr>
                            )}
                            {accounts.map((account) => (
                                <tr key={account.id}>
                                    <td>{account.name ?? "—"}</td>
                                    <td>
                                        {account.accountNumberMask !== null
                                            ? `••••${account.accountNumberMask}`
                                            : "—"}
                                    </td>
                                    <td>
                                        {
                                            FINANCIAL_ACCOUNT_TYPE_LABELS[
                                                account.type
                                            ]
                                        }
                                    </td>
                                    <td>
                                        {entityName(account.entityId) ?? (
                                            <span className="mono">
                                                {account.entityId}
                                            </span>
                                        )}
                                    </td>
                                    <td className="mono">{account.id}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}

            {connectionsQuery.data && (
                <Pagination
                    pagination={connectionsQuery.data.pagination}
                    onOffsetChange={setOffset}
                />
            )}
        </section>
    );
}
