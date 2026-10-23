import { redirect } from "next/navigation";

/** The diary is History's "Day by day" view now; the old address keeps working. */
export default function Page() {
  redirect("/portal/passport/history?view=days");
}
