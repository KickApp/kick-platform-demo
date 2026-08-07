import express from "express";
import type { NextFunction, Request, Response } from "express";
import { createExpressEndpoints } from "@ts-rest/express";
import { plaidLinkContract, platformContract } from "@kick-demo/shared";
import { config } from "./config";
import { UpstreamError } from "./kick-client";
import { plaidLinkRouter } from "./plaid-link-router";
import { platformRouter } from "./router";

const app = express();
app.use(express.json());

app.use((req, res, next) => {
    res.on("finish", () => {
        console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode}`);
    });
    next();
});

app.get("/healthz", (_req, res) => {
    res.json({ status: "ok", upstream: config.kickApiBaseUrl });
});

// responseValidation parses outgoing bodies through the contract schemas,
// which strips upstream fields the demo deliberately does not model
// (e.g. Kick-internal flags on workspaces).
const apiRouter = express.Router();
createExpressEndpoints(platformContract, platformRouter, apiRouter, {
    logInitialization: false,
    responseValidation: true,
});
// The demo's own Plaid Link routes, under /demo/ so they stay visibly apart
// from the mirrored /platform/v1/ surface.
createExpressEndpoints(plaidLinkContract, plaidLinkRouter, apiRouter, {
    logInitialization: false,
    responseValidation: true,
});
app.use("/api", apiRouter);

app.use(
    (error: Error, _req: Request, res: Response, _next: NextFunction): void => {
        if (error instanceof UpstreamError) {
            console.error(
                `Upstream error ${error.status}:`,
                JSON.stringify(error.body).slice(0, 500),
            );
            res.status(502).json({
                message: `Kick API returned an unexpected response (status ${error.status})`,
            });
            return;
        }
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    },
);

app.listen(config.port, () => {
    console.log(
        `Kick Platform demo BFF listening on http://localhost:${config.port}`,
    );
    console.log(`Proxying Platform API requests to ${config.kickApiBaseUrl}`);
});
