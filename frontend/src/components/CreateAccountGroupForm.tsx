import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ACCOUNT_CLASSES,
    ACCOUNT_TYPE_CLASSES,
    ACCOUNT_TYPES,
    type AccountType,
    type PlatformAccountGroup,
} from "@kick-demo/shared";
import { createAccountGroup } from "../api/platform";
import { ErrorMessageBox } from "./StatusMessage";

const TOP_LEVEL = "";

const TYPE_GROUPS = ACCOUNT_CLASSES.map((accountClass) => ({
    accountClass,
    types: ACCOUNT_TYPES.filter(
        (type) => ACCOUNT_TYPE_CLASSES[type] === accountClass,
    ),
})).filter((group) => group.types.length > 0);

export function CreateAccountGroupForm({
    entityId,
    groups,
    onDone,
}: {
    entityId: string;
    groups: PlatformAccountGroup[];
    onDone: () => void;
}) {
    const queryClient = useQueryClient();
    const [name, setName] = useState("");
    const [type, setType] = useState<AccountType>("Operating Expenses");
    const [parentGroupId, setParentGroupId] = useState(TOP_LEVEL);

    // A group only ever nests under a parent of its own type, so switching
    // the type resets the parent picker along with its options.
    const eligibleParents = groups.filter((group) => group.type === type);

    const mutation = useMutation({
        mutationFn: () =>
            createAccountGroup({
                entityId,
                body: {
                    name: name.trim(),
                    type,
                    ...(parentGroupId !== TOP_LEVEL && { parentGroupId }),
                },
            }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ["account-groups", entityId],
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
            <h3 className="form-title">New account group</h3>
            <label className="field">
                <span className="field-label">Name</span>
                <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Marketing"
                    maxLength={80}
                    required
                    autoFocus
                />
                <span className="field-hint">
                    Names must be unique among siblings of the same type.
                </span>
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
                            setParentGroupId(TOP_LEVEL);
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
                    Only accounts of this type can be placed in the group, and
                    the type cannot be changed afterwards.
                </span>
            </label>
            <label className="field">
                <span className="field-label">Parent group (optional)</span>
                <select
                    value={parentGroupId}
                    onChange={(event) => setParentGroupId(event.target.value)}
                    disabled={eligibleParents.length === 0}
                >
                    <option value={TOP_LEVEL}>Top level</option>
                    {eligibleParents.map((group) => (
                        <option key={group.id} value={group.id}>
                            {group.name}
                        </option>
                    ))}
                </select>
                <span className="field-hint">
                    The parent must share the group's type; leave on top level
                    to start a new branch.
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
                    {mutation.isPending ? "Creating…" : "Create group"}
                </button>
            </div>
        </form>
    );
}
