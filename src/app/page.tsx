import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { homeForRole } from "@/lib/status";

export default async function Home() {
  const user = await getSessionUser();
  redirect(user ? homeForRole(user.role) : "/login");
}
