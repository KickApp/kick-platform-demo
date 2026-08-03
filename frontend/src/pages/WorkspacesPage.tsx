import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { fetchWorkspaces } from "../api/platform";
import { CreateWorkspaceForm } from "../components/CreateWorkspaceForm";
import { Pagination } from "../components/Pagination";
import {
    EmptyMessage,
    ErrorMessageBox,
    LoadingMessage,
} from "../components/StatusMessage";
import { formatDateTime } from "../lib/format";

const PAGE_SIZE = 25;

export function WorkspacesPage() {
    const [offset, setOffset] = useState(0);
    const [isCreating, setIsCreating] = useState(false);

    const query = useQuery({
        queryKey: ["workspaces", offset],
        queryFn: () => fetchWorkspaces({ limit: PAGE_SIZE, offset }),
    });

    return (
        <section>
            <div className="page-header">
                <div>
                    <h2 className="page-title">Workspaces</h2>
                    {query.data && (
                        <p className="page-meta">
                            {query.data.pagination.total} total
                        </p>
                    )}
                </div>
                {!isCreating && (
                    <button
                        type="button"
                        className="button button-primary"
                        onClick={() => setIsCreating(true)}
                    >
                        New workspace
                    </button>
                )}
            </div>

            {isCreating && (
                <CreateWorkspaceForm onDone={() => setIsCreating(false)} />
            )}

            {query.isPending && <LoadingMessage label="workspaces" />}
            {query.error !== null && <ErrorMessageBox error={query.error} />}

            {query.data && query.data.data.length === 0 && (
                <EmptyMessage>
                    No workspaces yet. Create the first one to get started.
                </EmptyMessage>
            )}

            {query.data && query.data.data.length > 0 && (
                <div className="card table-card">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>GL-first</th>
                                <th>Created</th>
                                <th>ID</th>
                            </tr>
                        </thead>
                        <tbody>
                            {query.data.data.map((workspace) => (
                                <tr key={workspace.id}>
                                    <td>
                                        <Link
                                            className="row-link"
                                            to={`/workspaces/${workspace.id}`}
                                        >
                                            {workspace.name}
                                        </Link>
                                    </td>
                                    <td>
                                        {workspace.glFirstEnabled ? (
                                            <span className="badge badge-on">
                                                enabled
                                            </span>
                                        ) : (
                                            <span className="badge">off</span>
                                        )}
                                    </td>
                                    <td>{formatDateTime(workspace.createdAt)}</td>
                                    <td className="mono">{workspace.id}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {query.data && (
                <Pagination
                    pagination={query.data.pagination}
                    onOffsetChange={setOffset}
                />
            )}
        </section>
    );
}
