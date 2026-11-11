import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PlatformCounterparty } from "@kick-demo/shared";
import { fetchCounterparties } from "../api/platform";
import { useDebouncedValue } from "../lib/use-debounced-value";

const RESULT_LIMIT = 20;

/**
 * A directory can hold thousands of counterparties, so instead of loading
 * them all the picker searches the listing and offers the closest matches.
 * The selection is kept as a whole row so it survives a new search.
 */
export function CounterpartyPicker({
    workspaceId,
    excludeId,
    selected,
    onSelect,
}: {
    workspaceId: string;
    excludeId: string;
    selected: PlatformCounterparty | null;
    onSelect: (counterparty: PlatformCounterparty | null) => void;
}) {
    const [searchInput, setSearchInput] = useState("");
    const search = useDebouncedValue(searchInput.trim());

    const resultsQuery = useQuery({
        queryKey: ["counterparties", workspaceId, "picker", search],
        queryFn: () =>
            fetchCounterparties({
                workspaceId,
                ...(search !== "" && { search }),
                limit: RESULT_LIMIT,
                offset: 0,
            }),
    });

    const results = (resultsQuery.data?.data ?? []).filter(
        (counterparty) => counterparty.id !== excludeId,
    );
    const options =
        selected !== null &&
        !results.some((counterparty) => counterparty.id === selected.id)
            ? [selected, ...results]
            : results;

    return (
        <>
            <input
                type="search"
                placeholder="Search by name or alias…"
                value={searchInput}
                maxLength={200}
                onChange={(event) => setSearchInput(event.target.value)}
            />
            <select
                size={6}
                value={selected?.id ?? ""}
                aria-label="Counterparty"
                onChange={(event) =>
                    onSelect(
                        options.find(
                            (counterparty) =>
                                counterparty.id === event.target.value,
                        ) ?? null,
                    )
                }
            >
                {options.map((counterparty) => (
                    <option key={counterparty.id} value={counterparty.id}>
                        {counterparty.name}
                        {counterparty.companyName !== null
                            ? ` — ${counterparty.companyName}`
                            : ""}
                        {counterparty.isGlobal ? " (global)" : ""}
                    </option>
                ))}
            </select>
            {resultsQuery.isPending && (
                <span className="field-hint">Searching…</span>
            )}
            {resultsQuery.error !== null && (
                <span className="field-error">
                    {resultsQuery.error.message}
                </span>
            )}
            {resultsQuery.data && options.length === 0 && (
                <span className="field-hint">No matching counterparties.</span>
            )}
        </>
    );
}
