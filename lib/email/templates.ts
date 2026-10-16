import type { EmailMessage } from "./types";

const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

/** The magic-link email. Says why it was sent, and that ignoring it is safe. */
export function signInEmail({
  to,
  url,
  expiresInMinutes,
}: {
  to: string;
  url: string;
  expiresInMinutes: number;
}): EmailMessage {
  const subject = "Your WhatToWatch sign-in link";
  const why =
    "You're getting this because someone asked to sign in to WhatToWatch with this email address. If that wasn't you, ignore this email: nothing happens unless the link is used.";
  return {
    to,
    subject,
    text: [
      "Sign in to WhatToWatch:",
      url,
      "",
      `The link works once and expires in ${expiresInMinutes} minutes.`,
      "",
      why,
    ].join("\n"),
    html: `<!doctype html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#14151a">
<p>Sign in to WhatToWatch:</p>
<p><a href="${escape(url)}" style="display:inline-block;background:#3b3bc4;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Sign in</a></p>
<p>Or copy this link: <br><span style="word-break:break-all">${escape(url)}</span></p>
<p>The link works once and expires in ${expiresInMinutes} minutes.</p>
<p style="color:#555b69;font-size:14px">${escape(why)}</p>
</body></html>`,
  };
}
