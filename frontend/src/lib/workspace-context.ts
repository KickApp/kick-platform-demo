import { useOutletContext } from "react-router";

/**
 * Handed down by `WorkspaceLayout` to the tab pages nested under
 * `/workspaces/:workspaceId`, so they get the id already narrowed to a string.
 */
export type WorkspaceOutletContext = {
    workspaceId: string;
};

export function useWorkspaceContext(): WorkspaceOutletContext {
    return useOutletContext<WorkspaceOutletContext>();
}
