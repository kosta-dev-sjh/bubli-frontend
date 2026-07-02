import { redirect } from "next/navigation";

type DesktopCommunicationPageProps = {
  searchParams: Promise<{ roomId?: string | string[] }>;
};

export default async function DesktopCommunicationPage({ searchParams }: DesktopCommunicationPageProps) {
  const params = await searchParams;
  const roomId = Array.isArray(params.roomId) ? params.roomId[0] : params.roomId;
  const nextParams = new URLSearchParams({ mode: "room" });
  if (roomId?.trim()) {
    nextParams.set("roomId", roomId.trim());
  }

  redirect(`/app/chat?${nextParams.toString()}`);
}
