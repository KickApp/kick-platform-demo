import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const repoRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../..",
);

dotenv.config({ path: path.join(repoRoot, ".env") });

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        console.error(
            `Missing required env var ${name}. Set it in your environment or in ` +
                `${path.join(repoRoot, ".env")} (see .env.example).`,
        );
        process.exit(1);
    }
    return value;
}

function optionalEnv(name: string): string | undefined {
    const value = process.env[name];
    return value !== undefined && value !== "" ? value : undefined;
}

/**
 * Plaid credentials are optional: without them every resource still works and
 * only the Plaid Link flow is disabled, which is a far better failure mode for
 * a demo than refusing to boot.
 */
function readPlaidConfig() {
    const clientId = optionalEnv("PLAID_CLIENT_ID");
    const secret = optionalEnv("PLAID_SECRET");
    if (clientId === undefined || secret === undefined) {
        return null;
    }
    return {
        clientId,
        secret,
        environment: process.env.PLAID_ENV ?? "sandbox",
        // Kick reads the connection with /processor/transactions/sync and
        // /processor/auth/get, so the Item has to carry both products.
        products: (process.env.PLAID_PRODUCTS ?? "transactions,auth")
            .split(",")
            .map((product) => product.trim())
            .filter((product) => product !== ""),
    };
}

export const config = {
    kickApiBaseUrl:
        process.env.KICK_API_BASE_URL ?? "https://use-dev.kick.co/api",
    kickPlatformApiToken: requireEnv("KICK_PLATFORM_API_TOKEN"),
    port: Number(process.env.BACKEND_PORT ?? 4001),
    plaid: readPlaidConfig(),
};

if (!config.kickPlatformApiToken.startsWith("kick_org_")) {
    console.warn(
        "Warning: KICK_PLATFORM_API_TOKEN does not look like a Kick organization " +
            'access token (expected it to start with "kick_org_"). Upstream ' +
            "requests will likely fail with 401.",
    );
}

if (config.plaid === null) {
    console.warn(
        "PLAID_CLIENT_ID / PLAID_SECRET are not set, so the Plaid Link flow is " +
            "disabled. Everything else works; see .env.example.",
    );
}
