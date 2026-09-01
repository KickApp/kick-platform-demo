import {
    ACCOUNT_TYPES,
    platformCreateAccountBodySchema,
    type AccountType,
    type PlatformCreateAccountBody,
} from "@kick-demo/shared";

export type ParsedAccountLine =
    | { lineNumber: number; account: PlatformCreateAccountBody; error?: never }
    | { lineNumber: number; account?: never; error: string };

const FIELD_SEPARATOR = ",";

function toAccountType(field: string): AccountType | null {
    const normalized = field.trim().toLowerCase();
    return (
        ACCOUNT_TYPES.find((type) => type.toLowerCase() === normalized) ?? null
    );
}

function firstIssueMessage(fieldErrors: Record<string, string[] | undefined>) {
    const entry = Object.entries(fieldErrors).find(
        ([, messages]) => messages !== undefined && messages.length > 0,
    );
    return entry !== undefined
        ? `${entry[0]}: ${entry[1]?.[0] ?? "is invalid"}`
        : "is invalid";
}

/**
 * Reads one pasted line as `Name, Type` with an optional trailing code. The
 * fields are taken from the right because an account name may itself contain
 * commas ("Meals, Entertainment, Operating Expenses") while a Kick account
 * type never does: the last field is the code unless it names a type, the one
 * before it must name the type, and everything to its left is the name.
 */
function parseAccountLine(line: string, lineNumber: number): ParsedAccountLine {
    const fields = line.split(FIELD_SEPARATOR).map((field) => field.trim());
    if (fields.length < 2) {
        return {
            lineNumber,
            error: "expected `Name, Type` with an optional trailing code",
        };
    }

    const lastField = fields[fields.length - 1] ?? "";
    const trailingType = toAccountType(lastField);
    const type = trailingType ?? toAccountType(fields[fields.length - 2] ?? "");
    if (type === null) {
        return {
            lineNumber,
            error: `"${lastField}" is not a Kick account type`,
        };
    }

    const nameFields = fields.slice(0, trailingType !== null ? -1 : -2);
    const candidate = {
        name: nameFields.join(FIELD_SEPARATOR).trim(),
        type,
        ...(trailingType === null && lastField !== "" && { code: lastField }),
    };

    const parsed = platformCreateAccountBodySchema.safeParse(candidate);
    if (!parsed.success) {
        return {
            lineNumber,
            error: firstIssueMessage(parsed.error.flatten().fieldErrors),
        };
    }
    return { lineNumber, account: parsed.data };
}

/** Blank lines are ignored so a pasted block can carry spacing. */
export function parseAccountLines(text: string): ParsedAccountLine[] {
    return text
        .split("\n")
        .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
        .filter(({ line }) => line !== "")
        .map(({ line, lineNumber }) => parseAccountLine(line, lineNumber));
}
