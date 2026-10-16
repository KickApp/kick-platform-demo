import { useQuery } from "@tanstack/react-query";
import { fetchAllWorkspaceLocks } from "../api/platform";
import { EntityLockRow } from "../components/EntityLockRow";
import {
    EmptyMessage,
    ErrorMessageBox,
    LoadingMessage,
} from "../components/StatusMessage";
import { useWorkspaceContext } from "../lib/workspace-context";
import { useWorkspaceEntities } from "../lib/use-workspace-entities";

/**
 * The locks listing leaves unlocked entities out, so the table is driven by
 * the workspace's entities and a missing lock reads as unlocked.
 */
export function WorkspaceLocksPage() {
    const { workspaceId } = useWorkspaceContext();
    const entities = useWorkspaceEntities(workspaceId);

    const locksQuery = useQuery({
        queryKey: ["locks", workspaceId],
        queryFn: () => fetchAllWorkspaceLocks(workspaceId),
    });

    const locksByEntityId = new Map(
        (locksQuery.data ?? []).map((lock) => [lock.entityId, lock]),
    );
    const lockedCount = locksQuery.data?.length ?? 0;

    return (
        <section>
            <div className="page-header">
                <div>
                    <h3 className="section-title">Locks</h3>
                    {locksQuery.data && (
                        <p className="page-meta">
                            {lockedCount} of {entities.entities.length} entities
                            locked
                        </p>
                    )}
                </div>
            </div>

            <p className="page-meta">
                Locking an entity through a date blocks changes to its
                transactions and journal entries dated on or before that day.
                Kick sends the <code>entity.lock_date.changed</code> webhook
                whenever the date changes.
            </p>

            {(entities.isPending || locksQuery.isPending) && (
                <LoadingMessage label="locks" />
            )}
            {entities.error !== null && (
                <ErrorMessageBox error={entities.error} />
            )}
            {locksQuery.error !== null && (
                <ErrorMessageBox error={locksQuery.error} />
            )}

            {!entities.isPending &&
                entities.error === null &&
                entities.entities.length === 0 && (
                    <EmptyMessage>
                        No entities in this workspace yet.
                    </EmptyMessage>
                )}

            {locksQuery.data && entities.entities.length > 0 && (
                <div className="card table-card">
                    <table>
                        <thead>
                            <tr>
                                <th>Entity</th>
                                <th>Locked through</th>
                                <th>New lock date</th>
                                <th>ID</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {entities.entities.map((entity) => {
                                const lock = locksByEntityId.get(entity.id);
                                return (
                                    <EntityLockRow
                                        key={`${entity.id}:${lock?.date ?? ""}`}
                                        entity={entity}
                                        lock={lock}
                                    />
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
