import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    WORKSPACE_ASSIGNABLE_PLANS,
    WORKSPACE_PLAN_LABELS,
    type PlatformWorkspace,
} from "@kick-demo/shared";
import { fetchOrganization, updateWorkspace } from "../api/platform";
import { ErrorMessageBox } from "./StatusMessage";

/**
 * Shows the workspace's current plan and lets it be changed to any plan the
 * organization may assign. The change is sent as soon as a plan is picked and
 * takes effect immediately upstream; Kick's message is surfaced when it
 * declines (e.g. the organization does not own the workspace billing).
 */
export function WorkspacePlanControl({
    workspace,
}: {
    workspace: PlatformWorkspace;
}) {
    const queryClient = useQueryClient();

    const organizationQuery = useQuery({
        queryKey: ["organization"],
        queryFn: fetchOrganization,
    });

    const assignablePlans = WORKSPACE_ASSIGNABLE_PLANS.filter((candidate) =>
        (organizationQuery.data?.allowedPlans ?? []).includes(candidate),
    );

    const mutation = useMutation({
        mutationFn: updateWorkspace,
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: ["workspace", workspace.id],
                }),
                queryClient.invalidateQueries({ queryKey: ["workspaces"] }),
            ]);
        },
    });

    const displayedPlan =
        mutation.isPending && mutation.variables !== undefined
            ? mutation.variables.body.plan
            : workspace.plan;

    // A workspace can sit on a plan the organization cannot assign (e.g.
    // Advanced); keep it selectable-but-disabled so the control reads true.
    const hasCurrentPlanOption = assignablePlans.some(
        (candidate) => candidate === displayedPlan,
    );

    return (
        <div>
            <label className="field">
                <span className="field-label">Plan</span>
                <select
                    value={displayedPlan}
                    onChange={(event) => {
                        const selected = assignablePlans.find(
                            (candidate) => candidate === event.target.value,
                        );
                        if (selected && selected !== workspace.plan) {
                            mutation.mutate({
                                workspaceId: workspace.id,
                                body: { plan: selected },
                            });
                        }
                    }}
                    disabled={mutation.isPending || organizationQuery.isPending}
                >
                    {!hasCurrentPlanOption && (
                        <option value={displayedPlan} disabled>
                            {WORKSPACE_PLAN_LABELS[displayedPlan]}
                        </option>
                    )}
                    {assignablePlans.map((candidate) => (
                        <option key={candidate} value={candidate}>
                            {WORKSPACE_PLAN_LABELS[candidate]}
                        </option>
                    ))}
                </select>
            </label>
            {mutation.error !== null && (
                <ErrorMessageBox error={mutation.error} />
            )}
        </div>
    );
}
