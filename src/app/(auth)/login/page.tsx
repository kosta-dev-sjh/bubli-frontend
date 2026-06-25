import { AuthPanel, AuthRefreshRotationBoundaryPanel, AuthSessionSecurityPanel } from "@/features/auth/components";

export default function LoginPage() {
  return (
    <>
      <AuthPanel />
      <div className="page-grid">
        <AuthSessionSecurityPanel />
        <AuthRefreshRotationBoundaryPanel />
      </div>
    </>
  );
}
