import { headers } from "next/headers";
import { createClient } from "./supabase/server";

export async function getCurrentUser(): Promise<{ id: string; email: string } | null> {
  if (process.env.DATABASE_URL) {
    const { auth } = await import("./auth");
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user ? { id: session.user.id, email: session.user.email } : null;
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { id: user.id, email: user.email ?? "" } : null;
}
