import { redirect } from "next/navigation";

/** This page now lives under Record; the old address keeps working. */
export default function Page() {
  redirect("/portal/passport/record?tab=taking");
}
