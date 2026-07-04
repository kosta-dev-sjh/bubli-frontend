import { redirect } from "next/navigation";

// 프로젝트룸 진입 즉시 WBS 작업판으로 보낸다.
// 클라이언트 useEffect 리다이렉트는 중간 화면이 잠깐 보이는 문제가 있어 라우트 레벨 redirect()로 처리한다.
export default async function ProjectRoomHomePage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  redirect(`/app/project-rooms/${roomId}/work`);
}
