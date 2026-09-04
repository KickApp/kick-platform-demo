import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PlatformAccountGroup } from "@kick-demo/shared";
import { deleteAccountGroup, updateAccountGroup } from "../api/platform";

const TOP_LEVEL = "";

/**
 * One row of the hierarchy, with the two writes the Platform API allows on an
 * existing group — rename and re-parent — plus deletion, which lifts the
 * group's accounts and child groups to its parent rather than removing them.
 * A group's type is fixed on creation, so the parent picker only offers groups
 * of the same type that would not create a cycle.
 */
export function AccountGroupRow({
    group,
    entityId,
    depth,
    accountCount,
    eligibleParents,
}: {
    group: PlatformAccountGroup;
    entityId: string;
    depth: number;
    accountCount: number;
    eligibleParents: PlatformAccountGroup[];
}) {
    const queryClient = useQueryClient();
    const [isRenaming, setIsRenaming] = useState(false);
    const [name, setName] = useState(group.name);

    const invalidate = () =>
        Promise.all([
            queryClient.invalidateQueries({
                queryKey: ["account-groups", entityId],
            }),
            queryClient.invalidateQueries({
                queryKey: ["chart-of-accounts", entityId],
            }),
        ]);

    const mutation = useMutation({
        mutationFn: async ({
            action,
            renamedTo,
            movedTo,
        }: {
            action: "rename" | "move" | "delete";
            renamedTo?: string;
            movedTo?: string | null;
        }) => {
            const params = { entityId, groupId: group.id };
            switch (action) {
                case "rename":
                    await updateAccountGroup({
                        ...params,
                        body: { name: renamedTo ?? group.name },
                    });
                    return;
                case "move":
                    await updateAccountGroup({
                        ...params,
                        body: { parentGroupId: movedTo ?? null },
                    });
                    return;
                case "delete":
                    await deleteAccountGroup(params);
                    return;
            }
        },
        onSuccess: async () => {
            setIsRenaming(false);
            await invalidate();
        },
        onError: () => {
            setIsRenaming(false);
            setName(group.name);
        },
    });

    const submitRename = () => {
        const renamedTo = name.trim();
        if (renamedTo === "" || renamedTo === group.name) {
            setName(group.name);
            setIsRenaming(false);
            return;
        }
        mutation.mutate({ action: "rename", renamedTo });
    };

    return (
        <tr>
            <td>
                <div style={{ paddingLeft: `${depth * 1.5}rem` }}>
                    {isRenaming ? (
                        <div className="cell-editor">
                            <input
                                type="text"
                                value={name}
                                maxLength={80}
                                autoFocus
                                onChange={(event) =>
                                    setName(event.target.value)
                                }
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        submitRename();
                                    }
                                    if (event.key === "Escape") {
                                        setName(group.name);
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
                                {group.name}
                            </button>
                        </div>
                    )}
                </div>
                {mutation.error !== null && (
                    <span className="cell-error">{mutation.error.message}</span>
                )}
            </td>
            <td>
                <select
                    value={group.parentGroupId ?? TOP_LEVEL}
                    disabled={mutation.isPending}
                    onChange={(event) => {
                        mutation.reset();
                        mutation.mutate({
                            action: "move",
                            movedTo:
                                event.target.value === TOP_LEVEL
                                    ? null
                                    : event.target.value,
                        });
                    }}
                >
                    <option value={TOP_LEVEL}>Top level</option>
                    {eligibleParents.map((parent) => (
                        <option key={parent.id} value={parent.id}>
                            {parent.name}
                        </option>
                    ))}
                </select>
            </td>
            <td>{accountCount === 0 ? "—" : accountCount}</td>
            <td className="mono">{group.id}</td>
            <td>
                <div className="row-actions">
                    {mutation.isPending ? (
                        <span className="cell-pending">Saving…</span>
                    ) : (
                        <button
                            type="button"
                            className="button button-danger"
                            onClick={() => {
                                const confirmed = window.confirm(
                                    `Delete "${group.name}"? Its accounts and child groups move to the group above it.`,
                                );
                                if (confirmed) {
                                    mutation.mutate({ action: "delete" });
                                }
                            }}
                        >
                            Delete
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
}
