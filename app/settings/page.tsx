import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DeleteAccount, SignOutButton } from "@/components/account-actions";
import { getSessionUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Account" };

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="max-w-prose space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Your account</h1>
        <p>
          Signed in as <strong>{user.email}</strong>. My list and your services are saved to this
          account and show up on any device where you sign in.
        </p>
      </header>
      <section className="space-y-3" aria-labelledby="sign-out">
        <h2 id="sign-out" className="text-lg font-semibold">
          Sign out
        </h2>
        <p className="text-muted text-sm">
          Signing out removes your list from this browser. It stays safe in your account.
        </p>
        <SignOutButton />
      </section>
      <section className="space-y-3" aria-labelledby="delete">
        <h2 id="delete" className="text-lg font-semibold">
          Delete account
        </h2>
        <p className="text-muted text-sm">
          Permanently deletes your account, your list and your services. We keep nothing.
        </p>
        <DeleteAccount />
      </section>
    </div>
  );
}
