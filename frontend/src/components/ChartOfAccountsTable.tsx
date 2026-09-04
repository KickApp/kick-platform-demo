import type { PlatformAccount, PlatformAccountGroup } from "@kick-demo/shared";
import { groupAccountsByClass } from "../lib/use-entity-accounts";
import { AccountRow } from "./AccountRow";

export function ChartOfAccountsTable({
    accounts,
    groups,
    entityId,
}: {
    accounts: PlatformAccount[];
    groups: PlatformAccountGroup[];
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
                        <th>Group</th>
                        <th>Status</th>
                        <th>ID</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                {groupAccountsByClass(accounts).map((group) => (
                    <tbody key={group.accountClass}>
                        <tr className="report-section-row">
                            <td colSpan={7}>{group.accountClass}</td>
                        </tr>
                        {group.accounts.map((account) => (
                            <AccountRow
                                key={account.id}
                                account={account}
                                groups={groups}
                                entityId={entityId}
                            />
                        ))}
                    </tbody>
                ))}
            </table>
        </div>
    );
}
