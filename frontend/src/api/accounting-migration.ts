import { initClient } from "@ts-rest/core";
import {
    accountingMigrationRunContract,
    type RunAccountingMigrationBody,
} from "@kick-demo/shared";
import { toApiError } from "./errors";

/**
 * The demo BFF's accounting-migration orchestration. It has no single Platform
 * API counterpart: the BFF starts the migration, bulk-creates the historical
 * journal entries and queues transaction-rule generation in one request. Rule
 * generation finishes asynchronously — poll the migration (via
 * `fetchAccountingMigration`) until `enrichmentRulesSeededAt` flips.
 */
const api = initClient(accountingMigrationRunContract, { baseUrl: "/api" });

export async function runAccountingMigration(body: RunAccountingMigrationBody) {
    const result = await api.run({ body });
    if (result.status === 201) {
        return result.body;
    }
    throw toApiError(result);
}
