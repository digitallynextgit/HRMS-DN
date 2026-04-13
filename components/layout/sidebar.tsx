"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Session } from "next-auth"
import {
  LayoutDashboard, Users, FileText, Bell, Shield, ScrollText,
  Mail, ChevronDown, PanelLeftClose, PanelLeft,
  Building2, Clock, CalendarDays, DollarSign, HelpCircle,
  FolderKanban, Star, Briefcase, BarChart3,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useSidebarStore } from "@/stores/sidebar-store"
import { PERMISSIONS } from "@/lib/constants"

interface NavItem {
  label: string
  href?: string
  icon: React.ElementType
  permission?: string
  children?: { label: string; href: string }[]
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: PERMISSIONS.DASHBOARD_READ },
  {
    label: "Employees", icon: Users, permission: PERMISSIONS.EMPLOYEE_READ,
    children: [
      { label: "Employee List", href: "/employees" },
      { label: "Org Chart", href: "/employees/org-chart" },
    ],
  },
  { label: "Documents", href: "/documents", icon: FileText, permission: PERMISSIONS.DOCUMENT_READ },
  {
    label: "Attendance", icon: Clock, permission: PERMISSIONS.ATTENDANCE_READ,
    children: [
      { label: "Overview", href: "/attendance" },
      { label: "My Attendance", href: "/attendance/me" },
      { label: "GPS Check-In", href: "/attendance/checkin" },
      { label: "QR Kiosk", href: "/attendance/kiosk" },
      { label: "CSV Import", href: "/attendance/import" },
      { label: "Devices", href: "/attendance/devices" },
      { label: "Holidays", href: "/attendance/holidays" },
    ],
  },
  {
    label: "Leave", icon: CalendarDays, permission: PERMISSIONS.LEAVE_READ,
    children: [
      { label: "My Leaves", href: "/leave" },
      { label: "Apply Leave", href: "/leave/apply" },
      { label: "Team Leaves", href: "/leave/team" },
      { label: "Leave Types", href: "/leave/types" },
    ],
  },
  {
    label: "Payroll", icon: DollarSign, permission: PERMISSIONS.PAYROLL_READ,
    children: [
      { label: "Overview", href: "/payroll" },
      { label: "My Payslips", href: "/payroll/me" },
      { label: "Salary Structures", href: "/payroll/salary-structures" },
    ],
  },
  {
    label: "Projects", icon: FolderKanban, permission: PERMISSIONS.PROJECT_READ,
    children: [
      { label: "All Projects", href: "/projects" },
      { label: "My Tasks", href: "/projects/my-tasks" },
    ],
  },
  {
    label: "Performance", icon: Star, permission: PERMISSIONS.PERFORMANCE_READ,
    children: [
      { label: "Reviews", href: "/performance" },
      { label: "My Review", href: "/performance/me" },
      { label: "Goals", href: "/performance/goals" },
    ],
  },
  {
    label: "Recruitment", icon: Briefcase, permission: PERMISSIONS.RECRUITMENT_READ,
    children: [
      { label: "Job Postings", href: "/recruitment" },
    ],
  },
  { label: "Analytics", href: "/analytics", icon: BarChart3, permission: PERMISSIONS.ANALYTICS_READ },
  { label: "Help & Guide", href: "/docs", icon: HelpCircle },
  { label: "Notifications", href: "/notifications", icon: Bell },
]

const ADMIN_ITEMS: NavItem[] = [
  { label: "Roles & Permissions", href: "/admin/roles", icon: Shield, permission: PERMISSIONS.ROLE_READ },
  { label: "Audit Log", href: "/admin/audit-log", icon: ScrollText, permission: PERMISSIONS.AUDIT_READ },
  { label: "Email Templates", href: "/admin/email-templates", icon: Mail, permission: PERMISSIONS.EMAIL_TEMPLATE_READ },
]

function canAccess(item: NavItem, permissions: string[], roles: string[]): boolean {
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
  const [open, setOpen] = useState(() =>
    item.children?.some((c) => pathname.startsWith(c.href)) ?? false
  )

  if (!canAccess(item, permissions, roles)) return null

  if (item.children) {
    const isActive = item.children.some((c) => pathname.startsWith(c.href))

    if (isCollapsed) {
      return (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "flex items-center justify-center h-8 w-8 rounded-md mx-auto cursor-pointer transition-colors",
                isActive
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}>
                <item.icon className="h-4 w-4" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs font-medium">{item.label}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "w-full flex items-center gap-2.5 px-2.5 h-8 rounded-md text-sm transition-colors",
            isActive
              ? "text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown className={cn(
            "h-3.5 w-3.5 opacity-50 transition-transform duration-150",
            open && "rotate-180"
          )} />
        </button>
        {open && (
          <div className="mt-0.5 ml-[26px] space-y-0.5 border-l border-border pl-3">
            {item.children.map((child) => {
              const childActive = pathname === child.href || pathname.startsWith(child.href + "/")
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={cn(
                    "block px-2 py-1.5 rounded-md text-[13px] transition-colors",
                    childActive
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
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
                "flex items-center justify-center h-8 w-8 rounded-md mx-auto transition-colors",
                isActive
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <item.icon className="h-4 w-4" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs font-medium">{item.label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Link
      href={item.href!}
      className={cn(
        "flex items-center gap-2.5 px-2.5 h-8 rounded-md text-sm transition-colors",
        isActive
          ? "bg-accent text-foreground font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
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

  return (
    <aside className={cn(
      "flex flex-col bg-background border-r border-border transition-all duration-200 shrink-0",
      isCollapsed ? "w-14" : "w-56"
    )}>
      {/* Logo */}
      <div className={cn(
        "flex items-center h-[57px] shrink-0 border-b border-border px-3",
        isCollapsed ? "justify-center" : "gap-2.5"
      )}>
        <div className="w-7 h-7 rounded-md bg-foreground flex items-center justify-center shrink-0">
          <Building2 className="h-3.5 w-3.5 text-background" />
        </div>
        {!isCollapsed && (
          <div>
            <p className="font-semibold text-foreground text-sm tracking-tight">HRMS</p>
            <p className="text-[10px] text-muted-foreground">Management System</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
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
              <p className="px-2.5 pt-4 pb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                Admin
              </p>
            ) : (
              <div className="border-t border-border my-2 mx-1" />
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

      {/* Collapse toggle */}
      <div className="border-t border-border p-2">
        <button
          onClick={toggle}
          className={cn(
            "flex items-center gap-2 w-full px-2.5 h-8 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
            isCollapsed && "justify-center"
          )}
        >
          {isCollapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
