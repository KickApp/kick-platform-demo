import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PLATFORM_BULK_CREATE_ACCOUNTS_MAX_ITEMS } from "@kick-demo/shared";
import { bulkCreateAccounts } from "../api/platform";
import { parseAccountLines } from "../lib/parse-accounts";
import { ErrorMessageBox } from "./StatusMessage";

const PLACEHOLDER = `Software Subscriptions, Operating Expenses
Meals, Entertainment, Operating Expenses, 6420
Consulting Revenue, Income`;

export function BulkCreateAccountsForm({
    entityId,
    onDone,
}: {
    entityId: string;
    onDone: () => void;
}) {
    const queryClient = useQueryClient();
    const [text, setText] = useState("");

    const parsedLines = parseAccountLines(text);
    const accounts = parsedLines.flatMap((line) =>
        line.account !== undefined ? [line.account] : [],
    );
    const failedLines = parsedLines.filter((line) => line.error !== undefined);
    const isOverLimit =
        accounts.length > PLATFORM_BULK_CREATE_ACCOUNTS_MAX_ITEMS;
    const canSubmit =
        accounts.length > 0 && failedLines.length === 0 && !isOverLimit;

    const mutation = useMutation({
        mutationFn: () => bulkCreateAccounts({ entityId, body: { accounts } }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ["chart-of-accounts", entityId],
            });
            onDone();
        },
    });

    return (
        <form
            className="card form-card"
            onSubmit={(event) => {
                event.preventDefault();
                mutation.mutate();
            }}
        >
            <h3 className="form-title">Add multiple accounts</h3>
            <label className="field">
                <span className="field-label">
                    One account per line: name, type, optional code
                </span>
                <textarea
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder={PLACEHOLDER}
                    rows={8}
                    autoFocus
                />
                <span className="field-hint">
                    Paste straight from a spreadsheet. The trailing field is
                    read as the code unless it names an account type, so a name
                    containing commas still works. Up to{" "}
                    {PLATFORM_BULK_CREATE_ACCOUNTS_MAX_ITEMS} accounts, created
                    in one atomic call — if Kick rejects any of them, none are
                    created.
                </span>
            </label>

            {accounts.length > 0 && failedLines.length === 0 && (
                <p className="page-meta">
                    {accounts.length}{" "}
                    {accounts.length === 1 ? "account" : "accounts"} ready.
                </p>
            )}
            {isOverLimit && (
                <p className="field-error">
                    {accounts.length} accounts exceeds the per-call maximum of{" "}
                    {PLATFORM_BULK_CREATE_ACCOUNTS_MAX_ITEMS}.
                </p>
            )}
            {failedLines.map((line) => (
                <p className="field-error" key={line.lineNumber}>
                    Line {line.lineNumber}: {line.error}
                </p>
            ))}

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
                    disabled={mutation.isPending || !canSubmit}
                >
                    {mutation.isPending
                        ? "Creating…"
                        : `Create ${accounts.length || ""} accounts`.trim()}
                </button>
            </div>
        </form>
    );
}
