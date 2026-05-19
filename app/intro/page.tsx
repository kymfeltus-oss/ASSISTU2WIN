import { redirect } from "next/navigation";

/** Canonical intro URL — static interactive splash lives at /intro.html */
export default function IntroPage() {
  redirect("/intro.html");
}
