import { redirect } from "next/navigation";
import { connection } from "next/server";
import Shell from "@/components/shell";
import { getSession } from "@/lib/session";

export const instant = false;

export const metadata = {
  title: "Akun & Keamanan",
  description:
    "Sandi dan tautan Google milikmu.",
};

export default async function AkunLayout({ children }) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login?next=%2Fakun");
  return <Shell role={session.role}>{children}</Shell>;
}
