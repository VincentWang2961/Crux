import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AvailabilityEditor } from "@/components/admin/availability-editor";
import { isAdmin } from "@/lib/admin-auth";
import { getAvailability } from "@/lib/availability";

export const metadata: Metadata = {
  title: "Admin · Vincent Wang",
  robots: { index: false, follow: false },
};

// Reached from the hero ("admin@<password>" typed over the name). The session cookie is
// verified here on every request; without it you are sent back to the home page.
async function Editor() {
  if (!(await isAdmin())) redirect("/");
  return <AvailabilityEditor data={await getAvailability()} />;
}

export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-[max(1.25rem,env(safe-area-inset-left))] py-8 font-mono sm:px-10 sm:py-12">
      <Suspense fallback={<p className="text-xs text-muted-foreground">checking session…</p>}>
        <Editor />
      </Suspense>
    </main>
  );
}
