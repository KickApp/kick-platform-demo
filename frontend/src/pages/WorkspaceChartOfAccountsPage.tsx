import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAllChartOfAccounts } from "../api/platform";
import { BulkCreateAccountsForm } from "../components/BulkCreateAccountsForm";
import { ChartOfAccountsTable } from "../components/ChartOfAccountsTable";
import { CreateAccountForm } from "../components/CreateAccountForm";
import {
    EmptyMessage,
    ErrorMessageBox,
    LoadingMessage,
} from "../components/StatusMessage";
import { useWorkspaceEntities } from "../lib/use-workspace-entities";
import { useWorkspaceContext } from "../lib/workspace-context";

type OpenForm = "none" | "single" | "bulk";

/**
 * A chart of accounts belongs to one entity, so the tab picks one the way the
 * reports tab does rather than covering the whole workspace. The listing is
 * read under the same query key the transactions tab uses, so writing here
 * refreshes that tab's account picker too.
 */
export function WorkspaceChartOfAccountsPage() {
    const { workspaceId } = useWorkspaceContext();
    const entities = useWorkspaceEntities(workspaceId);
    const [selectedEntityId, setSelectedEntityId] = useState("");
    const [openForm, setOpenForm] = useState<OpenForm>("none");

    const entityId =
        selectedEntityId !== ""
            ? selectedEntityId
            : (entities.entities[0]?.id ?? "");

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
                This workspace has no entities yet, and a chart of accounts
                always belongs to one.
            </EmptyMessage>
        );
    }

    return (
        <section>
            <div className="page-header">
                <div>
                    <h3 className="section-title">Chart of accounts</h3>
                    <p className="page-meta">
                        {accountsQuery.data !== undefined
                            ? `${accountsQuery.data.length} accounts — `
                            : ""}
                        an account's type and code are fixed once it exists, so
                        only its name can be changed.
                    </p>
                </div>
                {openForm === "none" && (
                    <div className="row-actions">
                        <button
                            type="button"
                            className="button button-secondary"
                            onClick={() => setOpenForm("bulk")}
                        >
                            Add multiple
                        </button>
                        <button
                            type="button"
                            className="button button-primary"
                            onClick={() => setOpenForm("single")}
                        >
                            New account
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
                            setOpenForm("none");
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

            {openForm === "single" && (
                <CreateAccountForm
                    entityId={entityId}
                    onDone={() => setOpenForm("none")}
                />
            )}
            {openForm === "bulk" && (
                <BulkCreateAccountsForm
                    entityId={entityId}
                    onDone={() => setOpenForm("none")}
                />
            )}

            {accountsQuery.isPending && <LoadingMessage label="accounts" />}
            {accountsQuery.error !== null && (
                <ErrorMessageBox error={accountsQuery.error} />
            )}

            {accountsQuery.data !== undefined &&
                (accountsQuery.data.length === 0 ? (
                    <EmptyMessage>
                        This entity has no accounts yet.
                    </EmptyMessage>
                ) : (
                    <ChartOfAccountsTable
                        accounts={accountsQuery.data}
                        entityId={entityId}
                    />
                ))}
        </section>
    );
}
