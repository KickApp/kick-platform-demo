import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import type { PlatformCounterparty } from "@kick-demo/shared";
import { mergeCounterparties } from "../api/platform";
import { CounterpartyConflictError } from "../api/errors";
import { CounterpartyPicker } from "./CounterpartyPicker";
import { ErrorMessageBox } from "./StatusMessage";

/**
 * Merges the counterparty on the page into another one: its transactions,
 * bills, invoices, rules and aliases move over, then it is removed from the
 * workspace. When it is used in a locked period Kick answers 409
 * `locked_transactions_found`, and the form offers to merge everything else
 * and disable it instead.
 */
export function MergeCounterpartyForm({
    workspaceId,
    counterparty,
    onDone,
}: {
    workspaceId: string;
    counterparty: PlatformCounterparty;
    onDone: () => void;
}) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [counterpartyToKeep, setCounterpartyToKeep] =
        useState<PlatformCounterparty | null>(null);

    const mutation = useMutation({
        mutationFn: ({
            keep,
            disableCounterpartyToMerge,
        }: {
            keep: PlatformCounterparty;
            disableCounterpartyToMerge: boolean;
        }) =>
            mergeCounterparties({
                workspaceId,
                body: {
                    counterpartyToMergeId: counterparty.id,
                    counterpartyToKeepId: keep.id,
                    ...(disableCounterpartyToMerge && {
                        disableCounterpartyToMerge,
                    }),
                },
            }),
        onSuccess: async (_, { keep }) => {
            queryClient.removeQueries({
                queryKey: ["counterparty", workspaceId, counterparty.id],
            });
            await queryClient.invalidateQueries({
                queryKey: ["counterparties", workspaceId],
            });
            await queryClient.invalidateQueries({
                queryKey: ["counterparty", workspaceId, keep.id],
            });
            await navigate(`../${keep.id}`, { relative: "path" });
        },
    });

    const isLockedConflict =
        mutation.error instanceof CounterpartyConflictError &&
        mutation.error.reason === "locked_transactions_found" &&
        mutation.variables?.disableCounterpartyToMerge === false;

    const submit = (disableCounterpartyToMerge: boolean) => {
        if (counterpartyToKeep === null) {
            return;
        }
        const message = disableCounterpartyToMerge
            ? `Merge everything that can move from "${counterparty.name}" into "${counterpartyToKeep.name}" and disable "${counterparty.name}" instead of removing it?`
            : `Merge "${counterparty.name}" into "${counterpartyToKeep.name}"? Its transactions, bills, invoices, rules and aliases move over, then "${counterparty.name}" is removed from the workspace.`;
        if (window.confirm(message)) {
            mutation.mutate({
                keep: counterpartyToKeep,
                disableCounterpartyToMerge,
            });
        }
    };

    return (
        <form
            className="card form-card"
            onSubmit={(event) => {
                event.preventDefault();
                submit(false);
            }}
        >
            <h3 className="form-title">Merge into another counterparty</h3>
            <div className="field">
                <span className="field-label">Counterparty to keep</span>
                <CounterpartyPicker
                    workspaceId={workspaceId}
                    excludeId={counterparty.id}
                    selected={counterpartyToKeep}
                    onSelect={(selected) => {
                        mutation.reset();
                        setCounterpartyToKeep(selected);
                    }}
                />
                <span className="field-hint">
                    &ldquo;{counterparty.name}&rdquo; is merged away; the
                    counterparty picked here remains.
                </span>
            </div>
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
                {isLockedConflict ? (
                    <button
                        type="button"
                        className="button button-danger"
                        onClick={() => submit(true)}
                    >
                        Merge and disable instead
                    </button>
                ) : (
                    <button
                        type="submit"
                        className="button button-danger"
                        disabled={
                            mutation.isPending || counterpartyToKeep === null
                        }
                    >
                        {mutation.isPending ? "Merging…" : "Merge"}
                    </button>
                )}
            </div>
        </form>
    );
}
