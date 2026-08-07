import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ENTITY_LEGAL_TYPE_LABELS } from "@kick-demo/shared";
import { fetchEntities } from "../api/platform";
import { CreateEntityForm } from "../components/CreateEntityForm";
import { Pagination } from "../components/Pagination";
import {
    EmptyMessage,
    ErrorMessageBox,
    LoadingMessage,
} from "../components/StatusMessage";
import { formatDateTime } from "../lib/format";
import { useWorkspaceContext } from "../lib/workspace-context";

const PAGE_SIZE = 25;

export function WorkspaceEntitiesPage() {
    const { workspaceId } = useWorkspaceContext();
    const [offset, setOffset] = useState(0);
    const [isCreating, setIsCreating] = useState(false);

    const entitiesQuery = useQuery({
        queryKey: ["entities", workspaceId, offset],
        queryFn: () => fetchEntities({ workspaceId, limit: PAGE_SIZE, offset }),
    });

    return (
        <section>
            <div className="page-header">
                <div>
                    <h3 className="section-title">Entities</h3>
                    {entitiesQuery.data && (
                        <p className="page-meta">
                            {entitiesQuery.data.pagination.total} total
                        </p>
                    )}
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

            {isCreating && (
                <CreateEntityForm
                    workspaceId={workspaceId}
                    onDone={() => setIsCreating(false)}
                />
            )}

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
