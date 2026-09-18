import { initServer } from "@ts-rest/express";
import {
    plaidLinkContract,
    platformPlaidAccountTypeSchema,
    type PlaidLinkAccount,
} from "@kick-demo/shared";
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

/**
 * Kick books credit, depository and loan accounts; the Platform API rejects
 * `investment` and `brokerage` account types outright.
 */
const BOOKABLE_ACCOUNT_TYPES = [
    AccountType.Credit,
    AccountType.Depository,
    AccountType.Loan,
];

function isBookable(account: AccountBase): boolean {
    return (
        BOOKABLE_ACCOUNT_TYPES.includes(account.type) &&
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
 * one account is bookable. The Platform API makes no Plaid account call at
 * creation time, so the full declared details are resolved here, not just the
 * account id.
 */
async function resolveAccount(
    client: PlaidApi,
    accessToken: string,
): Promise<PlaidLinkAccount> {
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
    return {
        id: only.account_id,
        // The SDK types `type` as its own enum; the wire schema restates the
        // same lowercase values, so parsing is the cast-free narrowing.
        type: platformPlaidAccountTypeSchema.parse(only.type),
        subtype: only.subtype,
        name: only.name,
        mask: only.mask,
    };
}

/**
 * Link does not report the institution for every flow (same-day micro-deposit
 * items, say), and Kick requires one to create the connection, so fall back to
 * reading it off the Item.
 */
async function resolveInstitutionId(
    client: PlaidApi,
    accessToken: string,
): Promise<string> {
    const { data } = await client.itemGet({ access_token: accessToken });
    const institutionId = data.item.institution_id ?? null;

    if (institutionId === null) {
        throw new PlaidRequestError(
            "Plaid reports no institution for the linked Item, and Kick " +
                "requires one to create the connection.",
        );
    }
    return institutionId;
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
        let institutionId: string;
        let account: PlaidLinkAccount;
        try {
            const { data: exchange } =
                await plaid.client.itemPublicTokenExchange({
                    public_token: body.publicToken,
                });

            account =
                body.account ??
                (await resolveAccount(plaid.client, exchange.access_token));

            institutionId =
                body.institutionId ??
                (await resolveInstitutionId(
                    plaid.client,
                    exchange.access_token,
                ));

            const { data: processor } = await plaid.client.processorTokenCreate(
                {
                    access_token: exchange.access_token,
                    account_id: account.id,
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
            body: {
                entityId: body.entityId,
                processorToken,
                institutionId,
                accountId: account.id,
                accountType: account.type,
                accountSubtype: account.subtype ?? undefined,
                accountName: account.name ?? undefined,
                accountNumberMask: account.mask ?? undefined,
            },
        });
        if (result.status === 201) {
            return { status: 201 as const, body: result.body };
        }
        return forwardUpstreamError(result);
    },
});
