import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DataProblem } from "@/components/data-problem";
import { SignInForm } from "@/components/sign-in-form";
import { getSessionUser, MAGIC_LINK_MINUTES } from "@/lib/auth/server";
import { accountsStatus } from "@/lib/auth/status";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage(props: PageProps<"/sign-in">) {
  const status = accountsStatus();
  if (status.enabled && (await getSessionUser())) redirect("/settings");
  const params = await props.searchParams;
  const linkError = params.link !== undefined || params.error !== undefined;

  return (
    <div className="max-w-prose space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="text-muted">
          Keep My list and your services safe and the same on every device. No password: we email
          you a link. Anything already saved in this browser is added to your account.
        </p>
      </header>
      {!status.enabled ? (
        <DataProblem
          message={`Accounts aren't set up on this server yet. Everything is still saved in this browser. (Site owner: set ${status.missing.join(", ")}; see the README.)`}
        />
      ) : (
        <>
          {linkError && (
            <p role="alert" className="border-border bg-surface rounded-lg border p-4">
              That sign-in link has expired or was already used. Enter your email for a new one.
            </p>
          )}
          <SignInForm expiresInMinutes={MAGIC_LINK_MINUTES} />
          <p className="text-muted text-sm">
            We only use your email to sign you in. See{" "}
            <a href="/about#privacy" className="underline">
              privacy
            </a>
            .
          </p>
        </>
      )}
    </div>
  );
}
