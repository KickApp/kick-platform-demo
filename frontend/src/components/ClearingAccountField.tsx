import type { PlatformAccount } from "@kick-demo/shared";
import { AccountOptions } from "./AccountOptions";

export const DEFAULT_CLEARING_ACCOUNT = "";

/**
 * The account the offsetting side is booked to. Kick picks one when it is
 * left out, and refuses the account the balance belongs to, so that one is
 * not offered.
 */
export function ClearingAccountField({
    accounts,
    accountId,
    value,
    onChange,
    defaultLabel,
    hint,
}: {
    accounts: PlatformAccount[];
    accountId: string;
    value: string;
    onChange: (clearingAccountId: string) => void;
    defaultLabel: string;
    hint: string;
}) {
    const candidates = accounts.filter(
        (account) => account.id !== accountId && !account.isDisabled,
    );
    return (
        <label className="field">
            <span className="field-label">Clearing account (optional)</span>
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
            >
                <AccountOptions
                    accounts={candidates}
                    emptyValue={DEFAULT_CLEARING_ACCOUNT}
                    emptyLabel={defaultLabel}
                />
            </select>
            <span className="field-hint">{hint}</span>
        </label>
    );
}
