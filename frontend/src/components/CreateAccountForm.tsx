import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ACCOUNT_CLASSES,
    ACCOUNT_TYPE_CLASSES,
    ACCOUNT_TYPES,
    type AccountType,
} from "@kick-demo/shared";
import { createAccount } from "../api/platform";
import { ErrorMessageBox } from "./StatusMessage";

const NO_CODE = "";

/**
 * An account's class follows from its type, so the picker is grouped by class
 * the same way the chart itself is displayed.
 */
const TYPE_GROUPS = ACCOUNT_CLASSES.map((accountClass) => ({
    accountClass,
    types: ACCOUNT_TYPES.filter(
        (type) => ACCOUNT_TYPE_CLASSES[type] === accountClass,
    ),
})).filter((group) => group.types.length > 0);

export function CreateAccountForm({
    entityId,
    onDone,
}: {
    entityId: string;
    onDone: () => void;
}) {
    const queryClient = useQueryClient();
    const [name, setName] = useState("");
    const [type, setType] = useState<AccountType>("Operating Expenses");
    const [code, setCode] = useState(NO_CODE);

    const mutation = useMutation({
        mutationFn: () =>
            createAccount({
                entityId,
                body: {
                    name: name.trim(),
                    type,
                    ...(code.trim() !== NO_CODE && { code: code.trim() }),
                },
            }),
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
            <h3 className="form-title">New account</h3>
            <label className="field">
                <span className="field-label">Name</span>
                <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Software Subscriptions"
                    maxLength={200}
                    required
                    autoFocus
                />
            </label>
            <label className="field">
                <span className="field-label">Type</span>
                <select
                    value={type}
                    onChange={(event) => {
                        const selected = ACCOUNT_TYPES.find(
                            (accountType) => accountType === event.target.value,
                        );
                        if (selected) {
                            setType(selected);
                        }
                    }}
                >
                    {TYPE_GROUPS.map((group) => (
                        <optgroup
                            key={group.accountClass}
                            label={group.accountClass}
                        >
                            {group.types.map((accountType) => (
                                <option key={accountType} value={accountType}>
                                    {accountType}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
                <span className="field-hint">
                    The type fixes the account's class, and neither can be
                    changed afterwards.
                </span>
            </label>
            <label className="field">
                <span className="field-label">Code (optional)</span>
                <input
                    type="text"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="6210"
                    maxLength={20}
                />
                <span className="field-hint">
                    Leave blank to let Kick allocate the next code in the type's
                    range. A code outside that range is rejected.
                </span>
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
                    disabled={mutation.isPending || name.trim() === ""}
                >
                    {mutation.isPending ? "Creating…" : "Create account"}
                </button>
            </div>
        </form>
    );
}
