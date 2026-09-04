import { ACCOUNT_TYPES, type PlatformAccountGroup } from "@kick-demo/shared";

export type AccountGroupTreeRow = {
    group: PlatformAccountGroup;
    depth: number;
};

/**
 * Groups nest via `parentGroupId` and only ever under a parent of the same
 * type, so the table shows one section per account type with the section's
 * groups flattened depth-first. The listing already arrives in display order,
 * which sibling order preserves. A parent missing from the listing would
 * orphan its subtree, so such groups are rendered as roots rather than lost.
 */
export function groupTreeRowsByType(groups: PlatformAccountGroup[]) {
    return ACCOUNT_TYPES.map((accountType) => ({
        accountType,
        rows: flattenGroupTree(
            groups.filter((group) => group.type === accountType),
        ),
    })).filter((section) => section.rows.length > 0);
}

function flattenGroupTree(
    groups: PlatformAccountGroup[],
): AccountGroupTreeRow[] {
    const groupIds = new Set(groups.map((group) => group.id));
    const childrenByParentId = new Map<string, PlatformAccountGroup[]>();
    const roots: PlatformAccountGroup[] = [];

    for (const group of groups) {
        if (group.parentGroupId !== null && groupIds.has(group.parentGroupId)) {
            const siblings = childrenByParentId.get(group.parentGroupId) ?? [];
            siblings.push(group);
            childrenByParentId.set(group.parentGroupId, siblings);
        } else {
            roots.push(group);
        }
    }

    const rows: AccountGroupTreeRow[] = [];
    const visit = (group: PlatformAccountGroup, depth: number) => {
        rows.push({ group, depth });
        for (const child of childrenByParentId.get(group.id) ?? []) {
            visit(child, depth + 1);
        }
    };
    for (const root of roots) {
        visit(root, 0);
    }
    return rows;
}

/**
 * A group can move under any group of its type except itself and its own
 * descendants — Kick rejects a cycle, so the picker never offers one.
 */
export function listEligibleParents({
    groups,
    group,
}: {
    groups: PlatformAccountGroup[];
    group: PlatformAccountGroup;
}): PlatformAccountGroup[] {
    const excludedIds = new Set([group.id]);
    let didGrow = true;
    while (didGrow) {
        didGrow = false;
        for (const candidate of groups) {
            if (
                candidate.parentGroupId !== null &&
                excludedIds.has(candidate.parentGroupId) &&
                !excludedIds.has(candidate.id)
            ) {
                excludedIds.add(candidate.id);
                didGrow = true;
            }
        }
    }
    return groups.filter(
        (candidate) =>
            candidate.type === group.type && !excludedIds.has(candidate.id),
    );
}
