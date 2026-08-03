import { Link, Navigate, Route, Routes } from "react-router";
import { WorkspacesPage } from "./pages/WorkspacesPage";
import { WorkspaceDetailPage } from "./pages/WorkspaceDetailPage";

export function App() {
    return (
        <div className="app">
            <header className="app-header">
                <Link to="/workspaces" className="app-title">
                    <span className="app-logo">K</span>
                    Kick Platform Demo
                </Link>
                <span className="app-subtitle">
                    Workspaces &amp; entities via the Platform API
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
                        element={<WorkspaceDetailPage />}
                    />
                </Routes>
            </main>
        </div>
    );
}
