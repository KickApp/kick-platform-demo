import { initServer } from "@ts-rest/express";
import { plaidLinkContract } from "@kick-demo/shared";
import {
    AccountBase,
    AccountType,
    CountryCode,
    CreditAccountSubtype,
    DepositoryAccountSubtype,
    LoanAccountSubtype,
    PlaidApi,
    ProcessorTokenCreateRequestProcessorEnum,
} from "plaid";
import { forwardUpstreamError, kickClient } from "./kick-client";
import {
    PLAID_NOT_CONFIGURED_MESSAGE,
    PlaidRequestError,
    plaid,
    toPlaidRequestError,
} from "./plaid-client";

const s = initServer();

const USD = "USD";

/**
 * Kick books USD credit, depository and loan accounts, and a processor token
 * names exactly one account, so Link is filtered to what can actually be
 * connected rather than letting the user pick something that fails later.
 */
const LINK_ACCOUNT_FILTERS = {
    depository: { account_subtypes: [DepositoryAccountSubtype.All] },
    credit: { account_subtypes: [CreditAccountSubtype.All] },
    loan: { account_subtypes: [LoanAccountSubtype.All] },
};

function isBookable(account: AccountBase): boolean {
    return (
        account.type !== AccountType.Investment &&
        account.balances.iso_currency_code === USD
    );
}

function describe(account: AccountBase): string {
    const mask = account.mask !== null ? ` ••••${account.mask}` : "";
    return `${account.name}${mask}`;
}

/**
 * Link only reports the selected account when the Plaid dashboard has Account
 * Select enabled, so fall back to reading the Item and requiring that exactly
 * one account is bookable.
 */
async function resolveAccountId(
    client: PlaidApi,
    accessToken: string,
): Promise<string> {
    const { data } = await client.accountsGet({ access_token: accessToken });
    const bookable = data.accounts.filter(isBookable);
    const [only] = bookable;

    if (only === undefined) {
        throw new PlaidRequestError(
            "The linked institution has no USD credit, depository or loan " +
                "account, and Kick cannot book anything else.",
        );
    }
    if (bookable.length > 1) {
        throw new PlaidRequestError(
            `A Kick connection covers exactly one account, but the link resolved to ${bookable.length}: ` +
                `${bookable.map(describe).join(", ")}. Enable single-account select in your Plaid dashboard.`,
        );
    }
    return only.account_id;
}

export const plaidLinkRouter = s.router(plaidLinkContract, {
    getConfig: async () => ({
        status: 200 as const,
        body: {
            configured: plaid !== null,
            environment: plaid?.environment ?? null,
        },
    }),

    createLinkToken: async () => {
        if (plaid === null) {
            return {
                status: 503 as const,
                body: { message: PLAID_NOT_CONFIGURED_MESSAGE },
            };
        }

        try {
            const { data } = await plaid.client.linkTokenCreate({
                client_name: "Kick Platform Demo",
                language: "en",
                country_codes: [CountryCode.Us],
                products: plaid.products,
                account_filters: LINK_ACCOUNT_FILTERS,
                user: { client_user_id: "kick-platform-demo" },
            });
            return {
                status: 200 as const,
                body: {
                    linkToken: data.link_token,
                    expiration: data.expiration,
                },
            };
        } catch (error) {
            const plaidError = toPlaidRequestError(error);
            if (plaidError !== null) {
                return {
                    status: 400 as const,
                    body: { message: plaidError.message },
                };
            }
            throw error;
        }
    },

    /**
     * The partner half of the flow: exchange the browser's public token for an
     * access token, mint a `kick` processor token from it, and hand only that
     * to the Platform API. The access token never leaves this backend.
     */
    createConnection: async ({ body }) => {
        if (plaid === null) {
            return {
                status: 503 as const,
                body: { message: PLAID_NOT_CONFIGURED_MESSAGE },
            };
        }

        let processorToken: string;
        try {
            const { data: exchange } =
                await plaid.client.itemPublicTokenExchange({
                    public_token: body.publicToken,
                });

            const accountId =
                body.accountId ??
                (await resolveAccountId(plaid.client, exchange.access_token));

            const { data: processor } = await plaid.client.processorTokenCreate(
                {
                    access_token: exchange.access_token,
                    account_id: accountId,
                    processor: ProcessorTokenCreateRequestProcessorEnum.Kick,
                },
            );
            processorToken = processor.processor_token;
        } catch (error) {
            const plaidError = toPlaidRequestError(error) ?? error;
            if (plaidError instanceof PlaidRequestError) {
                return {
                    status: 400 as const,
                    body: { message: plaidError.message },
                };
            }
            throw error;
        }

        const result = await kickClient.plaidConnections.create({
            body: { entityId: body.entityId, processorToken },
        });
        if (result.status === 201) {
            return { status: 201 as const, body: result.body };
        }
        return forwardUpstreamError(result);
    },
});
