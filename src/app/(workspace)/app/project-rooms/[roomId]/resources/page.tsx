"use client";

import { useParams } from "next/navigation";

import { RoomResourceWorkspace } from "@/features/resources/components";

export default function ProjectRoomResourcesPage() {
  const params = useParams<{ roomId: string }>();

  return <ProjectRoomResourcesContent roomId={params.roomId} />;
}

export function ProjectRoomResourcesContent({ roomId }: { roomId: string }) {
  return <RoomResourceWorkspace roomId={roomId} />;
}
