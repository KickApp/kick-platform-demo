import { z } from "zod";

/**
 * A single value and a repeated (or indexed) query param both normalize to an
 * array; an empty value reads as "filter not provided".
 */
export const uuidArrayQueryParamSchema = z.preprocess((value) => {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }
    return Array.isArray(value) ? value : [value];
}, z.array(z.string().uuid()).min(1).optional());
