import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
    PlatformAccount,
    PlatformJournalEntryCreateBody,
} from "@kick-demo/shared";
import { runAccountingMigration } from "../api/accounting-migration";
import {
    formatAccountLabel,
    groupAccountsByClass,
} from "../lib/use-entity-accounts";
import { formatDate } from "../lib/format";
import { ErrorMessageBox } from "./StatusMessage";

const NONE_SELECTED = "";

function AccountOptions({ accounts }: { accounts: PlatformAccount[] }) {
    return (
        <>
            <option value={NONE_SELECTED}>Select an account…</option>
            {groupAccountsByClass(accounts).map((group) => (
                <optgroup key={group.accountClass} label={group.accountClass}>
                    {group.accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                            {formatAccountLabel(account)}
                        </option>
                    ))}
                </optgroup>
            ))}
        </>
    );
}

/**
 * One historical booking: a balanced two-line journal entry, debit account on
 * one side and credit account on the other. Guaranteeing balance by
 * construction keeps the form honest without a full multi-line editor.
 */
type EntryDraft = {
    key: number;
    date: string;
    description: string;
    amount: string;
    debitAccountId: string;
    creditAccountId: string;
};

/** The day before the bookkeeping start date — the migrated period's last day. */
function migrationEndIsoDate(bookkeepingStartDate: string): string {
    const date = new Date(`${bookkeepingStartDate}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) {
        return bookkeepingStartDate;
    }
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().slice(0, 10);
}

function toJournalEntry(draft: EntryDraft): PlatformJournalEntryCreateBody {
    const amount = Number(draft.amount);
    const description = draft.description.trim();
    return {
        date: draft.date,
        memo: description !== "" ? description : null,
        ledgerBasis: "cash",
        lines: [
            {
                accountId: draft.debitAccountId,
                debitAmount: amount,
                creditAmount: null,
                description,
                classIds: [],
            },
            {
                accountId: draft.creditAccountId,
                debitAmount: null,
                creditAmount: amount,
                description,
                classIds: [],
            },
        ],
    };
}

function isComplete(draft: EntryDraft): boolean {
    return (
        draft.date !== "" &&
        Number(draft.amount) > 0 &&
        draft.debitAccountId !== NONE_SELECTED &&
        draft.creditAccountId !== NONE_SELECTED &&
        draft.debitAccountId !== draft.creditAccountId
    );
}

/**
 * Collects a few historical journal entries and hands them to the BFF's
 * orchestration route, which starts the migration, bulk-creates the entries
 * and queues transaction-rule generation in one request.
 */
export function AccountingMigrationForm({
    entityId,
    bookkeepingStartDate,
    accounts,
    onDone,
}: {
    entityId: string;
    bookkeepingStartDate: string;
    accounts: PlatformAccount[];
    onDone: () => void;
}) {
    const queryClient = useQueryClient();
    const defaultDate = migrationEndIsoDate(bookkeepingStartDate);

    const emptyDraft = (key: number): EntryDraft => ({
        key,
        date: defaultDate,
        description: "",
        amount: "",
        debitAccountId: NONE_SELECTED,
        creditAccountId: NONE_SELECTED,
    });

    const [nextKey, setNextKey] = useState(2);
    const [drafts, setDrafts] = useState<EntryDraft[]>([
        emptyDraft(0),
        emptyDraft(1),
    ]);

    const patchDraft = (key: number, patch: Partial<EntryDraft>) => {
        setDrafts((current) =>
            current.map((draft) =>
                draft.key === key ? { ...draft, ...patch } : draft,
            ),
        );
    };

    const addDraft = () => {
        setDrafts((current) => [...current, emptyDraft(nextKey)]);
        setNextKey((key) => key + 1);
    };

    const removeDraft = (key: number) => {
        setDrafts((current) => current.filter((draft) => draft.key !== key));
    };

    const mutation = useMutation({
        mutationFn: () =>
            runAccountingMigration({
                entityId,
                journalEntries: drafts.map(toJournalEntry),
            }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ["accounting-migration", entityId],
            });
            await queryClient.invalidateQueries({
                queryKey: ["journal-entries", entityId],
            });
            onDone();
        },
    });

    const isSubmittable =
        drafts.length > 0 && drafts.every((draft) => isComplete(draft));

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
            <h3 className="form-title">Migrate historical books</h3>
            <p className="page-meta">
                Each row books one balanced journal entry: the amount is debited
                to one account and credited to the other. Kick only generates
                categorization rules from income and expense lines dated in the
                year before the bookkeeping start date — on or before{" "}
                {formatDate(`${defaultDate}T00:00:00Z`)} for this entity.
            </p>
            {drafts.map((draft) => (
                <fieldset className="card form-card" key={draft.key}>
                    <label className="field">
                        <span className="field-label">Date</span>
                        <input
                            type="date"
                            value={draft.date}
                            max={defaultDate}
                            onChange={(event) =>
                                patchDraft(draft.key, {
                                    date: event.target.value,
                                })
                            }
                            required
                        />
                    </label>
                    <label className="field">
                        <span className="field-label">Description</span>
                        <input
                            type="text"
                            value={draft.description}
                            onChange={(event) =>
                                patchDraft(draft.key, {
                                    description: event.target.value,
                                })
                            }
                            placeholder="Adobe Creative Cloud"
                        />
                        <span className="field-hint">
                            Goes on both lines; rule generation clusters entries
                            by this text, the way bank descriptions cluster.
                        </span>
                    </label>
                    <label className="field">
                        <span className="field-label">Amount</span>
                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={draft.amount}
                            onChange={(event) =>
                                patchDraft(draft.key, {
                                    amount: event.target.value,
                                })
                            }
                            placeholder="49.99"
                            required
                        />
                    </label>
                    <label className="field">
                        <span className="field-label">Debit account</span>
                        <select
                            value={draft.debitAccountId}
                            onChange={(event) =>
                                patchDraft(draft.key, {
                                    debitAccountId: event.target.value,
                                })
                            }
                            required
                        >
                            <AccountOptions accounts={accounts} />
                        </select>
                        <span className="field-hint">
                            For an expense: the expense account.
                        </span>
                    </label>
                    <label className="field">
                        <span className="field-label">Credit account</span>
                        <select
                            value={draft.creditAccountId}
                            onChange={(event) =>
                                patchDraft(draft.key, {
                                    creditAccountId: event.target.value,
                                })
                            }
                            required
                        >
                            <AccountOptions accounts={accounts} />
                        </select>
                        <span className="field-hint">
                            For an expense: the bank account it was paid from.
                        </span>
                    </label>
                    {draft.debitAccountId !== NONE_SELECTED &&
                        draft.debitAccountId === draft.creditAccountId && (
                            <span className="field-error">
                                Debit and credit accounts must differ.
                            </span>
                        )}
                    {drafts.length > 1 && (
                        <div className="form-actions">
                            <button
                                type="button"
                                className="button button-secondary"
                                onClick={() => removeDraft(draft.key)}
                                disabled={mutation.isPending}
                            >
                                Remove entry
                            </button>
                        </div>
                    )}
                </fieldset>
            ))}
            <div className="form-actions">
                <button
                    type="button"
                    className="button button-secondary"
                    onClick={addDraft}
                    disabled={mutation.isPending}
                >
                    Add entry
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
                        ? "Migrating…"
                        : "Migrate & generate rules"}
                </button>
            </div>
        </form>
    );
}
