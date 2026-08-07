import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ENTITY_LEGAL_TYPES,
    ENTITY_LEGAL_TYPE_LABELS,
    type EntityLegalType,
} from "@kick-demo/shared";
import { createEntity } from "../api/platform";
import { previousYearStartIsoDate } from "../lib/format";
import { ErrorMessageBox } from "./StatusMessage";

export function CreateEntityForm({
    workspaceId,
    onDone,
}: {
    workspaceId: string;
    onDone: () => void;
}) {
    const queryClient = useQueryClient();
    const [name, setName] = useState("");
    const [legalType, setLegalType] = useState<EntityLegalType>("smllc");
    const [bookkeepingStartDate, setBookkeepingStartDate] = useState(
        previousYearStartIsoDate(),
    );

    const mutation = useMutation({
        mutationFn: createEntity,
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ["entities", workspaceId],
            });
            onDone();
        },
    });

    return (
        <form
            className="card form-card"
            onSubmit={(event) => {
                event.preventDefault();
                mutation.mutate({
                    workspaceId,
                    name: name.trim(),
                    legalType,
                    bookkeepingStartDate,
                });
            }}
        >
            <h3 className="form-title">New entity</h3>
            <label className="field">
                <span className="field-label">Name</span>
                <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Acme Consulting LLC"
                    maxLength={200}
                    required
                    autoFocus
                />
            </label>
            <label className="field">
                <span className="field-label">Legal type</span>
                <select
                    value={legalType}
                    onChange={(event) => {
                        const selected = ENTITY_LEGAL_TYPES.find(
                            (type) => type === event.target.value,
                        );
                        if (selected) {
                            setLegalType(selected);
                        }
                    }}
                >
                    {ENTITY_LEGAL_TYPES.map((type) => (
                        <option key={type} value={type}>
                            {ENTITY_LEGAL_TYPE_LABELS[type]}
                        </option>
                    ))}
                </select>
            </label>
            <label className="field">
                <span className="field-label">Bookkeeping start date</span>
                <input
                    type="date"
                    value={bookkeepingStartDate}
                    onChange={(event) =>
                        setBookkeepingStartDate(event.target.value)
                    }
                    required
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
                    disabled={mutation.isPending || name.trim() === ""}
                >
                    {mutation.isPending ? "Creating…" : "Create entity"}
                </button>
            </div>
        </form>
    );
}
