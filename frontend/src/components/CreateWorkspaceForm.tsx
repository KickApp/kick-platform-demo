import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    WORKSPACE_ASSIGNABLE_PLANS,
    WORKSPACE_PLAN_LABELS,
    type WorkspaceAssignablePlan,
} from "@kick-demo/shared";
import { createWorkspace, fetchOrganization } from "../api/platform";
import { ErrorMessageBox } from "./StatusMessage";

export function CreateWorkspaceForm({ onDone }: { onDone: () => void }) {
    const queryClient = useQueryClient();
    const [name, setName] = useState("");
    const [plan, setPlan] = useState<WorkspaceAssignablePlan | null>(null);

    const organizationQuery = useQuery({
        queryKey: ["organization"],
        queryFn: fetchOrganization,
    });

    // Only the plans the organization may assign are offered, in the
    // canonical order. Kick would answer 400 for anything else anyway.
    const assignablePlans = WORKSPACE_ASSIGNABLE_PLANS.filter((candidate) =>
        (organizationQuery.data?.allowedPlans ?? []).includes(candidate),
    );
    const selectedPlan = plan ?? assignablePlans[0] ?? null;

    const mutation = useMutation({
        mutationFn: createWorkspace,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
            onDone();
        },
    });

    return (
        <form
            className="card form-card"
            onSubmit={(event) => {
                event.preventDefault();
                if (selectedPlan === null) {
                    return;
                }
                mutation.mutate({ name: name.trim(), plan: selectedPlan });
            }}
        >
            <h3 className="form-title">New workspace</h3>
            <label className="field">
                <span className="field-label">Name</span>
                <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Acme Inc."
                    maxLength={200}
                    required
                    autoFocus
                />
            </label>
            <label className="field">
                <span className="field-label">Plan</span>
                <select
                    value={selectedPlan ?? ""}
                    onChange={(event) => {
                        const selected = assignablePlans.find(
                            (candidate) => candidate === event.target.value,
                        );
                        if (selected) {
                            setPlan(selected);
                        }
                    }}
                    disabled={organizationQuery.isPending}
                    required
                >
                    {assignablePlans.map((candidate) => (
                        <option key={candidate} value={candidate}>
                            {WORKSPACE_PLAN_LABELS[candidate]}
                        </option>
                    ))}
                </select>
                <span className="field-hint">
                    Plans your organization may assign. Billed to the
                    organization.
                </span>
            </label>
            {organizationQuery.error !== null && (
                <ErrorMessageBox error={organizationQuery.error} />
            )}
            {mutation.error !== null && (
                <ErrorMessageBox error={mutation.error} />
            )}
            <div className="form-actions">
                <button
                    type="button"
                    className="button button-secondary"
                    onClick={onDone}
                    disabled={mutation.isPending}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="button button-primary"
                    disabled={
                        mutation.isPending ||
                        name.trim() === "" ||
                        selectedPlan === null
                    }
                >
                    {mutation.isPending ? "Creating…" : "Create workspace"}
                </button>
            </div>
        </form>
    );
}
