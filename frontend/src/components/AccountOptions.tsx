import type { PlatformAccount } from "@kick-demo/shared";
import {
    formatAccountLabel,
    groupAccountsByClass,
} from "../lib/use-entity-accounts";

/** `<option>`s for an account `<select>`, grouped by class like the chart. */
export function AccountOptions({
    accounts,
    emptyValue,
    emptyLabel,
}: {
    accounts: PlatformAccount[];
    emptyValue: string;
    emptyLabel: string;
}) {
    return (
        <>
            <option value={emptyValue}>{emptyLabel}</option>
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
