import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type {
    PlatformAccount,
    PlatformAccountOpeningBalance,
} from "@kick-demo/shared";
import {
    deleteOpeningBalance,
    deleteOpeningBalanceAdjustment,
} from "../api/platform";
import { formatAmount, formatDate } from "../lib/format";
import { useInvalidateOpeningBalances } from "../lib/opening-balances";
import { formatAccountLabel } from "../lib/use-entity-accounts";
import { OpeningBalanceAdjustmentForm } from "./OpeningBalanceAdjustmentForm";
import { OpeningBalanceForm } from "./OpeningBalanceForm";

type Editing = "none" | "opening-balance" | "adjustment";

const COLUMN_COUNT = 5;

function ClearingAccountLabel({
    clearingAccountId,
    accounts,
}: {
    clearingAccountId: string;
    accounts: PlatformAccount[];
}) {
    const clearingAccount = accounts.find(
        (account) => account.id === clearingAccountId,
    );
    return (
        <>
            against{" "}
            {clearingAccount !== undefined
                ? formatAccountLabel(clearingAccount)
                : clearingAccountId}
        </>
    );
}

/**
 * One account and its two opening balance parts. Which writes Kick refuses —
 * a date on or after a linked bank account's own start date, deleting once
 * the bank account is reconciled — is not visible on the wire, so every action
 * is offered and Kick's message is shown on the row when it declines.
 */
export function OpeningBalanceRow({
    account,
    accounts,
    openingBalance,
    entityId,
    bookkeepingStartDate,
}: {
    account: PlatformAccount;
    accounts: PlatformAccount[];
    openingBalance: PlatformAccountOpeningBalance | undefined;
    entityId: string;
    bookkeepingStartDate: string;
}) {
    const invalidate = useInvalidateOpeningBalances(entityId);
    const [editing, setEditing] = useState<Editing>("none");

    const main = openingBalance?.openingBalance ?? null;
    const adjustment = openingBalance?.adjustment ?? null;

    const deletion = useMutation({
        mutationFn: (part: "all" | "adjustment") => {
            const params = { entityId, accountId: account.id };
            return part === "all"
                ? deleteOpeningBalance(params)
                : deleteOpeningBalanceAdjustment(params);
        },
        onSuccess: invalidate,
    });

    const startEditing = (next: Editing) => {
        deletion.reset();
        setEditing(next);
    };

    return (
        <>
            <tr>
                <td className="mono">{account.code ?? "—"}</td>
                <td>
                    {account.name}
                    {account.isDisabled && (
                        <>
                            {" "}
                            <span className="badge">Archived</span>
                        </>
                    )}
                    <span className="cell-meta">{account.type}</span>
                </td>
                <td className="amount">
                    {main !== null ? (
                        <>
                            {formatAmount(main.balance)}
                            <span className="cell-meta">
                                {formatDate(`${main.date}T00:00:00Z`)} ·{" "}
                                {main.lines.length}{" "}
                                {main.lines.length === 1 ? "line" : "lines"}
                            </span>
                            <span className="cell-meta">
                                <ClearingAccountLabel
                                    clearingAccountId={main.clearingAccountId}
                                    accounts={accounts}
                                />
                            </span>
                        </>
                    ) : (
                        <span className="cell-placeholder">None</span>
                    )}
                </td>
                <td className="amount">
                    {adjustment !== null ? (
                        <>
                            {formatAmount(adjustment.balance)}
                            <span className="cell-meta">
                                {formatDate(`${adjustment.date}T00:00:00Z`)}
                            </span>
                            <span className="cell-meta">
                                <ClearingAccountLabel
                                    clearingAccountId={
                                        adjustment.clearingAccountId
                                    }
                                    accounts={accounts}
                                />
                            </span>
                        </>
                    ) : (
                        <span className="cell-placeholder">None</span>
                    )}
                </td>
                <td>
                    <div className="row-actions">
                        {deletion.isPending ? (
                            <span className="cell-pending">Deleting…</span>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    className="button button-secondary"
                                    disabled={editing !== "none"}
                                    onClick={() =>
                                        startEditing("opening-balance")
                                    }
                                >
                                    {main !== null
                                        ? "Edit balance"
                                        : "Set balance"}
                                </button>
                                <button
                                    type="button"
                                    className="button button-secondary"
                                    disabled={editing !== "none"}
                                    onClick={() => startEditing("adjustment")}
                                >
                                    {adjustment !== null
                                        ? "Edit adjustment"
                                        : "Set adjustment"}
                                </button>
                                {adjustment !== null && (
                                    <button
                                        type="button"
                                        className="button button-danger"
                                        disabled={editing !== "none"}
                                        onClick={() => {
                                            const confirmed = window.confirm(
                                                `Delete the adjustment of "${account.name}"? Its main opening balance is kept.`,
                                            );
                                            if (confirmed) {
                                                deletion.mutate("adjustment");
                                            }
                                        }}
                                    >
                                        Delete adjustment
                                    </button>
                                )}
                                {(main !== null || adjustment !== null) && (
                                    <button
                                        type="button"
                                        className="button button-danger"
                                        disabled={editing !== "none"}
                                        onClick={() => {
                                            const confirmed = window.confirm(
                                                `Delete the opening balance and the adjustment of "${account.name}", along with their journal entries?`,
                                            );
                                            if (confirmed) {
                                                deletion.mutate("all");
                                            }
                                        }}
                                    >
                                        Delete all
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                    {deletion.error !== null && (
                        <span className="cell-error">
                            {deletion.error.message}
                        </span>
                    )}
                </td>
            </tr>
            {editing !== "none" && (
                <tr className="row-editor">
                    <td colSpan={COLUMN_COUNT}>
                        {editing === "opening-balance" ? (
                            <OpeningBalanceForm
                                entityId={entityId}
                                account={account}
                                accounts={accounts}
                                bookkeepingStartDate={bookkeepingStartDate}
                                current={main}
                                onDone={() => setEditing("none")}
                            />
                        ) : (
                            <OpeningBalanceAdjustmentForm
                                entityId={entityId}
                                account={account}
                                accounts={accounts}
                                bookkeepingStartDate={bookkeepingStartDate}
                                current={adjustment}
                                onDone={() => setEditing("none")}
                            />
                        )}
                    </td>
                </tr>
            )}
        </>
    );
}
