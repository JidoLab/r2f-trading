// Small shared sanitizers for untrusted input that flows into HTML emails,
// commit messages, and Telegram/WhatsApp notifications.

/** Escape the 5 HTML-significant characters so untrusted text can't inject markup. */
export function escapeHtml(input: unknown): string {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Collapse to a single safe line and cap length — for names, plan labels, etc. */
export function sanitizeText(input: unknown, maxLen = 120): string {
  return String(input ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, maxLen);
}

/** Basic, conservative email shape check. */
export function isValidEmail(email: unknown): boolean {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}
