import type {
    PlatformAccount,
    PlatformAccountOpeningBalance,
} from "@kick-demo/shared";
import { groupAccountsByClass } from "../lib/use-entity-accounts";
import { OpeningBalanceRow } from "./OpeningBalanceRow";

/**
 * The opening balance listing only carries accounts that have something, so
 * the table walks the chart instead and joins each account's state onto it —
 * which is also what lets an account without a balance yet get one.
 */
export function OpeningBalancesTable({
    accounts,
    openingBalances,
    showAccountsWithoutBalance,
    entityId,
    bookkeepingStartDate,
}: {
    accounts: PlatformAccount[];
    openingBalances: PlatformAccountOpeningBalance[];
    showAccountsWithoutBalance: boolean;
    entityId: string;
    bookkeepingStartDate: string;
}) {
    const byAccountId = new Map(
        openingBalances.map((each) => [each.accountId, each]),
    );
    const shownAccounts = accounts.filter(
        (account) =>
            byAccountId.has(account.id) ||
            (showAccountsWithoutBalance && !account.isDisabled),
    );

    return (
        <div className="card table-card">
            <table>
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Account</th>
                        <th className="amount">Opening balance</th>
                        <th className="amount">Adjustment</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                {groupAccountsByClass(shownAccounts).map((group) => (
                    <tbody key={group.accountClass}>
                        <tr className="report-section-row">
                            <td colSpan={5}>{group.accountClass}</td>
                        </tr>
                        {group.accounts.map((account) => (
                            <OpeningBalanceRow
                                key={account.id}
                                account={account}
                                accounts={accounts}
                                openingBalance={byAccountId.get(account.id)}
                                entityId={entityId}
                                bookkeepingStartDate={bookkeepingStartDate}
                            />
                        ))}
                    </tbody>
                ))}
            </table>
        </div>
    );
}
