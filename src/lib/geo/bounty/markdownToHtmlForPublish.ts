/**
 * Shared markdown → HTML for bounty publish (Shopify blog body, WordPress post content).
 * Escapes HTML in source lines before inline formatting.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function applyInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    // FIX: convert markdown links [text](url) → <a> tags.
    // Must run AFTER escapeHtml so & in URLs becomes &amp; (correct HTML).
    // Bracket/paren chars are not HTML-escaped, so the regex still matches.
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
}

// Matches any line that begins with an HTML tag (opening or closing).
// Used to pass raw HTML lines through without escaping them.

const RAW_HTML_LINE_RE = /^\s*<\/?[a-zA-Z]/;

export function minimalMarkdownToHtml(markdown: string): string {
  if (!markdown) return "";

  const lines = markdown.split("\n");
  const htmlLines: string[] = [];
  let inList = false;

  for (const raw of lines) {
    // FIX: pass raw HTML lines through untouched — prevents <ul id='cluster-links'>
    // and other injected HTML from being escaped into visible plain text.
    if (RAW_HTML_LINE_RE.test(raw)) {
      if (inList) {
        htmlLines.push("</ul>");
        inList = false;
      }
      htmlLines.push(raw);
      continue;
    }

    // Escape only non-HTML lines before further processing.
    const line = escapeHtml(raw);

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      if (inList) {
        htmlLines.push("</ul>");
        inList = false;
      }
      const level = Math.min(6, heading[1].length);
      htmlLines.push(`<h${level}>${applyInline(heading[2].trim())}</h${level}>`);
      continue;
    }

    const listItem = /^[-*]\s+(.*)$/.exec(line);
    if (listItem) {
      if (!inList) {
        htmlLines.push("<ul>");
        inList = true;
      }
      htmlLines.push(`<li>${applyInline(listItem[1])}</li>`);
      continue;
    }

    if (!line.trim()) {
      if (inList) {
        htmlLines.push("</ul>");
        inList = false;
      }
      continue;
    }

    if (inList) {
      htmlLines.push("</ul>");
      inList = false;
    }
    htmlLines.push(`<p>${applyInline(line)}</p>`);
  }

  if (inList) htmlLines.push("</ul>");
  return htmlLines.join("\n");
}



/** Appends a markdown block linking to a related article (e.g. new cluster page from pillar). */
// ─── Pillar page related articles append ──────────────────────────────────────

/**
 * Appends a markdown block linking to a related article (e.g. new cluster page from pillar).
 * The markdown link syntax [text](url) is now correctly handled by minimalMarkdownToHtml.
 */
export function buildRelatedArticlesAppend(
  currentMarkdown: string,
  item: { title: string; url: string }
): string {
  const base = currentMarkdown.trimEnd();
  // Escape ] in title so it doesn't break the markdown link syntax.
  const escapedTitle = item.title.replace(/]/g, "\\]");
  const block = `\n\n## Related reading\n\n- [${escapedTitle}](${item.url})\n`;
  return base === "" ? block.trimStart() : base + block;
}
