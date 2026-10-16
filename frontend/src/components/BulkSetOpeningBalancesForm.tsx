import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
    PLATFORM_BULK_SET_OPENING_BALANCES_MAX_ITEMS,
    type PlatformAccount,
    type PlatformBulkOpeningBalanceItem,
} from "@kick-demo/shared";
import { bulkSetOpeningBalances } from "../api/platform";
import {
    parseNonzeroAmount,
    useInvalidateOpeningBalances,
} from "../lib/opening-balances";
import { AccountOptions } from "./AccountOptions";
import { ErrorMessageBox } from "./StatusMessage";

const NONE_SELECTED = "";

type RowDraft = {
    key: number;
    accountId: string;
    openingBalance: string;
    adjustment: string;
};

const emptyRow = (key: number): RowDraft => ({
    key,
    accountId: NONE_SELECTED,
    openingBalance: "",
    adjustment: "",
});

/**
 * A row is complete with an account and at least one part; a part left blank
 * is not sent, so Kick leaves it untouched. A part that was typed must be a
 * nonzero amount, otherwise the row is incomplete rather than silently
 * dropping it.
 */
function toItem(row: RowDraft): PlatformBulkOpeningBalanceItem | null {
    if (row.accountId === NONE_SELECTED) {
        return null;
    }
    const openingBalance = parseNonzeroAmount(row.openingBalance);
    const adjustment = parseNonzeroAmount(row.adjustment);
    const isOpeningBalanceValid =
        row.openingBalance.trim() === "" || openingBalance !== null;
    const isAdjustmentValid =
        row.adjustment.trim() === "" || adjustment !== null;
    if (
        !isOpeningBalanceValid ||
        !isAdjustmentValid ||
        (openingBalance === null && adjustment === null)
    ) {
        return null;
    }
    return {
        accountId: row.accountId,
        ...(openingBalance !== null && {
            openingBalance: { lines: [{ balance: openingBalance }] },
        }),
        ...(adjustment !== null && { adjustment: { balance: adjustment } }),
    };
}

/**
 * Sets the opening balances of several accounts in one atomic request — the
 * shape a partner uses to carry a trial balance over from previous books.
 * Each row books a single-line main opening balance and/or an adjustment with
 * Kick's default date and clearing account; per-account forms cover the rest.
 * An account already picked in one row is not offered in another, because
 * Kick refuses an account listed twice.
 */
export function BulkSetOpeningBalancesForm({
    entityId,
    accounts,
    onDone,
}: {
    entityId: string;
    accounts: PlatformAccount[];
    onDone: () => void;
}) {
    const invalidate = useInvalidateOpeningBalances(entityId);
    const [rows, setRows] = useState<RowDraft[]>([emptyRow(0), emptyRow(1)]);
    const [nextKey, setNextKey] = useState(2);

    const selectableAccounts = accounts.filter(
        (account) => !account.isDisabled,
    );
    const items = rows.map(toItem);
    const completeItems = items.filter(
        (item): item is PlatformBulkOpeningBalanceItem => item !== null,
    );
    const isSubmittable =
        rows.length > 0 && completeItems.length === rows.length;

    const patchRow = (key: number, patch: Partial<RowDraft>) => {
        setRows((current) =>
            current.map((row) =>
                row.key === key ? { ...row, ...patch } : row,
            ),
        );
    };

    const mutation = useMutation({
        mutationFn: () =>
            bulkSetOpeningBalances({
                entityId,
                body: { openingBalances: completeItems },
            }),
        onSuccess: async () => {
            await invalidate();
            onDone();
        },
    });

    return (
        <form
            className="card form-card form-card-wide"
            onSubmit={(event) => {
                event.preventDefault();
                if (isSubmittable) {
                    mutation.mutate();
                }
            }}
        >
            <h3 className="form-title">Set opening balances in bulk</h3>
            <p className="page-meta">
                Up to {PLATFORM_BULK_SET_OPENING_BALANCES_MAX_ITEMS} accounts in
                one request. It is atomic: if any row is refused, nothing is
                saved. Amounts use the account's natural sign — positive
                increases the account. A part left blank keeps whatever the
                account already has.
            </p>
            {rows.map((row) => {
                const takenElsewhere = new Set(
                    rows
                        .filter((other) => other.key !== row.key)
                        .map((other) => other.accountId),
                );
                return (
                    <div className="line-editor" key={row.key}>
                        <label className="field">
                            <span className="field-label">Account</span>
                            <select
                                value={row.accountId}
                                onChange={(event) =>
                                    patchRow(row.key, {
                                        accountId: event.target.value,
                                    })
                                }
                                required
                            >
                                <AccountOptions
                                    accounts={selectableAccounts.filter(
                                        (account) =>
                                            !takenElsewhere.has(account.id),
                                    )}
                                    emptyValue={NONE_SELECTED}
                                    emptyLabel="Select an account…"
                                />
                            </select>
                        </label>
                        <label className="field">
                            <span className="field-label">Opening balance</span>
                            <input
                                type="number"
                                step="0.01"
                                value={row.openingBalance}
                                onChange={(event) =>
                                    patchRow(row.key, {
                                        openingBalance: event.target.value,
                                    })
                                }
                                placeholder="Leave blank to keep"
                            />
                        </label>
                        <label className="field">
                            <span className="field-label">Adjustment</span>
                            <input
                                type="number"
                                step="0.01"
                                value={row.adjustment}
                                onChange={(event) =>
                                    patchRow(row.key, {
                                        adjustment: event.target.value,
                                    })
                                }
                                placeholder="Leave blank to keep"
                            />
                        </label>
                        {rows.length > 1 && (
                            <button
                                type="button"
                                className="button button-secondary"
                                onClick={() =>
                                    setRows((current) =>
                                        current.filter(
                                            (each) => each.key !== row.key,
                                        ),
                                    )
                                }
                                disabled={mutation.isPending}
                            >
                                Remove
                            </button>
                        )}
                    </div>
                );
            })}
            <div className="form-actions">
                <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => {
                        setRows((current) => [...current, emptyRow(nextKey)]);
                        setNextKey((key) => key + 1);
                    }}
                    disabled={
                        mutation.isPending ||
                        rows.length >=
                            PLATFORM_BULK_SET_OPENING_BALANCES_MAX_ITEMS
                    }
                >
                    Add row
                </button>
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
                <button
                    type="submit"
                    className="button button-primary"
                    disabled={mutation.isPending || !isSubmittable}
                >
                    {mutation.isPending
                        ? "Saving…"
                        : `Save ${rows.length} ${rows.length === 1 ? "account" : "accounts"}`}
                </button>
            </div>
        </form>
    );
}
