import { getAdminSession } from "@/lib/auth";
import { AdminNav } from "@/components/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();

  return (
    <div className="flex-1 flex flex-col">
      {session && <AdminNav username={session.username} role={session.role} />}
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}
