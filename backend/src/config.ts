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

export const config = {
    kickApiBaseUrl:
        process.env.KICK_API_BASE_URL ?? "https://use-dev.kick.co/api",
    kickPlatformApiToken: requireEnv("KICK_PLATFORM_API_TOKEN"),
    port: Number(process.env.BACKEND_PORT ?? 4001),
};

if (!config.kickPlatformApiToken.startsWith("kick_org_")) {
    console.warn(
        "Warning: KICK_PLATFORM_API_TOKEN does not look like a Kick organization " +
            'access token (expected it to start with "kick_org_"). Upstream ' +
            "requests will likely fail with 401.",
    );
}
