import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    fetchAllAccountGroups,
    fetchAllChartOfAccounts,
} from "../api/platform";
import { AccountGroupsTable } from "../components/AccountGroupsTable";
import { CreateAccountGroupForm } from "../components/CreateAccountGroupForm";
import {
    EmptyMessage,
    ErrorMessageBox,
    LoadingMessage,
} from "../components/StatusMessage";
import { useWorkspaceEntities } from "../lib/use-workspace-entities";
import { useWorkspaceContext } from "../lib/workspace-context";

/**
 * Account groups organize one entity's chart of accounts, so the tab picks an
 * entity the way the chart and reports tabs do. The chart is read alongside
 * the groups — under the same query key the other tabs use — to show how many
 * accounts each group holds.
 */
export function WorkspaceAccountGroupsPage() {
    const { workspaceId } = useWorkspaceContext();
    const entities = useWorkspaceEntities(workspaceId);
    const [selectedEntityId, setSelectedEntityId] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    const entityId =
        selectedEntityId !== ""
            ? selectedEntityId
            : (entities.entities[0]?.id ?? "");

    const groupsQuery = useQuery({
        queryKey: ["account-groups", entityId],
        queryFn: () => fetchAllAccountGroups(entityId),
        enabled: entityId !== "",
    });

    const accountsQuery = useQuery({
        queryKey: ["chart-of-accounts", entityId],
        queryFn: () => fetchAllChartOfAccounts(entityId),
        enabled: entityId !== "",
    });

    if (entities.isPending) {
        return <LoadingMessage label="entities" />;
    }

    if (entities.error !== null) {
        return <ErrorMessageBox error={entities.error} />;
    }

    if (entities.entities.length === 0) {
        return (
            <EmptyMessage>
                This workspace has no entities yet, and account groups always
                belong to one entity's chart of accounts.
            </EmptyMessage>
        );
    }

    return (
        <section>
            <div className="page-header">
                <div>
                    <h3 className="section-title">Account groups</h3>
                    <p className="page-meta">
                        {groupsQuery.data !== undefined
                            ? `${groupsQuery.data.length} groups — `
                            : ""}
                        groups arrange the chart of accounts into a hierarchy; a
                        group and every account inside it share one type.
                    </p>
                </div>
                {!isCreating && (
                    <div className="row-actions">
                        <button
                            type="button"
                            className="button button-primary"
                            onClick={() => setIsCreating(true)}
                        >
                            New group
                        </button>
                    </div>
                )}
            </div>

            <div className="filter-bar">
                <label className="field-inline">
                    <span className="field-label">Entity</span>
                    <select
                        value={entityId}
                        onChange={(event) => {
                            setSelectedEntityId(event.target.value);
                            setIsCreating(false);
                        }}
                    >
                        {entities.entities.map((entity) => (
                            <option key={entity.id} value={entity.id}>
                                {entity.name ?? entity.id}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            {isCreating && groupsQuery.data !== undefined && (
                <CreateAccountGroupForm
                    entityId={entityId}
                    groups={groupsQuery.data}
                    onDone={() => setIsCreating(false)}
                />
            )}

            {groupsQuery.isPending && <LoadingMessage label="account groups" />}
            {groupsQuery.error !== null && (
                <ErrorMessageBox error={groupsQuery.error} />
            )}

            {groupsQuery.data !== undefined &&
                (groupsQuery.data.length === 0 ? (
                    <EmptyMessage>
                        This entity has no account groups yet.
                    </EmptyMessage>
                ) : (
                    <AccountGroupsTable
                        groups={groupsQuery.data}
                        accounts={accountsQuery.data ?? []}
                        entityId={entityId}
                    />
                ))}
        </section>
    );
}
