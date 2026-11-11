import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    COUNTERPARTY_DIRECTION_OVERRIDES,
    COUNTERPARTY_DIRECTION_OVERRIDE_LABELS,
    COUNTERPARTY_NOTE_MAX_LENGTH,
    COUNTERPARTY_TEXT_MAX_LENGTH,
    counterpartyDirectionOverrideSchema,
    FEDERAL_TAX_CLASSIFICATIONS,
    FEDERAL_TAX_CLASSIFICATION_LABELS,
    federalTaxClassificationSchema,
    type PlatformCounterparty,
    type PlatformCounterpartyUpdateBody,
} from "@kick-demo/shared";
import { updateCounterparty } from "../api/platform";
import { ErrorMessageBox } from "./StatusMessage";

const TEXT_FIELDS = [
    "companyName",
    "email",
    "phoneNumber",
    "website",
    "street",
    "street2",
    "city",
    "state",
    "postalCode",
    "country",
    "note",
] as const;

type TextField = (typeof TEXT_FIELDS)[number];

type Draft = Record<TextField | "name", string> & {
    directionOverride: string;
    isEligible1099: string;
    federalTaxClassification: string;
};

function toDraft(counterparty: PlatformCounterparty): Draft {
    return {
        name: counterparty.name,
        companyName: counterparty.companyName ?? "",
        email: counterparty.email ?? "",
        phoneNumber: counterparty.phoneNumber ?? "",
        website: counterparty.website ?? "",
        street: counterparty.street ?? "",
        street2: counterparty.street2 ?? "",
        city: counterparty.city ?? "",
        state: counterparty.state ?? "",
        postalCode: counterparty.postalCode ?? "",
        country: counterparty.country ?? "",
        note: counterparty.note ?? "",
        directionOverride: counterparty.directionOverride ?? "",
        isEligible1099:
            counterparty.isEligible1099 === null
                ? ""
                : String(counterparty.isEligible1099),
        federalTaxClassification: counterparty.federalTaxClassification ?? "",
    };
}

function parseEligible1099(value: string): boolean | null {
    if (value === "") {
        return null;
    }
    return value === "true";
}

/**
 * Only the fields that changed go out, so saving never rewrites a field
 * someone else changed in Kick meanwhile. An empty input or "Not set" option
 * clears the field with `null`.
 */
function toUpdateBody(
    counterparty: PlatformCounterparty,
    draft: Draft,
): PlatformCounterpartyUpdateBody {
    const body: PlatformCounterpartyUpdateBody = {};
    const name = draft.name.trim();
    if (name !== counterparty.name) {
        body.name = name;
    }
    for (const field of TEXT_FIELDS) {
        const value = draft[field].trim();
        const next = value !== "" ? value : null;
        if (next !== counterparty[field]) {
            body[field] = next;
        }
    }
    const directionOverride = counterpartyDirectionOverrideSchema.safeParse(
        draft.directionOverride,
    );
    const nextDirectionOverride = directionOverride.success
        ? directionOverride.data
        : null;
    if (nextDirectionOverride !== counterparty.directionOverride) {
        body.directionOverride = nextDirectionOverride;
    }
    const isEligible1099 = parseEligible1099(draft.isEligible1099);
    if (isEligible1099 !== counterparty.isEligible1099) {
        body.isEligible1099 = isEligible1099;
    }
    const federalTaxClassification = federalTaxClassificationSchema.safeParse(
        draft.federalTaxClassification,
    );
    const nextFederalTaxClassification = federalTaxClassification.success
        ? federalTaxClassification.data
        : null;
    if (
        nextFederalTaxClassification !== counterparty.federalTaxClassification
    ) {
        body.federalTaxClassification = nextFederalTaxClassification;
    }
    return body;
}

const FIELD_LABELS: Record<TextField, string> = {
    companyName: "Company name",
    email: "Email",
    phoneNumber: "Phone number",
    website: "Website",
    street: "Street",
    street2: "Street (line 2)",
    city: "City",
    state: "State",
    postalCode: "Postal code",
    country: "Country",
    note: "Note",
};

const CONTACT_FIELDS = [
    "companyName",
    "email",
    "phoneNumber",
    "website",
] as const;

const ADDRESS_FIELDS = [
    "street",
    "street2",
    "city",
    "state",
    "postalCode",
    "country",
] as const;

/**
 * Every field the Platform API lets a partner write on a counterparty. Global
 * counterparties are shared Kick directory entries that the API refuses to
 * update, so the form is shown read-only for them.
 */
export function CounterpartyForm({
    workspaceId,
    counterparty,
}: {
    workspaceId: string;
    counterparty: PlatformCounterparty;
}) {
    const queryClient = useQueryClient();
    const [draft, setDraft] = useState<Draft>(() => toDraft(counterparty));
    const isReadOnly = counterparty.isGlobal;
    const body = toUpdateBody(counterparty, draft);
    const hasChanges = Object.keys(body).length > 0;

    const mutation = useMutation({
        mutationFn: () =>
            updateCounterparty({
                workspaceId,
                counterpartyId: counterparty.id,
                body,
            }),
        onSuccess: async (updated) => {
            queryClient.setQueryData(
                ["counterparty", workspaceId, counterparty.id],
                updated,
            );
            setDraft(toDraft(updated));
            await queryClient.invalidateQueries({
                queryKey: ["counterparties", workspaceId],
            });
        },
    });

    const textInput = (field: TextField) => (
        <label className="field" key={field}>
            <span className="field-label">{FIELD_LABELS[field]}</span>
            <input
                type={field === "email" ? "email" : "text"}
                value={draft[field]}
                maxLength={COUNTERPARTY_TEXT_MAX_LENGTH}
                onChange={(event) =>
                    setDraft({ ...draft, [field]: event.target.value })
                }
            />
        </label>
    );

    return (
        <form
            className="card form-card form-card-wide"
            onSubmit={(event) => {
                event.preventDefault();
                if (hasChanges) {
                    mutation.mutate();
                }
            }}
        >
            <h3 className="form-title">Details</h3>
            <fieldset className="form-fieldset" disabled={isReadOnly}>
                <label className="field">
                    <span className="field-label">Name</span>
                    <input
                        type="text"
                        value={draft.name}
                        maxLength={COUNTERPARTY_TEXT_MAX_LENGTH}
                        required
                        onChange={(event) =>
                            setDraft({ ...draft, name: event.target.value })
                        }
                    />
                    <span className="field-hint">
                        Unique within the workspace.
                    </span>
                </label>

                <h4 className="form-section-title">Contact</h4>
                <div className="field-grid">
                    {CONTACT_FIELDS.map(textInput)}
                </div>

                <h4 className="form-section-title">Address</h4>
                <div className="field-grid">
                    {ADDRESS_FIELDS.map(textInput)}
                </div>

                <h4 className="form-section-title">Tax and classification</h4>
                <div className="field-grid">
                    <label className="field">
                        <span className="field-label">Treated as</span>
                        <select
                            value={draft.directionOverride}
                            onChange={(event) =>
                                setDraft({
                                    ...draft,
                                    directionOverride: event.target.value,
                                })
                            }
                        >
                            <option value="">Inferred by Kick</option>
                            {COUNTERPARTY_DIRECTION_OVERRIDES.map((each) => (
                                <option key={each} value={each}>
                                    {
                                        COUNTERPARTY_DIRECTION_OVERRIDE_LABELS[
                                            each
                                        ]
                                    }
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="field">
                        <span className="field-label">1099 eligible</span>
                        <select
                            value={draft.isEligible1099}
                            onChange={(event) =>
                                setDraft({
                                    ...draft,
                                    isEligible1099: event.target.value,
                                })
                            }
                        >
                            <option value="">Not decided</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                        </select>
                    </label>
                    <label className="field">
                        <span className="field-label">
                            Federal tax classification
                        </span>
                        <select
                            value={draft.federalTaxClassification}
                            onChange={(event) =>
                                setDraft({
                                    ...draft,
                                    federalTaxClassification:
                                        event.target.value,
                                })
                            }
                        >
                            <option value="">Not set</option>
                            {FEDERAL_TAX_CLASSIFICATIONS.map((each) => (
                                <option key={each} value={each}>
                                    {FEDERAL_TAX_CLASSIFICATION_LABELS[each]}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <label className="field">
                    <span className="field-label">{FIELD_LABELS.note}</span>
                    <textarea
                        rows={4}
                        value={draft.note}
                        maxLength={COUNTERPARTY_NOTE_MAX_LENGTH}
                        onChange={(event) =>
                            setDraft({ ...draft, note: event.target.value })
                        }
                    />
                    <span className="field-hint">
                        Plain text; Kick rejects HTML tags.
                    </span>
                </label>
            </fieldset>

            {mutation.error !== null && (
                <ErrorMessageBox error={mutation.error} />
            )}
            {!isReadOnly && (
                <div className="form-actions">
                    <button
                        type="button"
                        className="button button-secondary"
                        disabled={!hasChanges || mutation.isPending}
                        onClick={() => {
                            mutation.reset();
                            setDraft(toDraft(counterparty));
                        }}
                    >
                        Discard changes
                    </button>
                    <button
                        type="submit"
                        className="button button-primary"
                        disabled={
                            !hasChanges ||
                            mutation.isPending ||
                            draft.name.trim() === ""
                        }
                    >
                        {mutation.isPending ? "Saving…" : "Save changes"}
                    </button>
                </div>
            )}
        </form>
    );
}
