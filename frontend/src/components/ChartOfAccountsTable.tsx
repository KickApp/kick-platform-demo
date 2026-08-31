import type { PlatformAccount } from "@kick-demo/shared";
import { groupAccountsByClass } from "../lib/use-entity-accounts";
import { AccountRow } from "./AccountRow";

export function ChartOfAccountsTable({
    accounts,
    entityId,
}: {
    accounts: PlatformAccount[];
    entityId: string;
}) {
    return (
        <div className="card table-card">
            <table>
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>ID</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                {groupAccountsByClass(accounts).map((group) => (
                    <tbody key={group.accountClass}>
                        <tr className="report-section-row">
                            <td colSpan={6}>{group.accountClass}</td>
                        </tr>
                        {group.accounts.map((account) => (
                            <AccountRow
                                key={account.id}
                                account={account}
                                entityId={entityId}
                            />
                        ))}
                    </tbody>
                ))}
            </table>
        </div>
    );
}
