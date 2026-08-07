import { Configuration, PlaidApi, PlaidEnvironments, Products } from "plaid";
import { z } from "zod";
import { config } from "./config";

function resolveBasePath(environment: string): string {
    const basePath = PlaidEnvironments[environment];
    if (basePath === undefined) {
        throw new Error(
            `Unknown PLAID_ENV "${environment}". Expected one of: ${Object.keys(
                PlaidEnvironments,
            ).join(", ")}.`,
        );
    }
    return basePath;
}

function resolveProducts(products: string[]): Products[] {
    const supported = Object.values(Products);
    return products.map((product) => {
        const match = supported.find((candidate) => candidate === product);
        if (match === undefined) {
            throw new Error(
                `Unknown Plaid product "${product}" in PLAID_PRODUCTS.`,
            );
        }
        return match;
    });
}

/**
 * The demo's own Plaid client, holding the partner-side credentials. It is
 * `null` when `PLAID_CLIENT_ID`/`PLAID_SECRET` are unset, which disables the
 * Link flow without affecting any other resource.
 */
export const plaid =
    config.plaid === null
        ? null
        : {
              client: new PlaidApi(
                  new Configuration({
                      basePath: resolveBasePath(config.plaid.environment),
                      baseOptions: {
                          headers: {
                              "PLAID-CLIENT-ID": config.plaid.clientId,
                              "PLAID-SECRET": config.plaid.secret,
                          },
                      },
                  }),
              ),
              environment: config.plaid.environment,
              products: resolveProducts(config.plaid.products),
          };

export const PLAID_NOT_CONFIGURED_MESSAGE =
    "Plaid Link is not configured on this demo backend. Set PLAID_CLIENT_ID " +
    "and PLAID_SECRET and restart it.";

/**
 * Raised for a request the caller can fix — a Plaid API rejection or a link
 * that resolves to anything other than one bookable account. Surfaces as 400.
 */
export class PlaidRequestError extends Error {}

const plaidApiErrorSchema = z.object({
    response: z.object({
        data: z.object({
            error_code: z.string(),
            error_message: z.string(),
            display_message: z.string().nullable().optional(),
        }),
    }),
});

/**
 * Plaid's SDK rejects with an axios error carrying the real reason in the
 * response body; without this the caller would only ever see "Request failed
 * with status code 400".
 */
export function toPlaidRequestError(error: unknown): PlaidRequestError | null {
    const parsed = plaidApiErrorSchema.safeParse(error);
    if (!parsed.success) {
        return null;
    }
    const { error_code, error_message, display_message } =
        parsed.data.response.data;
    return new PlaidRequestError(
        `Plaid rejected the request: ${display_message ?? error_message} (${error_code})`,
    );
}
