import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PlatformAccountingMigration } from "@kick-demo/shared";
import {
    fetchAccountingMigration,
    fetchAllChartOfAccounts,
    fetchJournalEntries,
} from "../api/platform";
import { AccountingMigrationForm } from "../components/AccountingMigrationForm";
import { JournalEntriesTable } from "../components/JournalEntriesTable";
import {
    EmptyMessage,
    ErrorMessageBox,
    LoadingMessage,
} from "../components/StatusMessage";
import { formatDateTime } from "../lib/format";
import { useWorkspaceEntities } from "../lib/use-workspace-entities";
import { useWorkspaceContext } from "../lib/workspace-context";

const JOURNAL_ENTRIES_PAGE_LIMIT = 100;
const RULES_POLL_INTERVAL_MS = 5000;

/**
 * Rule generation runs asynchronously upstream, so a migration whose
 * `enrichmentRulesSeededAt` is still null is polled until it flips.
 */
function pollInterval(
    migration: PlatformAccountingMigration | null | undefined,
): number | false {
    if (migration === null || migration === undefined) {
        return false;
    }
    return migration.enrichmentRulesSeededAt === null
        ? RULES_POLL_INTERVAL_MS
        : false;
}

function MigrationStatusCard({
    migration,
}: {
    migration: PlatformAccountingMigration;
}) {
    const isSeeded = migration.enrichmentRulesSeededAt !== null;
    return (
        <div className="card connection-card">
            <div className="connection-header">
                <div>
                    <h4 className="connection-title">Accounting migration</h4>
                    <p className="page-meta mono">{migration.id}</p>
                    <p className="page-meta">
                        Started {formatDateTime(migration.createdAt)}
                    </p>
                </div>
                <span className="badge">
                    {isSeeded ? "Rules generated" : "Generating rules…"}
                </span>
            </div>
            <p className="page-meta">
                {migration.enrichmentRulesSeededAt !== null
                    ? `Transaction rules were generated from the migrated history ` +
                      `${formatDateTime(migration.enrichmentRulesSeededAt)}; automatic ` +
                      "transaction enrichment has resumed."
                    : "Transaction-rule generation is queued. Automatic transaction " +
                      "enrichment stays paused until it completes; this page polls " +
                      "until the rules are seeded."}
            </p>
        </div>
    );
}

/**
 * An entity keeps at most one accounting migration, so the tab picks one
 * entity the way the reports tab does. The form drives the BFF's orchestration
 * route (start migration → bulk-create historical journal entries → queue rule
 * generation); the status card and the manual journal entry listing read the
 * mirrored Platform API routes.
 */
export function WorkspaceAccountingMigrationPage() {
    const { workspaceId } = useWorkspaceContext();
    const entities = useWorkspaceEntities(workspaceId);
    const [selectedEntityId, setSelectedEntityId] = useState("");
    const [isFormOpen, setIsFormOpen] = useState(false);

    const entityId =
        selectedEntityId !== ""
            ? selectedEntityId
            : (entities.entities[0]?.id ?? "");
    const entity = entities.entities.find((each) => each.id === entityId);

    const migrationQuery = useQuery({
        queryKey: ["accounting-migration", entityId],
        queryFn: () => fetchAccountingMigration(entityId),
        enabled: entityId !== "",
        refetchInterval: (query) => pollInterval(query.state.data),
    });

    const accountsQuery = useQuery({
        queryKey: ["chart-of-accounts", entityId],
        queryFn: () => fetchAllChartOfAccounts(entityId),
        enabled: entityId !== "",
    });

    const journalEntriesQuery = useQuery({
        queryKey: ["journal-entries", entityId],
        queryFn: () =>
            fetchJournalEntries({
                entityId,
                ledgerBasis: "cash",
                limit: JOURNAL_ENTRIES_PAGE_LIMIT,
                offset: 0,
            }),
        enabled: entityId !== "",
    });

    if (entities.isPending) {
        return <LoadingMessage label="entities" />;
    }

    if (entities.error !== null) {
        return <ErrorMessageBox error={entities.error} />;
    }

    if (entities.entities.length === 0) {
        return (
            <EmptyMessage>
                This workspace has no entities yet, and an accounting migration
                always belongs to one.
            </EmptyMessage>
        );
    }

    const migration = migrationQuery.data ?? null;
    // Once the rules are seeded the migration is finished — re-running would
    // only earn a 409 from the generation route, so the form goes away.
    const isMigrationComplete =
        migration !== null && migration.enrichmentRulesSeededAt !== null;

    return (
        <section>
            <div className="page-header">
                <div>
                    <h3 className="section-title">Accounting migration</h3>
                    <p className="page-meta">
                        Bring an entity's historical books into Kick: push the
                        old journal entries, then let Kick generate transaction
                        categorization rules from them.
                    </p>
                </div>
                {!isFormOpen &&
                    !isMigrationComplete &&
                    migrationQuery.isSuccess && (
                        <button
                            type="button"
                            className="button button-primary"
                            onClick={() => setIsFormOpen(true)}
                        >
                            Migrate historical books
                        </button>
                    )}
            </div>

            <div className="filter-bar">
                <label className="field-inline">
                    <span className="field-label">Entity</span>
                    <select
                        value={entityId}
                        onChange={(event) => {
                            setSelectedEntityId(event.target.value);
                            setIsFormOpen(false);
                        }}
                    >
                        {entities.entities.map((each) => (
                            <option key={each.id} value={each.id}>
                                {each.name ?? each.id}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            {migrationQuery.isPending && (
                <LoadingMessage label="accounting migration" />
            )}
            {migrationQuery.error !== null && (
                <ErrorMessageBox error={migrationQuery.error} />
            )}

            {migration !== null && (
                <MigrationStatusCard migration={migration} />
            )}
            {migration === null && migrationQuery.isSuccess && !isFormOpen && (
                <EmptyMessage>
                    This entity has no accounting migration yet. Start one to
                    push its historical journal entries and seed categorization
                    rules from them.
                </EmptyMessage>
            )}

            {isFormOpen && entity !== undefined && (
                <AccountingMigrationForm
                    entityId={entityId}
                    bookkeepingStartDate={entity.bookkeepingStartDate}
                    accounts={accountsQuery.data ?? []}
                    onDone={() => setIsFormOpen(false)}
                />
            )}

            <div className="page-header">
                <div>
                    <h3 className="section-title">Manual journal entries</h3>
                    <p className="page-meta">
                        The entity's manual journal entries on the cash ledger —
                        migrated history shows up here.
                    </p>
                </div>
            </div>
            {journalEntriesQuery.isPending && (
                <LoadingMessage label="journal entries" />
            )}
            {journalEntriesQuery.error !== null && (
                <ErrorMessageBox error={journalEntriesQuery.error} />
            )}
            {journalEntriesQuery.data !== undefined &&
                (journalEntriesQuery.data.data.length === 0 ? (
                    <EmptyMessage>
                        This entity has no manual journal entries yet.
                    </EmptyMessage>
                ) : (
                    <JournalEntriesTable
                        journalEntries={journalEntriesQuery.data.data}
                    />
                ))}
        </section>
    );
}
