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
