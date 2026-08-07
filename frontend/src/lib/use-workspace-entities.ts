import { useQuery } from "@tanstack/react-query";
import { fetchEntities } from "../api/platform";

/**
 * Plaid accounts and transactions reference their entity by uuid only, so the
 * pages showing them load the workspace's entities once to display names and
 * fill entity pickers. One page of the Platform API's maximum size is plenty
 * for a demo workspace.
 */
const ENTITY_LOOKUP_LIMIT = 100;

export function useWorkspaceEntities(workspaceId: string) {
    const query = useQuery({
        queryKey: ["entities", workspaceId, "lookup"],
        queryFn: () =>
            fetchEntities({
                workspaceId,
                limit: ENTITY_LOOKUP_LIMIT,
                offset: 0,
            }),
    });

    const entities = query.data?.data ?? [];
    const namesById = new Map(
        entities.map((entity) => [entity.id, entity.name]),
    );

    return {
        entities,
        isPending: query.isPending,
        error: query.error,
        entityName: (entityId: string) => namesById.get(entityId) ?? null,
    };
}
