import { auth } from "@/lib/auth-options"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar session={session} />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Topbar session={session} />
        <main className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </main>
      </div>
    </div>
  )
}
