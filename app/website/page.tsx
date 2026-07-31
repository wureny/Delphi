import { permanentRedirect } from "next/navigation";

export default function LegacyWebsiteRedirect() {
  permanentRedirect("/");
}
