import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PlatformAccount } from "@kick-demo/shared";
import {
    deleteAccount,
    disableAccount,
    enableAccount,
    updateAccount,
} from "../api/platform";

type AccountAction = "rename" | "archive" | "delete";

/**
 * One row of the chart, with the three writes the Platform API allows on an
 * existing account. Which of them a given account accepts is not visible on
 * the wire — Kick's own seeded accounts refuse a rename, role holders refuse
 * archiving, and an account carrying journal entries refuses deletion — so
 * every action is offered and the API's own message is shown when it declines.
 */
export function AccountRow({
    account,
    entityId,
}: {
    account: PlatformAccount;
    entityId: string;
}) {
    const queryClient = useQueryClient();
    const [isRenaming, setIsRenaming] = useState(false);
    const [name, setName] = useState(account.name);

    const invalidate = () =>
        queryClient.invalidateQueries({
            queryKey: ["chart-of-accounts", entityId],
        });

    const mutation = useMutation({
        mutationFn: async ({
            action,
            renamedTo,
        }: {
            action: AccountAction;
            renamedTo?: string;
        }) => {
            const params = { entityId, accountId: account.id };
            switch (action) {
                case "rename":
                    await updateAccount({
                        ...params,
                        body: { name: renamedTo ?? account.name },
                    });
                    return;
                case "archive":
                    await (account.isDisabled
                        ? enableAccount(params)
                        : disableAccount(params));
                    return;
                case "delete":
                    await deleteAccount(params);
                    return;
            }
        },
        onSuccess: async () => {
            setIsRenaming(false);
            await invalidate();
        },
        // A refused write is refused for good — a Kick default will never take
        // a new name — so drop the edit and leave the reason on the row rather
        // than holding a doomed value that a later blur would resubmit.
        onError: () => {
            setIsRenaming(false);
            setName(account.name);
        },
    });

    const submitRename = () => {
        const renamedTo = name.trim();
        if (renamedTo === "" || renamedTo === account.name) {
            setName(account.name);
            setIsRenaming(false);
            return;
        }
        mutation.mutate({ action: "rename", renamedTo });
    };

    return (
        <tr>
            <td className="mono">{account.code ?? "—"}</td>
            <td>
                {isRenaming ? (
                    <div className="cell-editor">
                        <input
                            type="text"
                            value={name}
                            maxLength={200}
                            autoFocus
                            onChange={(event) => setName(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    event.preventDefault();
                                    submitRename();
                                }
                                if (event.key === "Escape") {
                                    setName(account.name);
                                    setIsRenaming(false);
                                }
                            }}
                            onBlur={submitRename}
                        />
                    </div>
                ) : (
                    <div className="cell-editable">
                        <button
                            type="button"
                            className="cell-button"
                            disabled={mutation.isPending}
                            onClick={() => {
                                mutation.reset();
                                setIsRenaming(true);
                            }}
                        >
                            {account.name}
                        </button>
                    </div>
                )}
                {mutation.error !== null && (
                    <span className="cell-error">{mutation.error.message}</span>
                )}
            </td>
            <td>{account.type}</td>
            <td>
                {account.isDisabled ? (
                    <span className="badge">Archived</span>
                ) : (
                    "—"
                )}
            </td>
            <td className="mono">{account.id}</td>
            <td>
                <div className="row-actions">
                    {mutation.isPending ? (
                        <span className="cell-pending">Saving…</span>
                    ) : (
                        <>
                            <button
                                type="button"
                                className="button button-secondary"
                                onClick={() =>
                                    mutation.mutate({ action: "archive" })
                                }
                            >
                                {account.isDisabled ? "Restore" : "Archive"}
                            </button>
                            <button
                                type="button"
                                className="button button-danger"
                                onClick={() => {
                                    const confirmed = window.confirm(
                                        `Delete "${account.name}"? Deletion is permanent; archive it instead to keep it out of pickers.`,
                                    );
                                    if (confirmed) {
                                        mutation.mutate({ action: "delete" });
                                    }
                                }}
                            >
                                Delete
                            </button>
                        </>
                    )}
                </div>
            </td>
        </tr>
    );
}
