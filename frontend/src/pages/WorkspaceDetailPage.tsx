import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { ENTITY_LEGAL_TYPE_LABELS } from "@kick-demo/shared";
import { fetchEntities, fetchWorkspace } from "../api/platform";
import { CreateEntityForm } from "../components/CreateEntityForm";
import { Pagination } from "../components/Pagination";
import {
    EmptyMessage,
    ErrorMessageBox,
    LoadingMessage,
} from "../components/StatusMessage";
import { formatDateTime } from "../lib/format";

const PAGE_SIZE = 25;

export function WorkspaceDetailPage() {
    const { workspaceId } = useParams();
    const [offset, setOffset] = useState(0);
    const [isCreating, setIsCreating] = useState(false);

    const workspaceQuery = useQuery({
        queryKey: ["workspace", workspaceId],
        queryFn: () => fetchWorkspace(workspaceId ?? ""),
        enabled: workspaceId !== undefined,
    });

    const entitiesQuery = useQuery({
        queryKey: ["entities", workspaceId, offset],
        queryFn: () =>
            fetchEntities({
                workspaceId: workspaceId ?? "",
                limit: PAGE_SIZE,
                offset,
            }),
        enabled: workspaceId !== undefined,
    });

    if (workspaceId === undefined) {
        return <EmptyMessage>Workspace not specified.</EmptyMessage>;
    }

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
                            {workspaceQuery.data.glFirstEnabled &&
                                " · GL-first enabled"}
                        </p>
                    </div>
                    {!isCreating && (
                        <button
                            type="button"
                            className="button button-primary"
                            onClick={() => setIsCreating(true)}
                        >
                            New entity
                        </button>
                    )}
                </div>
            )}

            {isCreating && (
                <CreateEntityForm
                    workspaceId={workspaceId}
                    onDone={() => setIsCreating(false)}
                />
            )}

            <h3 className="section-title">Entities</h3>
            {entitiesQuery.isPending && <LoadingMessage label="entities" />}
            {entitiesQuery.error !== null && (
                <ErrorMessageBox error={entitiesQuery.error} />
            )}

            {entitiesQuery.data && entitiesQuery.data.data.length === 0 && (
                <EmptyMessage>No entities in this workspace yet.</EmptyMessage>
            )}

            {entitiesQuery.data && entitiesQuery.data.data.length > 0 && (
                <div className="card table-card">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Legal type</th>
                                <th>Bookkeeping start</th>
                                <th>Created</th>
                                <th>ID</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entitiesQuery.data.data.map((entity) => (
                                <tr key={entity.id}>
                                    <td>{entity.name ?? "—"}</td>
                                    <td>
                                        {entity.legalType !== null
                                            ? ENTITY_LEGAL_TYPE_LABELS[
                                                  entity.legalType
                                              ]
                                            : "—"}
                                    </td>
                                    <td>{entity.bookkeepingStartDate}</td>
                                    <td>{formatDateTime(entity.createdAt)}</td>
                                    <td className="mono">{entity.id}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {entitiesQuery.data && (
                <Pagination
                    pagination={entitiesQuery.data.pagination}
                    onOffsetChange={setOffset}
                />
            )}
        </section>
    );
}
