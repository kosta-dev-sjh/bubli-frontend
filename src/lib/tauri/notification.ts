export type TauriNotificationInput = {
  body?: string;
  title: string;
};

export async function sendTauriNotification(input: TauriNotificationInput): Promise<void> {
  const { isPermissionGranted, requestPermission, sendNotification } = await import("@tauri-apps/plugin-notification");
  let granted = await isPermissionGranted();
  if (!granted) {
    granted = (await requestPermission()) === "granted";
  }
  if (granted) {
    sendNotification(input);
  }
}
