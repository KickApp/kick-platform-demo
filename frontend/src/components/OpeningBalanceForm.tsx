import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
    PLATFORM_OPENING_BALANCE_MAX_LINES,
    type PlatformAccount,
    type PlatformMainOpeningBalance,
} from "@kick-demo/shared";
import { setOpeningBalance } from "../api/platform";
import { formatAmount, formatDate } from "../lib/format";
import {
    dayBeforeIsoDate,
    parseNonzeroAmount,
    sumInCents,
    useInvalidateOpeningBalances,
} from "../lib/opening-balances";
import {
    ClearingAccountField,
    DEFAULT_CLEARING_ACCOUNT,
} from "./ClearingAccountField";
import { ErrorMessageBox } from "./StatusMessage";

type LineDraft = { key: number; amount: string; description: string };

const DEFAULT_DATE = "";

function toNullableText(text: string): string | null {
    const trimmed = text.trim();
    return trimmed !== "" ? trimmed : null;
}

/**
 * Creates or replaces an account's main opening balance. Every line is booked
 * against the same clearing account, so a balance made of several pieces
 * (e.g. two bank sub-accounts rolled into one) keeps its breakdown. Setting it
 * replaces the whole balance and leaves the adjustment alone.
 */
export function OpeningBalanceForm({
    entityId,
    account,
    accounts,
    bookkeepingStartDate,
    current,
    onDone,
}: {
    entityId: string;
    account: PlatformAccount;
    accounts: PlatformAccount[];
    bookkeepingStartDate: string;
    current: PlatformMainOpeningBalance | null;
    onDone: () => void;
}) {
    const invalidate = useInvalidateOpeningBalances(entityId);
    const latestDate = dayBeforeIsoDate(bookkeepingStartDate);

    const [lines, setLines] = useState<LineDraft[]>(
        current !== null && current.lines.length > 0
            ? current.lines.map((line, index) => ({
                  key: index,
                  amount: `${line.balance}`,
                  description: line.description ?? "",
              }))
            : [{ key: 0, amount: "", description: "" }],
    );
    const [nextKey, setNextKey] = useState(lines.length);
    const [date, setDate] = useState(current?.date ?? DEFAULT_DATE);
    const [clearingAccountId, setClearingAccountId] = useState(
        current?.clearingAccountId ?? DEFAULT_CLEARING_ACCOUNT,
    );
    const [description, setDescription] = useState(current?.description ?? "");

    const amounts = lines.map((line) => parseNonzeroAmount(line.amount));
    const validAmounts = amounts.filter(
        (amount): amount is number => amount !== null,
    );
    const isSubmittable =
        lines.length > 0 && validAmounts.length === lines.length;

    const patchLine = (key: number, patch: Partial<LineDraft>) => {
        setLines((current) =>
            current.map((line) =>
                line.key === key ? { ...line, ...patch } : line,
            ),
        );
    };

    const mutation = useMutation({
        mutationFn: () =>
            setOpeningBalance({
                entityId,
                accountId: account.id,
                body: {
                    lines: lines.map((line) => ({
                        balance: Number(line.amount),
                        description: toNullableText(line.description),
                    })),
                    ...(date !== DEFAULT_DATE && { date }),
                    ...(clearingAccountId !== DEFAULT_CLEARING_ACCOUNT && {
                        clearingAccountId,
                    }),
                    description: toNullableText(description),
                },
            }),
        onSuccess: async () => {
            await invalidate();
            onDone();
        },
    });

    return (
        <form
            className="card form-card"
            onSubmit={(event) => {
                event.preventDefault();
                if (isSubmittable) {
                    mutation.mutate();
                }
            }}
        >
            <h3 className="form-title">
                {current !== null ? "Update" : "Set"} opening balance —{" "}
                {account.name}
            </h3>
            <p className="page-meta">
                Amounts use the account's natural sign: a positive amount
                increases the account (a debit for assets and expenses, a credit
                for liabilities, equity and income).
            </p>
            {lines.map((line, index) => (
                <div className="line-editor" key={line.key}>
                    <label className="field">
                        <span className="field-label">Amount</span>
                        <input
                            type="number"
                            step="0.01"
                            value={line.amount}
                            onChange={(event) =>
                                patchLine(line.key, {
                                    amount: event.target.value,
                                })
                            }
                            placeholder="1250.00"
                            required
                            autoFocus={index === 0}
                        />
                    </label>
                    <label className="field">
                        <span className="field-label">
                            Line description (optional)
                        </span>
                        <input
                            type="text"
                            value={line.description}
                            maxLength={500}
                            onChange={(event) =>
                                patchLine(line.key, {
                                    description: event.target.value,
                                })
                            }
                            placeholder="Operating account"
                        />
                    </label>
                    {lines.length > 1 && (
                        <button
                            type="button"
                            className="button button-secondary"
                            onClick={() =>
                                setLines((current) =>
                                    current.filter(
                                        (each) => each.key !== line.key,
                                    ),
                                )
                            }
                            disabled={mutation.isPending}
                        >
                            Remove
                        </button>
                    )}
                </div>
            ))}
            <div className="form-actions line-editor-footer">
                <span className="page-meta">
                    Total {formatAmount(sumInCents(validAmounts))}
                </span>
                <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => {
                        setLines((current) => [
                            ...current,
                            { key: nextKey, amount: "", description: "" },
                        ]);
                        setNextKey((key) => key + 1);
                    }}
                    disabled={
                        mutation.isPending ||
                        lines.length >= PLATFORM_OPENING_BALANCE_MAX_LINES
                    }
                >
                    Add line
                </button>
            </div>
            <label className="field">
                <span className="field-label">Date (optional)</span>
                <input
                    type="date"
                    value={date}
                    max={latestDate}
                    onChange={(event) => setDate(event.target.value)}
                />
                <span className="field-hint">
                    Must be before the bookkeeping start date. Leave blank for
                    the day before it — {formatDate(`${latestDate}T00:00:00Z`)}{" "}
                    for this entity, or the day before a linked bank account's
                    own start date.
                </span>
            </label>
            <ClearingAccountField
                accounts={accounts}
                accountId={account.id}
                value={clearingAccountId}
                onChange={setClearingAccountId}
                defaultLabel="Default — retained earnings (or owner's capital)"
                hint="The offsetting side of every line is booked here."
            />
            <label className="field">
                <span className="field-label">
                    Clearing description (optional)
                </span>
                <input
                    type="text"
                    value={description}
                    maxLength={500}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Balance carried over from previous books"
                />
            </label>
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
                    {mutation.isPending ? "Saving…" : "Save opening balance"}
                </button>
            </div>
        </form>
    );
}
