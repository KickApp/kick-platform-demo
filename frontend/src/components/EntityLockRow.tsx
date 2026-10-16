import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PlatformEntity, PlatformLock } from "@kick-demo/shared";
import { setEntityLock } from "../api/platform";

/**
 * One entity and its lock. Setting a date locks the books through that day,
 * inclusive; unlocking sends a null date. The page keys the row by its lock
 * date, so a saved change remounts it with the date input reset.
 */
export function EntityLockRow({
    entity,
    lock,
}: {
    entity: PlatformEntity;
    lock: PlatformLock | undefined;
}) {
    const queryClient = useQueryClient();
    const lockedThrough = lock?.date ?? null;
    const [date, setDate] = useState(lockedThrough ?? "");

    const mutation = useMutation({
        mutationFn: (nextDate: string | null) =>
            setEntityLock({ entityId: entity.id, date: nextDate }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ["locks", entity.workspaceId],
            });
        },
    });

    return (
        <tr>
            <td>
                {entity.name ?? "—"}
                {mutation.error !== null && (
                    <span className="cell-error">{mutation.error.message}</span>
                )}
            </td>
            <td>
                {lockedThrough !== null ? (
                    lockedThrough
                ) : (
                    <span className="badge">Unlocked</span>
                )}
            </td>
            <td>
                <input
                    type="date"
                    value={date}
                    disabled={mutation.isPending}
                    onChange={(event) => {
                        mutation.reset();
                        setDate(event.target.value);
                    }}
                />
            </td>
            <td>
                <div className="row-actions">
                    {mutation.isPending ? (
                        <span className="cell-pending">Saving…</span>
                    ) : (
                        <>
                            <button
                                type="button"
                                className="button button-primary"
                                disabled={date === "" || date === lockedThrough}
                                onClick={() => mutation.mutate(date)}
                            >
                                Lock through
                            </button>
                            {lockedThrough !== null && (
                                <button
                                    type="button"
                                    className="button button-secondary"
                                    onClick={() => mutation.mutate(null)}
                                >
                                    Unlock
                                </button>
                            )}
                        </>
                    )}
                </div>
            </td>
        </tr>
    );
}
