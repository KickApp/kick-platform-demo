import {
    FINANCIAL_ACCOUNT_SYNC_ERROR_CODE_LABELS,
    FINANCIAL_ACCOUNT_SYNC_STATUS_LABELS,
    type FinancialAccountSyncStatus,
    type PlatformFinancialAccount,
} from "@kick-demo/shared";
import { formatDateTime } from "../lib/format";

const SYNC_STATUS_BADGE_CLASS: Record<FinancialAccountSyncStatus, string> = {
    healthy: "badge badge-success",
    error: "badge badge-danger",
    not_connected: "badge",
};

/**
 * Kick rolls the sync state up across every connection feeding the account,
 * so one broken connection next to a working one still reads as healthy. The
 * account's own `disabled` flag is independent of that: it turns syncing off
 * whatever the connections' health.
 */
export function FinancialAccountSyncCell({
    account,
}: {
    account: PlatformFinancialAccount;
}) {
    return (
        <div className="cell-editable">
            <div>
                <span className={SYNC_STATUS_BADGE_CLASS[account.syncStatus]}>
                    {FINANCIAL_ACCOUNT_SYNC_STATUS_LABELS[account.syncStatus]}
                </span>
                {account.disabled && (
                    <>
                        {" "}
                        <span
                            className="badge"
                            title="Syncing new transactions is turned off"
                        >
                            Sync off
                        </span>
                    </>
                )}
            </div>
            {account.syncErrorCode !== null && (
                <span className="cell-error">
                    {
                        FINANCIAL_ACCOUNT_SYNC_ERROR_CODE_LABELS[
                            account.syncErrorCode
                        ]
                    }
                </span>
            )}
            <span className="page-meta">
                {account.transactionsSyncedAt !== null
                    ? `Transactions synced ${formatDateTime(account.transactionsSyncedAt)}`
                    : "Transactions never synced"}
            </span>
        </div>
    );
}
