import { AuthPanel, AuthRefreshRotationBoundaryPanel, AuthSessionSecurityPanel } from "@/features/auth/components";

export default function LoginPage() {
  return (
    <>
      <AuthPanel mode="login" />
      <div className="page-grid">
        <AuthSessionSecurityPanel />
        <AuthRefreshRotationBoundaryPanel />
      </div>
    </>
  );
}
