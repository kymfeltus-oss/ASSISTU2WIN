import { redirect } from "next/navigation";

export default function RootPage() {
  // Pure architectural circuit breaker: bypass the ghost file and push directly to our secure flow
  redirect("/dashboard");
}
