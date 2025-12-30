import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/services/auth.service";
import { getDefaultRedirect } from "@/lib/auth/user-types";

export default async function Home() {
  const session = await getSession()

  if (session) {
    // Redirect authenticated users to their appropriate portal
    redirect(getDefaultRedirect(session.userType))
  }

  // Redirect unauthenticated users to login
  redirect('/login')
}
