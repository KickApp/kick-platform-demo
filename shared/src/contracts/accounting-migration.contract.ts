import { initContract } from "@ts-rest/core";
import { errorMessageSchema } from "../schemas/error.schema";
import {
    runAccountingMigrationBodySchema,
    runAccountingMigrationResponseSchema,
} from "../schemas/accounting-migration-run.schema";

const c = initContract();

/**
 * A demo BFF endpoint, deliberately kept out of `platform.contract.ts`: the
 * Platform API has no single call that migrates historical books, and the
 * partner is expected to orchestrate three of its routes. This route does the
 * whole dance server-side so the form only makes one request:
 *
 * 1. `POST /platform/v1/entities/:entityId/accounting-migration` — start the
 *    migration (reusing the existing one on a 409, so a retry after a partial
 *    failure continues instead of dead-ending).
 * 2. `POST .../journal-entries/bulk` — push the historical entries atomically.
 * 3. `POST .../accounting-migration/generate-transaction-rules` — finalize by
 *    queuing rule generation; `enrichmentRulesSeededAt` flips when it is done.
 *
 * The `/demo/` prefix keeps it visibly apart from the mirrored `/platform/v1/`
 * surface. 422 forwards Kick's "workspace not eligible for rule generation".
 */
const errorResponses = {
    400: errorMessageSchema,
    401: errorMessageSchema,
    404: errorMessageSchema,
    409: errorMessageSchema,
    422: errorMessageSchema,
    429: errorMessageSchema,
};

export const accountingMigrationRunContract = c.router(
    {
        run: {
            method: "POST",
            path: "/run",
            body: runAccountingMigrationBodySchema,
            responses: {
                201: runAccountingMigrationResponseSchema,
                ...errorResponses,
            },
        },
    },
    { pathPrefix: "/demo/v1/accounting-migration" },
);
