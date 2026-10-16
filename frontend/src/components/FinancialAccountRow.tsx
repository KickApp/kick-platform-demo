import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    FINANCIAL_ACCOUNT_SOURCE_LABELS,
    FINANCIAL_ACCOUNT_TYPE_LABELS,
    type PlatformEntity,
    type PlatformFinancialAccount,
    type PlatformFinancialAccountUpdateBody,
} from "@kick-demo/shared";
import {
    deleteFinancialAccount,
    moveFinancialAccount,
    updateFinancialAccount,
} from "../api/platform";
import { ApiError } from "../api/errors";
import { formatAmount, formatDate, formatDateTime } from "../lib/format";
import { FinancialAccountSyncCell } from "./FinancialAccountSyncCell";

type FinancialAccountWrite =
    | { action: "update"; body: PlatformFinancialAccountUpdateBody }
    | { action: "move"; entityId: string }
    | { action: "delete"; forceDeletion: boolean };

type Draft = {
    name: string;
    bookkeepingStartDate: string;
    bookkeepingEndDate: string;
};

function toDraft(account: PlatformFinancialAccount): Draft {
    return {
        name: account.name ?? "",
        bookkeepingStartDate: account.bookkeepingStartDate ?? "",
        bookkeepingEndDate: account.bookkeepingEndDate ?? "",
    };
}

/**
 * Only the fields that changed go out, so an untouched date never triggers
 * Kick's journal-entry regeneration. An empty date input means null.
 */
function toUpdateBody(
    account: PlatformFinancialAccount,
    draft: Draft,
): PlatformFinancialAccountUpdateBody {
    const name = draft.name.trim();
    const bookkeepingStartDate =
        draft.bookkeepingStartDate !== "" ? draft.bookkeepingStartDate : null;
    const bookkeepingEndDate =
        draft.bookkeepingEndDate !== "" ? draft.bookkeepingEndDate : null;
    return {
        ...(name !== "" && name !== account.name && { name }),
        ...(bookkeepingStartDate !== account.bookkeepingStartDate && {
            bookkeepingStartDate,
        }),
        ...(bookkeepingEndDate !== account.bookkeepingEndDate && {
            bookkeepingEndDate,
        }),
    };
}

/**
 * One financial account, with every write the Platform API allows on it:
 * rename and change the bookkeeping dates, move to another entity of the
 * workspace, and delete. Nothing on the wire says which account Kick will
 * refuse a write for — reconciliations or an opening balance block a date
 * change, manual journal entries block a plain delete — so every action is
 * offered and Kick's message is shown when it declines.
 */
export function FinancialAccountRow({
    account,
    workspaceId,
    entities,
    entityName,
}: {
    account: PlatformFinancialAccount;
    workspaceId: string;
    entities: PlatformEntity[];
    entityName: (entityId: string) => string | null;
}) {
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState<Draft>(() => toDraft(account));

    const displayName = account.name ?? account.institutionName ?? "Untitled";
    const entityLabel = (entityId: string) => entityName(entityId) ?? entityId;

    const mutation = useMutation({
        mutationFn: async (write: FinancialAccountWrite) => {
            const params = { workspaceId, financialAccountId: account.id };
            switch (write.action) {
                case "update":
                    await updateFinancialAccount({
                        ...params,
                        body: write.body,
                    });
                    return;
                case "move":
                    await moveFinancialAccount({
                        ...params,
                        entityId: write.entityId,
                    });
                    return;
                case "delete":
                    await deleteFinancialAccount({
                        ...params,
                        forceDeletion: write.forceDeletion,
                    });
                    return;
            }
        },
        onSuccess: async (_, write) => {
            setIsEditing(false);
            const queryKeys = [
                ["financialAccounts", workspaceId],
                ["plaidConnections", workspaceId],
                ["chart-of-accounts"],
            ];
            // A move or a delete takes the account's transactions and
            // accounting data along, so everything built from them is stale.
            if (write.action !== "update") {
                queryKeys.push(
                    ["transactions", workspaceId],
                    ["journal-entries"],
                    ["report"],
                );
            }
            await Promise.all(
                queryKeys.map((queryKey) =>
                    queryClient.invalidateQueries({ queryKey }),
                ),
            );
        },
    });

    const isBlockedDelete =
        mutation.error instanceof ApiError &&
        mutation.error.status === 409 &&
        mutation.variables?.action === "delete" &&
        !mutation.variables.forceDeletion;

    const startEditing = () => {
        mutation.reset();
        setDraft(toDraft(account));
        setIsEditing(true);
    };

    const save = () => {
        const body = toUpdateBody(account, draft);
        if (Object.keys(body).length === 0) {
            setIsEditing(false);
            return;
        }
        mutation.mutate({ action: "update", body });
    };

    const confirmDelete = (forceDeletion: boolean) => {
        const message = forceDeletion
            ? `Delete "${displayName}" anyway? The manual journal entries posting to it are deleted too. This can't be undone.`
            : `Delete "${displayName}"? Deletion is permanent and takes the account's transactions with it.`;
        if (window.confirm(message)) {
            mutation.mutate({ action: "delete", forceDeletion });
        }
    };

    const nameIsInvalid = draft.name.trim() === "" && account.name !== null;

    return (
        <tr>
            <td>
                {isEditing ? (
                    <input
                        type="text"
                        className="cell-control"
                        value={draft.name}
                        maxLength={100}
                        autoFocus
                        aria-label="Name"
                        onChange={(event) =>
                            setDraft({ ...draft, name: event.target.value })
                        }
                    />
                ) : (
                    displayName
                )}
                <div className="page-meta mono">{account.id}</div>
            </td>
            <td>
                {account.institutionName ?? "—"}
                {account.accountNumberMask !== null && (
                    <span className="page-meta">
                        {" "}
                        ••••{account.accountNumberMask}
                    </span>
                )}
            </td>
            <td>{FINANCIAL_ACCOUNT_TYPE_LABELS[account.type]}</td>
            <td>{FINANCIAL_ACCOUNT_SOURCE_LABELS[account.source]}</td>
            <td>
                {entities.length > 1 ? (
                    <select
                        className="cell-control"
                        value={account.entityId}
                        disabled={mutation.isPending || isEditing}
                        aria-label="Entity"
                        onChange={(event) => {
                            const entityId = event.target.value;
                            const confirmed = window.confirm(
                                `Move "${displayName}" to ${entityLabel(entityId)}? Its transactions, documents and accounting data move with it.`,
                            );
                            if (confirmed) {
                                mutation.reset();
                                mutation.mutate({ action: "move", entityId });
                            }
                        }}
                    >
                        {!entities.some(
                            (entity) => entity.id === account.entityId,
                        ) && (
                            <option value={account.entityId}>
                                {account.entityId}
                            </option>
                        )}
                        {entities.map((entity) => (
                            <option key={entity.id} value={entity.id}>
                                {entity.name ?? entity.id}
                            </option>
                        ))}
                    </select>
                ) : (
                    (entityName(account.entityId) ?? (
                        <span className="mono">{account.entityId}</span>
                    ))
                )}
            </td>
            <td className="amount">
                {account.balance !== null ? formatAmount(account.balance) : "—"}
                {account.balanceSyncedAt !== null && (
                    <div
                        className="page-meta"
                        title={formatDateTime(account.balanceSyncedAt)}
                    >
                        as of {formatDate(account.balanceSyncedAt)}
                    </div>
                )}
            </td>
            <td>
                <FinancialAccountSyncCell account={account} />
            </td>
            <td>
                {isEditing ? (
                    <input
                        type="date"
                        className="cell-control"
                        value={draft.bookkeepingStartDate}
                        max={draft.bookkeepingEndDate || undefined}
                        aria-label="Bookkeeping start date"
                        onChange={(event) =>
                            setDraft({
                                ...draft,
                                bookkeepingStartDate: event.target.value,
                            })
                        }
                    />
                ) : (
                    (account.bookkeepingStartDate ?? (
                        <span className="cell-placeholder">Entity start</span>
                    ))
                )}
            </td>
            <td>
                {isEditing ? (
                    <input
                        type="date"
                        className="cell-control"
                        value={draft.bookkeepingEndDate}
                        min={draft.bookkeepingStartDate || undefined}
                        aria-label="Bookkeeping end date"
                        onChange={(event) =>
                            setDraft({
                                ...draft,
                                bookkeepingEndDate: event.target.value,
                            })
                        }
                    />
                ) : (
                    (account.bookkeepingEndDate ?? (
                        <span className="cell-placeholder">Open-ended</span>
                    ))
                )}
            </td>
            <td>
                <div className="row-actions">
                    {mutation.isPending ? (
                        <span className="cell-pending">Saving…</span>
                    ) : isEditing ? (
                        <>
                            <button
                                type="button"
                                className="button button-primary"
                                disabled={nameIsInvalid}
                                onClick={save}
                            >
                                Save
                            </button>
                            <button
                                type="button"
                                className="button button-secondary"
                                onClick={() => {
                                    mutation.reset();
                                    setIsEditing(false);
                                }}
                            >
                                Cancel
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                className="button button-secondary"
                                onClick={startEditing}
                            >
                                Edit
                            </button>
                            {isBlockedDelete ? (
                                <button
                                    type="button"
                                    className="button button-danger"
                                    onClick={() => confirmDelete(true)}
                                >
                                    Delete anyway
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="button button-danger"
                                    onClick={() => {
                                        mutation.reset();
                                        confirmDelete(false);
                                    }}
                                >
                                    Delete
                                </button>
                            )}
                        </>
                    )}
                </div>
                {isEditing && !mutation.isPending && (
                    <span className="cell-hint">
                        Clear a date to follow the entity's start or stay
                        open-ended. Changing a date regenerates the account's
                        journal entries.
                    </span>
                )}
                {mutation.error !== null && (
                    <span className="cell-error">{mutation.error.message}</span>
                )}
            </td>
        </tr>
    );
}
