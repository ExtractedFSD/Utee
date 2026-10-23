import { redirect } from "next/navigation";

/** The timeline is History's "Everything" view now; the old address keeps working. */
export default function Page() {
  redirect("/portal/passport/history?view=everything");
}
