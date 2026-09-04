import { initServer } from "@ts-rest/express";
import { platformContract } from "@kick-demo/shared";
import { forwardUpstreamError, kickClient, UpstreamError } from "./kick-client";

const s = initServer();

/**
 * Pass-through handlers: the BFF exposes the same contract it consumes, so
 * each handler forwards the validated request upstream and relays the
 * response. The only thing added server-side is the bearer token.
 */
export const platformRouter = s.router(platformContract, {
    workspaces: {
        list: async ({ query }) => {
            const result = await kickClient.workspaces.list({ query });
            if (result.status === 200) {
                return { status: 200, body: result.body };
            }
            return forwardUpstreamError(result);
        },
        create: async ({ body }) => {
            const result = await kickClient.workspaces.create({ body });
            if (result.status === 201) {
                return { status: 201, body: result.body };
            }
            return forwardUpstreamError(result);
        },
        get: async ({ params }) => {
            const result = await kickClient.workspaces.get({ params });
            if (result.status === 200) {
                return { status: 200, body: result.body };
            }
            return forwardUpstreamError(result);
        },
    },
    entities: {
        list: async ({ query }) => {
            const result = await kickClient.entities.list({ query });
            if (result.status === 200) {
                return { status: 200, body: result.body };
            }
            return forwardUpstreamError(result);
        },
        create: async ({ body }) => {
            const result = await kickClient.entities.create({ body });
            if (result.status === 201) {
                return { status: 201, body: result.body };
            }
            return forwardUpstreamError(result);
        },
        get: async ({ params }) => {
            const result = await kickClient.entities.get({ params });
            if (result.status === 200) {
                return { status: 200, body: result.body };
            }
            return forwardUpstreamError(result);
        },
    },
    plaidConnections: {
        list: async ({ query }) => {
            const result = await kickClient.plaidConnections.list({ query });
            if (result.status === 200) {
                return { status: 200, body: result.body };
            }
            return forwardUpstreamError(result);
        },
        create: async ({ body }) => {
            const result = await kickClient.plaidConnections.create({ body });
            if (result.status === 201) {
                return { status: 201, body: result.body };
            }
            return forwardUpstreamError(result);
        },
        // The upstream 200 carries no body, so neither does this one.
        delete: async ({ params }) => {
            const result = await kickClient.plaidConnections.delete({ params });
            if (result.status === 200) {
                return { status: 200, body: undefined };
            }
            return forwardUpstreamError(result);
        },
    },
    transactions: {
        list: async ({ params, query }) => {
            const result = await kickClient.transactions.list({
                params,
                query,
            });
            if (result.status === 200) {
                return { status: 200, body: result.body };
            }
            return forwardUpstreamError(result);
        },
        update: async ({ params, body }) => {
            const result = await kickClient.transactions.update({
                params,
                body,
            });
            if (result.status === 200) {
                return { status: 200, body: result.body };
            }
            return forwardUpstreamError(result);
        },
    },
    chartOfAccounts: {
        list: async ({ params, query }) => {
            const result = await kickClient.chartOfAccounts.list({
                params,
                query,
            });
            if (result.status === 200) {
                return { status: 200, body: result.body };
            }
            return forwardUpstreamError(result);
        },
        create: async ({ params, body }) => {
            const result = await kickClient.chartOfAccounts.create({
                params,
                body,
            });
            if (result.status === 201) {
                return { status: 201, body: result.body };
            }
            return forwardUpstreamError(result);
        },
        bulkCreate: async ({ params, body }) => {
            const result = await kickClient.chartOfAccounts.bulkCreate({
                params,
                body,
            });
            if (result.status === 201) {
                return { status: 201, body: result.body };
            }
            return forwardUpstreamError(result);
        },
        update: async ({ params, body }) => {
            const result = await kickClient.chartOfAccounts.update({
                params,
                body,
            });
            if (result.status === 200) {
                return { status: 200, body: result.body };
            }
            return forwardUpstreamError(result);
        },
        disable: async ({ params }) => {
            const result = await kickClient.chartOfAccounts.disable({ params });
            if (result.status === 200) {
                return { status: 200, body: result.body };
            }
            return forwardUpstreamError(result);
        },
        enable: async ({ params }) => {
            const result = await kickClient.chartOfAccounts.enable({ params });
            if (result.status === 200) {
                return { status: 200, body: result.body };
            }
            return forwardUpstreamError(result);
        },
        // The blocked-merge 409 carries structured blockers, which
        // forwardUpstreamError would flatten to `{ message }`, so it is
        // forwarded verbatim here. The trailing 409 check is unreachable at
        // runtime but keeps the handler's 409 typed to the blocked shape.
        merge: async ({ params, body }) => {
            const result = await kickClient.chartOfAccounts.merge({
                params,
                body,
            });
            if (result.status === 200) {
                return { status: 200, body: result.body };
            }
            if (result.status === 409) {
                return { status: 409, body: result.body };
            }
            const forwarded = forwardUpstreamError(result);
            if (forwarded.status === 409) {
                throw new UpstreamError(result.status, result.body);
            }
            return { status: forwarded.status, body: forwarded.body };
        },
        // The upstream 200 carries no body, so neither does this one.
        delete: async ({ params }) => {
            const result = await kickClient.chartOfAccounts.delete({ params });
            if (result.status === 200) {
                return { status: 200, body: undefined };
            }
            return forwardUpstreamError(result);
        },
    },
    accountGroups: {
        list: async ({ params, query }) => {
            const result = await kickClient.accountGroups.list({
                params,
                query,
            });
            if (result.status === 200) {
                return { status: 200, body: result.body };
            }
            return forwardUpstreamError(result);
        },
        create: async ({ params, body }) => {
            const result = await kickClient.accountGroups.create({
                params,
                body,
            });
            if (result.status === 201) {
                return { status: 201, body: result.body };
            }
            return forwardUpstreamError(result);
        },
        update: async ({ params, body }) => {
            const result = await kickClient.accountGroups.update({
                params,
                body,
            });
            if (result.status === 200) {
                return { status: 200, body: result.body };
            }
            return forwardUpstreamError(result);
        },
        // The upstream 200 carries no body, so neither does this one.
        delete: async ({ params }) => {
            const result = await kickClient.accountGroups.delete({ params });
            if (result.status === 200) {
                return { status: 200, body: undefined };
            }
            return forwardUpstreamError(result);
        },
    },
    reports: {
        profitAndLoss: async ({ params, query }) => {
            const result = await kickClient.reports.profitAndLoss({
                params,
                query,
            });
            if (result.status === 200) {
                return { status: 200, body: result.body };
            }
            return forwardUpstreamError(result);
        },
        balanceSheet: async ({ params, query }) => {
            const result = await kickClient.reports.balanceSheet({
                params,
                query,
            });
            if (result.status === 200) {
                return { status: 200, body: result.body };
            }
            return forwardUpstreamError(result);
        },
        cashFlow: async ({ params, query }) => {
            const result = await kickClient.reports.cashFlow({
                params,
                query,
            });
            if (result.status === 200) {
                return { status: 200, body: result.body };
            }
            return forwardUpstreamError(result);
        },
        trialBalance: async ({ params, query }) => {
            const result = await kickClient.reports.trialBalance({
                params,
                query,
            });
            if (result.status === 200) {
                return { status: 200, body: result.body };
            }
            return forwardUpstreamError(result);
        },
        generalLedger: async ({ params, query }) => {
            const result = await kickClient.reports.generalLedger({
                params,
                query,
            });
            if (result.status === 200) {
                return { status: 200, body: result.body };
            }
            return forwardUpstreamError(result);
        },
    },
});
