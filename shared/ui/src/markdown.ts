// shared/ui/src/markdown.ts
import { marked } from 'marked';

marked.setOptions({
	gfm:    true,
	breaks: true,
});

export function renderMarkdown(content: string): string {
	try {
		return marked.parse(content) as string;
	} catch {
		return content;
	}
}

/**
 * Heuristic: does this string look intentionally authored as Markdown?
 * Used for D&D descriptions so plain walls of text stay plain, while
 * intentionally marked-up traits/features/spells render via marked.
 *
 * Avoids single-asterisk italics (common incidental `*` in rules text).
 */
export function looksLikeMarkdown(content: string | null | undefined): boolean {
	if (!content?.trim()) return false;
	const s = content;
	if (/^#{1,6}\s+\S/m.test(s)) return true;                 // # Heading
	if (/\*\*[^*\n]+\*\*/.test(s)) return true;               // **bold**
	if (/__[^_\n]+__/.test(s)) return true;                   // __bold__
	if (/^[\t ]*[-+]\s+\S/m.test(s)) return true;             // - / + list (not * — too noisy)
	if (/^[\t ]*\*\s+\S/m.test(s)) return true;               // * list item at line start
	if (/^[\t ]*\d+\.\s+\S/m.test(s)) return true;            // 1. ordered list
	if (/```/.test(s)) return true;                           // fenced code
	if (/\[[^\]]+\]\([^)]+\)/.test(s)) return true;           // [link](url)
	if (/^>\s+\S/m.test(s)) return true;                      // blockquote
	// GFM tables: header row + separator (pipes alone are too noisy without a sep)
	if (/^\|.+\|[ \t]*$/m.test(s) && /^\|?[\t ]*:?-{3,}[\t ]*(\|[\t ]*:?-{3,}[\t ]*)+\|?[ \t]*$/m.test(s)) {
		return true;
	}
	return false;
}
