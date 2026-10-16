import "server-only";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Resend } from "resend";
import type { EmailMessage, EmailSender } from "./types";

export type { EmailMessage, EmailSender } from "./types";

class ResendSender implements EmailSender {
  readonly kind = "resend";
  private client: Resend;
  constructor(
    apiKey: string,
    private from: string,
  ) {
    this.client = new Resend(apiKey);
  }
  async send(message: EmailMessage) {
    const { error } = await this.client.emails.send({ from: this.from, ...message });
    // Never include the recipient in errors or logs.
    if (error) throw new Error(`Resend could not send "${message.subject}": ${error.message}`);
  }
}

/** Development only: prints the email (minus the recipient) to the terminal. */
class ConsoleSender implements EmailSender {
  readonly kind = "console";
  async send(message: EmailMessage) {
    console.info(`\n[email] ${message.subject} (to: hidden)\n${message.text}\n`);
  }
}

/** Tests only: writes each email as JSON into a folder that e2e tests read. */
class OutboxSender implements EmailSender {
  readonly kind = "outbox";
  constructor(private dir: string) {}
  async send(message: EmailMessage) {
    mkdirSync(this.dir, { recursive: true });
    const file = `${Date.now()}-${Math.random().toString(36).slice(2)}.json`;
    writeFileSync(path.join(this.dir, file), JSON.stringify(message));
  }
}

/**
 * The configured sender, or null when email isn't set up:
 * - RESEND_API_KEY + EMAIL_FROM: real email.
 * - EMAIL_TEST_OUTBOX (never on Vercel): e2e tests.
 * - `next dev` with neither: links are printed in the terminal.
 */
export function getEmailSender(): EmailSender | null {
  const { RESEND_API_KEY, EMAIL_FROM, EMAIL_TEST_OUTBOX, VERCEL, NODE_ENV } = process.env;
  if (RESEND_API_KEY && EMAIL_FROM) return new ResendSender(RESEND_API_KEY, EMAIL_FROM);
  if (EMAIL_TEST_OUTBOX && !VERCEL) return new OutboxSender(EMAIL_TEST_OUTBOX);
  if (NODE_ENV === "development") return new ConsoleSender();
  return null;
}
