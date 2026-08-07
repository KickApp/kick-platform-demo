import { useQuery } from "@tanstack/react-query";
import { Link, NavLink, Outlet, useParams } from "react-router";
import { fetchWorkspace } from "../api/platform";
import {
    EmptyMessage,
    ErrorMessageBox,
    LoadingMessage,
} from "../components/StatusMessage";
import { formatDateTime } from "../lib/format";
import type { WorkspaceOutletContext } from "../lib/workspace-context";

const TABS = [
    { path: "entities", label: "Entities" },
    { path: "plaid-connections", label: "Plaid connections" },
    { path: "transactions", label: "Transactions" },
];

export function WorkspaceLayout() {
    const { workspaceId } = useParams();

    const workspaceQuery = useQuery({
        queryKey: ["workspace", workspaceId],
        queryFn: () => fetchWorkspace(workspaceId ?? ""),
        enabled: workspaceId !== undefined,
    });

    if (workspaceId === undefined) {
        return <EmptyMessage>Workspace not specified.</EmptyMessage>;
    }

    const outletContext: WorkspaceOutletContext = { workspaceId };

    return (
        <section>
            <Link to="/workspaces" className="back-link">
                ← All workspaces
            </Link>

            {workspaceQuery.isPending && <LoadingMessage label="workspace" />}
            {workspaceQuery.error !== null && (
                <ErrorMessageBox error={workspaceQuery.error} />
            )}
            {workspaceQuery.data && (
                <div className="page-header">
                    <div>
                        <h2 className="page-title">
                            {workspaceQuery.data.name}
                        </h2>
                        <p className="page-meta mono">
                            {workspaceQuery.data.id}
                        </p>
                        <p className="page-meta">
                            Created{" "}
                            {formatDateTime(workspaceQuery.data.createdAt)}
                        </p>
                    </div>
                </div>
            )}

            <nav className="tabs">
                {TABS.map((tab) => (
                    <NavLink
                        key={tab.path}
                        to={tab.path}
                        className={({ isActive }) =>
                            isActive ? "tab tab-active" : "tab"
                        }
                    >
                        {tab.label}
                    </NavLink>
                ))}
            </nav>

            <Outlet context={outletContext} />
        </section>
    );
}
