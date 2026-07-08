import { apiRequest } from "@/lib/api/client";

export type DesktopPresenceResponse = {
  active: boolean;
};

export const presenceApi = {
  // 지금 이 계정으로 데스크톱 앱(Tauri 메인 창 또는 위젯) 세션이 하나라도 붙어있는지 확인한다.
  // 웹 탭이 수신 전화 팝업을 띄우기 전에, 이미 데스크톱 쪽이 전담하고 있는지 판단하는 용도.
  getDesktopActive() {
    return apiRequest<DesktopPresenceResponse>("/api/presence/desktop-active");
  },
} as const;
