"use client";

import { useParams } from "next/navigation";

import { RoomResourceWorkspace } from "@/features/resources/components";

export default function ProjectRoomResourcesPage() {
  const params = useParams<{ roomId: string }>();

  return <RoomResourceWorkspace roomId={params.roomId} />;
}
