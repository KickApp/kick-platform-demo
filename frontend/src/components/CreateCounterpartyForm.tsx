import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import {
    COUNTERPARTY_DIRECTION_OVERRIDES,
    COUNTERPARTY_DIRECTION_OVERRIDE_LABELS,
    COUNTERPARTY_TEXT_MAX_LENGTH,
    counterpartyDirectionOverrideSchema,
    type PlatformCounterpartyCreateBody,
} from "@kick-demo/shared";
import { createCounterparty } from "../api/platform";
import type { CounterpartyNotice } from "../lib/counterparty-notice";
import { ErrorMessageBox } from "./StatusMessage";

function toCreateBody({
    name,
    companyName,
    email,
    directionOverride,
}: {
    name: string;
    companyName: string;
    email: string;
    directionOverride: string;
}): PlatformCounterpartyCreateBody {
    const parsedDirectionOverride =
        counterpartyDirectionOverrideSchema.safeParse(directionOverride);
    return {
        name: name.trim(),
        ...(companyName.trim() !== "" && { companyName: companyName.trim() }),
        ...(email.trim() !== "" && { email: email.trim() }),
        ...(parsedDirectionOverride.success && {
            directionOverride: parsedDirectionOverride.data,
        }),
    };
}

/**
 * Asks only for what identifies a counterparty; every other field is on its
 * page, where the form lands after creating. Only fields actually filled in
 * are sent, because Kick reuses a global directory entry only when every
 * field passed matches it.
 */
export function CreateCounterpartyForm({
    workspaceId,
    onDone,
}: {
    workspaceId: string;
    onDone: () => void;
}) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [email, setEmail] = useState("");
    const [directionOverride, setDirectionOverride] = useState("");

    const mutation = useMutation({
        mutationFn: () =>
            createCounterparty({
                workspaceId,
                body: toCreateBody({
                    name,
                    companyName,
                    email,
                    directionOverride,
                }),
            }),
        onSuccess: async ({ counterparty, isNew }) => {
            queryClient.setQueryData(
                ["counterparty", workspaceId, counterparty.id],
                counterparty,
            );
            await queryClient.invalidateQueries({
                queryKey: ["counterparties", workspaceId],
            });
            const counterpartyNotice: CounterpartyNotice = isNew
                ? "created"
                : counterparty.isGlobal
                  ? "reused_global"
                  : "reused_existing";
            await navigate(counterparty.id, {
                state: { counterpartyNotice },
            });
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
            <h3 className="form-title">Create counterparty</h3>
            <label className="field">
                <span className="field-label">Name</span>
                <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Acme Supplies"
                    maxLength={COUNTERPARTY_TEXT_MAX_LENGTH}
                    required
                    autoFocus
                />
                <span className="field-hint">
                    Unique within the workspace. Kick matches it against the
                    global directory and the counterparties it has detected from
                    transactions.
                </span>
            </label>
            <label className="field">
                <span className="field-label">Company name (optional)</span>
                <input
                    type="text"
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                    maxLength={COUNTERPARTY_TEXT_MAX_LENGTH}
                />
            </label>
            <label className="field">
                <span className="field-label">Email (optional)</span>
                <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    maxLength={COUNTERPARTY_TEXT_MAX_LENGTH}
                />
            </label>
            <label className="field">
                <span className="field-label">Treated as</span>
                <select
                    value={directionOverride}
                    onChange={(event) =>
                        setDirectionOverride(event.target.value)
                    }
                >
                    <option value="">Inferred by Kick</option>
                    {COUNTERPARTY_DIRECTION_OVERRIDES.map((each) => (
                        <option key={each} value={each}>
                            {COUNTERPARTY_DIRECTION_OVERRIDE_LABELS[each]}
                        </option>
                    ))}
                </select>
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
                    {mutation.isPending ? "Creating…" : "Create counterparty"}
                </button>
            </div>
        </form>
    );
}
