import type { ChangeEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    fetchAllAccountGroups,
    fetchAllChartOfAccounts,
} from "../../api/platform";
import { groupTreeRowsByType } from "../../lib/account-groups";
import {
    formatAccountLabel,
    groupAccountsByClass,
} from "../../lib/use-entity-accounts";
import { ErrorMessageBox } from "../StatusMessage";

export type GeneralLedgerSelection = {
    accountIds: string[];
    groupIds: string[];
};

export const EMPTY_GENERAL_LEDGER_SELECTION: GeneralLedgerSelection = {
    accountIds: [],
    groupIds: [],
};

function selectedValues(event: ChangeEvent<HTMLSelectElement>): string[] {
    return Array.from(event.target.selectedOptions, (option) => option.value);
}

/**
 * Narrows the general ledger to accounts and/or account groups of one entity.
 * Kick OR-s the two lists, so picking a group plus an account outside it adds
 * that account rather than intersecting.
 */
export function GeneralLedgerFilters({
    entityId,
    selection,
    onChange,
}: {
    entityId: string;
    selection: GeneralLedgerSelection;
    onChange: (selection: GeneralLedgerSelection) => void;
}) {
    const accountsQuery = useQuery({
        queryKey: ["chart-of-accounts", entityId],
        queryFn: () => fetchAllChartOfAccounts(entityId),
        enabled: entityId !== "",
    });
    const groupsQuery = useQuery({
        queryKey: ["account-groups", entityId],
        queryFn: () => fetchAllAccountGroups(entityId),
        enabled: entityId !== "",
    });

    const error = accountsQuery.error ?? groupsQuery.error;
    if (error !== null) {
        return <ErrorMessageBox error={error} />;
    }

    const hasSelection =
        selection.accountIds.length > 0 || selection.groupIds.length > 0;

    return (
        <div className="filter-bar">
            <label className="field-inline">
                <span className="field-label">Accounts</span>
                <select
                    multiple
                    size={8}
                    disabled={accountsQuery.isPending}
                    value={selection.accountIds}
                    onChange={(event) =>
                        onChange({
                            ...selection,
                            accountIds: selectedValues(event),
                        })
                    }
                >
                    {groupAccountsByClass(accountsQuery.data ?? []).map(
                        (group) => (
                            <optgroup
                                key={group.accountClass}
                                label={group.accountClass}
                            >
                                {group.accounts.map((account) => (
                                    <option key={account.id} value={account.id}>
                                        {formatAccountLabel(account)}
                                    </option>
                                ))}
                            </optgroup>
                        ),
                    )}
                </select>
            </label>
            <label className="field-inline">
                <span className="field-label">Account groups</span>
                <select
                    multiple
                    size={8}
                    disabled={groupsQuery.isPending}
                    value={selection.groupIds}
                    onChange={(event) =>
                        onChange({
                            ...selection,
                            groupIds: selectedValues(event),
                        })
                    }
                >
                    {groupTreeRowsByType(groupsQuery.data ?? []).map(
                        (section) => (
                            <optgroup
                                key={section.accountType}
                                label={section.accountType}
                            >
                                {section.rows.map(({ group, depth }) => (
                                    <option key={group.id} value={group.id}>
                                        {`${"\u00a0\u00a0\u00a0".repeat(depth)}${group.name}`}
                                    </option>
                                ))}
                            </optgroup>
                        ),
                    )}
                </select>
            </label>
            <div>
                <button
                    type="button"
                    className="button button-secondary"
                    disabled={!hasSelection}
                    onClick={() => onChange(EMPTY_GENERAL_LEDGER_SELECTION)}
                >
                    Clear filters
                </button>
                <span className="field-hint">
                    Ctrl/Cmd-click to pick several. An account is shown when it
                    matches either list; a group includes its subgroups.
                    <br />
                    Nothing selected shows every account.
                </span>
            </div>
        </div>
    );
}
