import { AdminGate } from "@/components/admin/AdminGate";

// This is the only portal path intentionally reachable without a signed admin
// session. Successful login redirects to the protected dashboard.
export default function AdminLoginPage() {
  return <AdminGate forceLogin>{null}</AdminGate>;
}
