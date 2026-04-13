/**
 * Renders an email template by replacing {{key}} placeholders with data values.
 * This is a standalone utility that does not depend on Prisma types.
 */
export function renderEmailTemplate(
  template: { subject: string; bodyHtml: string },
  data: Record<string, string>
): { subject: string; html: string } {
  let subject = template.subject
  let html = template.bodyHtml

  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g")
    subject = subject.replace(regex, value)
    html = html.replace(regex, value)
  }

  return { subject, html }
}
