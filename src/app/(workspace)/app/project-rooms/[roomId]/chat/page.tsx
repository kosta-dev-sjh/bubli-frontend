import { redirect } from "next/navigation";

type ProjectRoomChatPageProps = {
  params: Promise<{ roomId: string }>;
};

export default async function ProjectRoomChatPage({ params }: ProjectRoomChatPageProps) {
  const { roomId } = await params;
  redirect(`/app/chat?mode=room&roomId=${encodeURIComponent(roomId)}`);
}
