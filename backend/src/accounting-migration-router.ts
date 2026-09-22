import { initServer } from "@ts-rest/express";
import {
    accountingMigrationRunContract,
    type PlatformAccountingMigration,
} from "@kick-demo/shared";
import { forwardUpstreamError, kickClient } from "./kick-client";

const s = initServer();

/**
 * The partner half of an accounting migration, orchestrated server-side so the
 * form makes one request: start the migration, push the historical journal
 * entries atomically, then finalize by queuing transaction-rule generation.
 * Rule generation runs asynchronously upstream — the caller polls the mirrored
 * `GET /platform/v1/entities/:entityId/accounting-migration` until
 * `enrichmentRulesSeededAt` flips.
 */
export const accountingMigrationRunRouter = s.router(
    accountingMigrationRunContract,
    {
        run: async ({ body }) => {
            const params = { entityId: body.entityId };

            // A 409 on create can mean the entity already has a migration (a
            // retry after a partial failure should continue with it) or that
            // it has opening balances (no migration exists). Reading the
            // resource tells the two apart; the original 409 is forwarded when
            // there is nothing to continue with.
            let accountingMigration: PlatformAccountingMigration;
            const created = await kickClient.accountingMigration.create({
                params,
            });
            if (created.status === 201) {
                accountingMigration = created.body.accountingMigration;
            } else if (created.status === 409) {
                const existing = await kickClient.accountingMigration.get({
                    params,
                });
                if (existing.status !== 200) {
                    return forwardUpstreamError(created);
                }
                accountingMigration = existing.body.accountingMigration;
            } else {
                return forwardUpstreamError(created);
            }

            // Atomic upstream: a batch that fails validation creates nothing,
            // so a failure here leaves only the (reusable) migration behind.
            const createdEntries = await kickClient.journalEntries.bulkCreate({
                params,
                body: { journalEntries: body.journalEntries },
            });
            if (createdEntries.status !== 201) {
                return forwardUpstreamError(createdEntries);
            }

            const finalized =
                await kickClient.accountingMigration.generateTransactionRules({
                    params,
                });
            if (finalized.status === 202) {
                return {
                    status: 201 as const,
                    body: {
                        accountingMigration: finalized.body.accountingMigration,
                        journalEntries: createdEntries.body.data,
                    },
                };
            }
            // 422 (workspace not eligible for rule generation) is undeclared
            // on the mirror's other routes, so forwardUpstreamError would turn
            // it into a 502; forward it with Kick's message instead.
            if (finalized.status === 422) {
                return { status: 422 as const, body: finalized.body };
            }
            return forwardUpstreamError(finalized);
        },
    },
);
