import type { PlatformAccount, PlatformAccountGroup } from "@kick-demo/shared";
import {
    groupTreeRowsByType,
    listEligibleParents,
} from "../lib/account-groups";
import { AccountGroupRow } from "./AccountGroupRow";

/**
 * One section per account type, with the section's groups flattened
 * depth-first and indented by nesting level, the way the chart displays them.
 */
export function AccountGroupsTable({
    groups,
    accounts,
    entityId,
}: {
    groups: PlatformAccountGroup[];
    accounts: PlatformAccount[];
    entityId: string;
}) {
    const accountCountByGroupId = new Map<string, number>();
    for (const account of accounts) {
        if (account.groupId !== null) {
            accountCountByGroupId.set(
                account.groupId,
                (accountCountByGroupId.get(account.groupId) ?? 0) + 1,
            );
        }
    }

    return (
        <div className="card table-card">
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Parent</th>
                        <th>Accounts</th>
                        <th>ID</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                {groupTreeRowsByType(groups).map((section) => (
                    <tbody key={section.accountType}>
                        <tr className="report-section-row">
                            <td colSpan={5}>{section.accountType}</td>
                        </tr>
                        {section.rows.map(({ group, depth }) => (
                            <AccountGroupRow
                                key={group.id}
                                group={group}
                                entityId={entityId}
                                depth={depth}
                                accountCount={
                                    accountCountByGroupId.get(group.id) ?? 0
                                }
                                eligibleParents={listEligibleParents({
                                    groups,
                                    group,
                                })}
                            />
                        ))}
                    </tbody>
                ))}
            </table>
        </div>
    );
}
