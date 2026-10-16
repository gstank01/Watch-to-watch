export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

/** Sends email. Swap implementations without touching callers (spec §3). */
export interface EmailSender {
  readonly kind: "resend" | "console" | "outbox";
  send(message: EmailMessage): Promise<void>;
}
