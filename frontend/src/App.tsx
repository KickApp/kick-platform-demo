import { Link, Navigate, Route, Routes } from "react-router";
import { WorkspacesPage } from "./pages/WorkspacesPage";
import { WorkspaceEntitiesPage } from "./pages/WorkspaceEntitiesPage";
import { WorkspaceLayout } from "./pages/WorkspaceLayout";
import { WorkspacePlaidConnectionsPage } from "./pages/WorkspacePlaidConnectionsPage";
import { WorkspaceReportsPage } from "./pages/WorkspaceReportsPage";
import { WorkspaceTransactionsPage } from "./pages/WorkspaceTransactionsPage";

export function App() {
    return (
        <div className="app">
            <header className="app-header">
                <Link to="/workspaces" className="app-title">
                    <span className="app-logo">K</span>
                    Kick Platform Demo
                </Link>
                <span className="app-subtitle">
                    Workspaces, entities, Plaid connections, transactions &amp;
                    reports via the Platform API
                </span>
            </header>
            <main className="app-main">
                <Routes>
                    <Route
                        path="/"
                        element={<Navigate to="/workspaces" replace />}
                    />
                    <Route path="/workspaces" element={<WorkspacesPage />} />
                    <Route
                        path="/workspaces/:workspaceId"
                        element={<WorkspaceLayout />}
                    >
                        <Route
                            index
                            element={<Navigate to="entities" replace />}
                        />
                        <Route
                            path="entities"
                            element={<WorkspaceEntitiesPage />}
                        />
                        <Route
                            path="plaid-connections"
                            element={<WorkspacePlaidConnectionsPage />}
                        />
                        <Route
                            path="transactions"
                            element={<WorkspaceTransactionsPage />}
                        />
                        <Route
                            path="reports"
                            element={<WorkspaceReportsPage />}
                        />
                    </Route>
                </Routes>
            </main>
        </div>
    );
}
