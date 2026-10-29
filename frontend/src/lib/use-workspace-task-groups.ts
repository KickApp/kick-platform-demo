import { useQuery } from "@tanstack/react-query";
import { fetchTaskGroups } from "../api/platform";

/**
 * Tasks reference their group by uuid only, so the Tasks tab loads the groups
 * available to the workspace once to display names and fill the group picker.
 * One page of the Platform API's maximum size is plenty for a demo workspace.
 */
const TASK_GROUP_LOOKUP_LIMIT = 100;

export function useWorkspaceTaskGroups(workspaceId: string) {
    const query = useQuery({
        queryKey: ["task-groups", workspaceId, "lookup"],
        queryFn: () =>
            fetchTaskGroups({
                workspaceId,
                limit: TASK_GROUP_LOOKUP_LIMIT,
                offset: 0,
            }),
    });

    const taskGroups = query.data?.data ?? [];
    const namesById = new Map(
        taskGroups.map((taskGroup) => [taskGroup.id, taskGroup.name]),
    );

    return {
        taskGroups,
        isPending: query.isPending,
        error: query.error,
        taskGroupName: (taskGroupId: string) =>
            namesById.get(taskGroupId) ?? null,
    };
}
