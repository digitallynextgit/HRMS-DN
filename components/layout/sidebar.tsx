"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Session } from "next-auth"
import {
  LayoutDashboard,
  Users,
  FileText,
  Bell,
  Shield,
  ScrollText,
  Mail,
  ChevronDown,
  Clock,
  CalendarDays,
  DollarSign,
  HelpCircle,
  FolderKanban,
  Star,
  Briefcase,
  BarChart3,
  Home,
  Network,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useSidebarStore } from "@/stores/sidebar-store"
import { PERMISSIONS } from "@/lib/constants"

interface NavChild {
  label: string
  href: string
  permission?: string
}

interface NavItem {
  label: string
  href?: string
  icon: React.ElementType
  permission?: string
  children?: NavChild[]
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    permission: PERMISSIONS.DASHBOARD_READ,
  },
  {
    label: "Employee",
    icon: Users,
    permission: PERMISSIONS.EMPLOYEE_READ,
    children: [
      { label: "Employee Directory", href: "/employees" },
      { label: "Bulk Import", href: "/employees/import", permission: PERMISSIONS.EMPLOYEE_WRITE },
      { label: "Departments", href: "/employees/departments" },
      { label: "Designations", href: "/employees/designations" },
    ],
  },
  // Org Chart is visible to ALL employees (no permission gate).
  { label: "Organisation Chart", href: "/employees/org-chart", icon: Network },
  { label: "Documents", href: "/documents", icon: FileText, permission: PERMISSIONS.DOCUMENT_READ },
  {
    label: "Attendance",
    icon: Clock,
    permission: PERMISSIONS.ATTENDANCE_READ,
    children: [
      { label: "Overview", href: "/attendance", permission: PERMISSIONS.ATTENDANCE_WRITE },
      { label: "My Attendance", href: "/attendance/me" },
      { label: "Imports", href: "/attendance/import", permission: PERMISSIONS.ATTENDANCE_WRITE },
      { label: "Devices", href: "/attendance/devices", permission: PERMISSIONS.ATTENDANCE_WRITE },
      { label: "Holidays", href: "/attendance/holidays" },
      { label: "Floating Holidays", href: "/attendance/floating-holidays" },
      { label: "Regularization", href: "/attendance/regularizations" },
    ],
  },
  {
    label: "Leave",
    icon: CalendarDays,
    permission: PERMISSIONS.LEAVE_READ,
    children: [
      { label: "My Leaves", href: "/leave" },
      { label: "Apply Leave", href: "/leave/apply" },
      { label: "Leave Calendar", href: "/leave/calendar" },
      { label: "Team Leaves", href: "/leave/team", permission: PERMISSIONS.LEAVE_APPROVE },
      { label: "Leave Types", href: "/leave/types", permission: PERMISSIONS.LEAVE_APPROVE },
    ],
  },
  {
    label: "Work From Home",
    icon: Home,
    permission: PERMISSIONS.WFH_READ,
    children: [
      { label: "My WFH", href: "/wfh" },
      { label: "Apply WFH", href: "/wfh/apply" },
      { label: "Team WFH", href: "/wfh/team", permission: PERMISSIONS.WFH_APPROVE },
    ],
  },
  {
    label: "Payroll",
    icon: DollarSign,
    permission: PERMISSIONS.PAYROLL_READ,
    children: [
      { label: "Overview", href: "/payroll", permission: PERMISSIONS.PAYROLL_WRITE },
      { label: "My Payslips", href: "/payroll/me" },
      {
        label: "Salary Structures",
        href: "/payroll/salary-structures",
        permission: PERMISSIONS.PAYROLL_WRITE,
      },
    ],
  },
  {
    label: "Projects",
    icon: FolderKanban,
    permission: PERMISSIONS.PROJECT_READ,
    children: [
      { label: "All Projects", href: "/projects" },
      { label: "My Tasks", href: "/projects/my-tasks" },
    ],
  },
  {
    label: "Performance",
    icon: Star,
    permission: PERMISSIONS.PERFORMANCE_READ,
    children: [
      { label: "Evaluations", href: "/performance/evaluations" },
      { label: "Reviews", href: "/performance" },
      { label: "My Review", href: "/performance/me" },
      { label: "Goals", href: "/performance/goals" },
      { label: "KPIs", href: "/performance/kpis", permission: PERMISSIONS.PERFORMANCE_REVIEW },
    ],
  },
  {
    label: "Recruitment",
    icon: Briefcase,
    permission: PERMISSIONS.RECRUITMENT_READ,
    children: [{ label: "Job Postings", href: "/recruitment" }],
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    permission: PERMISSIONS.ANALYTICS_READ,
  },
  { label: "Help & Guide", href: "/docs", icon: HelpCircle },
  { label: "Notifications", href: "/notifications", icon: Bell },
]

const ADMIN_ITEMS: NavItem[] = [
  {
    label: "Roles & Permissions",
    href: "/admin/roles",
    icon: Shield,
    permission: PERMISSIONS.ROLE_READ,
  },
  {
    label: "Audit Log",
    href: "/admin/audit-log",
    icon: ScrollText,
    permission: PERMISSIONS.AUDIT_READ,
  },
  {
    label: "Email Templates",
    href: "/admin/email-templates",
    icon: Mail,
    permission: PERMISSIONS.EMAIL_TEMPLATE_READ,
  },
  {
    label: "Project Settings",
    href: "/admin/project-settings",
    icon: FolderKanban,
    permission: PERMISSIONS.PROJECT_WRITE,
  },
]

function canAccess(
  item: { permission?: string },
  permissions: string[],
  roles: string[],
): boolean {
  if (roles.includes("super_admin")) return true
  if (!item.permission) return true
  return permissions.includes(item.permission)
}

interface SidebarNavItemProps {
  item: NavItem
  isCollapsed: boolean
  permissions: string[]
  roles: string[]
}

function SidebarNavItem({ item, isCollapsed, permissions, roles }: SidebarNavItemProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(
    () => item.children?.some((c) => pathname.startsWith(c.href)) ?? false,
  )

  if (!canAccess(item, permissions, roles)) return null

  if (item.children) {
    // Hide individual sub-items the user lacks permission for; hide the whole
    // group if nothing is left visible.
    const visibleChildren = item.children.filter((c) => canAccess(c, permissions, roles))
    if (visibleChildren.length === 0) return null
    const isActive = visibleChildren.some((c) => pathname.startsWith(c.href))

    if (isCollapsed) {
      return (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "mx-auto flex h-8 w-8 cursor-pointer items-center justify-center rounded transition-colors",
                  isActive
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent",
                )}
              >
                <item.icon className="h-4 w-4" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs font-medium">
              {item.label}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "flex h-8 w-full items-center gap-2.5 rounded px-2.5 text-sm transition-colors",
            isActive
              ? "text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-accent",
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 opacity-50 transition-transform duration-150",
              open && "rotate-180",
            )}
          />
        </button>
        {open && (
          <div className="border-border mt-0.5 ml-[26px] space-y-0.5 border-l pl-3">
            {visibleChildren.map((child) => {
              const childActive = pathname === child.href || pathname.startsWith(child.href + "/")
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={cn(
                    "block rounded px-2 py-1.5 text-[13px] transition-colors",
                    childActive
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent",
                  )}
                >
                  {child.label}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const isActive = item.href
    ? pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"))
    : false

  if (isCollapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={item.href!}
              className={cn(
                "mx-auto flex h-8 w-8 items-center justify-center rounded transition-colors",
                isActive
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
            >
              <item.icon className="h-4 w-4" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Link
      href={item.href!}
      className={cn(
        "flex h-8 items-center gap-2.5 rounded px-2.5 text-sm transition-colors",
        isActive
          ? "bg-accent text-foreground font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-accent",
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  )
}

export function Sidebar({ session }: { session: Session }) {
  const { isCollapsed, toggle } = useSidebarStore()
  const permissions = session.user.permissions
  const roles = session.user.roles

  // Ctrl+B (Windows/Linux) and Cmd+B (macOS) toggle the sidebar.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "b") {
        const target = e.target as HTMLElement | null
        const tag = target?.tagName
        const isEditable =
          tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable
        if (isEditable) return
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [toggle])

  return (
    <aside
      className={cn(
        "bg-background border-border flex h-full min-h-0 shrink-0 flex-col border-r transition-all duration-200",
        isCollapsed ? "w-14" : "w-56",
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "border-border flex h-[57px] shrink-0 items-center border-b px-3",
          isCollapsed ? "justify-center" : "gap-2.5",
        )}
      >
        <Image
          src="/brand-mark.png"
          alt="DNMS"
          width={2505}
          height={2200}
          className="h-7 w-7 shrink-0 object-contain"
        />
        {!isCollapsed && (
          <div>
            <p className="text-foreground text-sm font-semibold tracking-tight">DNMS</p>
            <p className="text-muted-foreground text-[10px]">Management System</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {NAV_ITEMS.map((item) => (
          <SidebarNavItem
            key={item.label}
            item={item}
            isCollapsed={isCollapsed}
            permissions={permissions}
            roles={roles}
          />
        ))}

        {/* Admin section */}
        {ADMIN_ITEMS.some((item) => canAccess(item, permissions, roles)) && (
          <>
            {!isCollapsed ? (
              <p className="text-muted-foreground px-2.5 pt-4 pb-1 text-[10px] font-medium tracking-widest uppercase">
                Admin
              </p>
            ) : (
              <div className="border-border mx-1 my-2 border-t" />
            )}
            {ADMIN_ITEMS.map((item) => (
              <SidebarNavItem
                key={item.label}
                item={item}
                isCollapsed={isCollapsed}
                permissions={permissions}
                roles={roles}
              />
            ))}
          </>
        )}
      </nav>
    </aside>
  )
}
