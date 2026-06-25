import { AuthPanel, AuthSessionSecurityPanel } from "@/features/auth/components";

export default function SignupPage() {
  return (
    <>
      <AuthPanel mode="signup" />
      <div className="page-grid">
        <AuthSessionSecurityPanel />
      </div>
    </>
  );
}
