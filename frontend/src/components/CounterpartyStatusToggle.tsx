import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PlatformCounterparty } from "@kick-demo/shared";
import { updateCounterparty } from "../api/platform";

/**
 * Disabling goes through `update` with `isDisabled`; Kick also archives the
 * transaction rules that assign the counterparty.
 */
export function CounterpartyStatusToggle({
    workspaceId,
    counterparty,
}: {
    workspaceId: string;
    counterparty: PlatformCounterparty;
}) {
    const queryClient = useQueryClient();
    const isDisabled = counterparty.disabledAt !== null;

    const mutation = useMutation({
        mutationFn: () =>
            updateCounterparty({
                workspaceId,
                counterpartyId: counterparty.id,
                body: { isDisabled: !isDisabled },
            }),
        onSuccess: async (updated) => {
            queryClient.setQueryData(
                ["counterparty", workspaceId, counterparty.id],
                updated,
            );
            await queryClient.invalidateQueries({
                queryKey: ["counterparties", workspaceId],
            });
        },
    });

    return (
        <div className="action-stack">
            <button
                type="button"
                className="button button-secondary"
                disabled={mutation.isPending}
                onClick={() => {
                    const confirmed =
                        isDisabled ||
                        window.confirm(
                            `Disable "${counterparty.name}"? It can no longer be assigned to transactions, and the transaction rules that assign it are archived.`,
                        );
                    if (confirmed) {
                        mutation.mutate();
                    }
                }}
            >
                {mutation.isPending
                    ? "Saving…"
                    : isDisabled
                      ? "Enable"
                      : "Disable"}
            </button>
            {mutation.error !== null && (
                <span className="cell-error">{mutation.error.message}</span>
            )}
        </div>
    );
}
