export const slugify = (text) => text.toLowerCase().replace(/ \/ /g, ' ').replace(/[^a-z0-9— ]/g, '').replace(/\s+/g, '-');
export function hasContent(v) {
    if (v === null || v === undefined)
        return false;
    if (Array.isArray(v))
        return v.length > 0 && v.some(hasContent);
    if (v && typeof v === "object") {
        if (Object.keys(v).length === 0)
            return false;
        // Special check for objects that are conceptually "empty"
        if (v.title === '' && v.id === '')
            return false; // projectTitleAndId
        if (v.summary === '' && Array.isArray(v.table) && v.table.length === 0)
            return false; // budgetAndCost
        return Object.values(v).some(hasContent);
    }
    if (typeof v === "string")
        return v.trim().length > 0 && v.trim().toLowerCase() !== "null";
    return !!v;
}
