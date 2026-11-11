import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCounterparties } from "../api/platform";
import { CounterpartyRow } from "../components/CounterpartyRow";
import { Pagination } from "../components/Pagination";
import {
    EmptyMessage,
    ErrorMessageBox,
    LoadingMessage,
} from "../components/StatusMessage";
import { useDebouncedValue } from "../lib/use-debounced-value";
import { useWorkspaceContext } from "../lib/workspace-context";

const PAGE_SIZE = 25;

/**
 * The workspace's counterparty directory: its own counterparties plus the
 * global Kick entries it uses. The Platform API has no `create`, so
 * counterparties only arrive here from Kick (manual entry in the app,
 * integrations, or detection from transactions).
 */
export function WorkspaceCounterpartiesPage() {
    const { workspaceId } = useWorkspaceContext();
    const [offset, setOffset] = useState(0);
    const [searchInput, setSearchInput] = useState("");
    const search = useDebouncedValue(searchInput.trim());
    const [includeDisabled, setIncludeDisabled] = useState(false);

    const counterpartiesQuery = useQuery({
        queryKey: [
            "counterparties",
            workspaceId,
            search,
            includeDisabled,
            offset,
        ],
        queryFn: () =>
            fetchCounterparties({
                workspaceId,
                ...(search !== "" && { search }),
                ...(includeDisabled && { includeDisabled: "true" }),
                limit: PAGE_SIZE,
                offset,
            }),
    });

    const hasFilters = searchInput !== "" || includeDisabled;

    return (
        <section>
            <div className="page-header">
                <div>
                    <h3 className="section-title">Counterparties</h3>
                    {counterpartiesQuery.data && (
                        <p className="page-meta">
                            {counterpartiesQuery.data.pagination.total} in the
                            directory,{" "}
                            {search !== ""
                                ? "closest matches first"
                                : "sorted by name"}
                        </p>
                    )}
                </div>
            </div>

            <div className="filter-bar">
                <label className="field-inline">
                    <span className="field-label">Search</span>
                    <input
                        type="search"
                        placeholder="Name or alias…"
                        value={searchInput}
                        maxLength={200}
                        onChange={(event) => {
                            setSearchInput(event.target.value);
                            setOffset(0);
                        }}
                    />
                </label>
                <label className="field-checkbox">
                    <input
                        type="checkbox"
                        checked={includeDisabled}
                        onChange={(event) => {
                            setIncludeDisabled(event.target.checked);
                            setOffset(0);
                        }}
                    />
                    Include disabled
                </label>
                {hasFilters && (
                    <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => {
                            setSearchInput("");
                            setIncludeDisabled(false);
                            setOffset(0);
                        }}
                    >
                        Clear filters
                    </button>
                )}
            </div>

            {counterpartiesQuery.isPending && (
                <LoadingMessage label="counterparties" />
            )}
            {counterpartiesQuery.error !== null && (
                <ErrorMessageBox error={counterpartiesQuery.error} />
            )}

            {counterpartiesQuery.data &&
                counterpartiesQuery.data.data.length === 0 && (
                    <EmptyMessage>
                        {hasFilters
                            ? "No counterparties match these filters."
                            : "No counterparties in this workspace yet. Kick adds them as transactions come in."}
                    </EmptyMessage>
                )}

            {counterpartiesQuery.data &&
                counterpartiesQuery.data.data.length > 0 && (
                    <div className="card table-card">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Company</th>
                                    <th>Source</th>
                                    <th>Owner</th>
                                    <th>Treated as</th>
                                    <th>1099</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {counterpartiesQuery.data.data.map(
                                    (counterparty) => (
                                        <CounterpartyRow
                                            key={counterparty.id}
                                            counterparty={counterparty}
                                        />
                                    ),
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

            {counterpartiesQuery.data && (
                <Pagination
                    pagination={counterpartiesQuery.data.pagination}
                    onOffsetChange={setOffset}
                />
            )}
        </section>
    );
}
