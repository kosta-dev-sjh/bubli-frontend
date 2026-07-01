import { redirect } from "next/navigation";

export default function DesktopCommunicationPage() {
  redirect("/app/desktop/widgets?autoOpen=chat");
}
