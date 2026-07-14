// Stable per-project accent color.
//
// Hashed from the project path so a given project keeps the same color across
// sessions, devices, reloads, and both light/dark themes. Used for the thin
// left rail on session rows and the folder glyph on project group headers, so
// the eye can scan by project even in the flat "recent" list.
//
// Amber/orange is intentionally excluded from the palette: amber is reserved
// for the "waiting for your approval" signal and must stay unambiguous.
const PROJECT_COLORS = [
    '#5B8CFF', // blue
    '#38B2AC', // teal
    '#A978FF', // violet
    '#F6748F', // rose
    '#6C7BE0', // indigo
    '#37B6C9', // cyan
    '#57C26A', // green
] as const;

export function projectColor(path: string | null | undefined): string {
    if (!path) return PROJECT_COLORS[0];
    let hash = 0;
    for (let i = 0; i < path.length; i++) {
        hash = (hash * 31 + path.charCodeAt(i)) >>> 0;
    }
    return PROJECT_COLORS[hash % PROJECT_COLORS.length];
}
