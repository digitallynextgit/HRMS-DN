"use client"

import { Session } from "next-auth"
import { signOut } from "next-auth/react"
import { useTheme } from "next-themes"
import { Bell, LogOut, User, Sun, Moon, Monitor, ChevronDown } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { getInitials } from "@/lib/utils"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"

async function fetchUnreadCount() {
  const res = await fetch("/api/notifications/inbox?unread=true&limit=1")
  if (!res.ok) return 0
  const data = await res.json()
  return data.unreadCount ?? 0
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" aria-label="Toggle theme">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32 text-sm">
        <DropdownMenuItem onClick={() => setTheme("light")} className={cn("gap-2 cursor-pointer text-xs", theme === "light" && "font-medium text-foreground")}>
          <Sun className="h-3.5 w-3.5" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className={cn("gap-2 cursor-pointer text-xs", theme === "dark" && "font-medium text-foreground")}>
          <Moon className="h-3.5 w-3.5" /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} className={cn("gap-2 cursor-pointer text-xs", theme === "system" && "font-medium text-foreground")}>
          <Monitor className="h-3.5 w-3.5" /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function Topbar({ session }: { session: Session }) {
  const { firstName, lastName, email, profilePhoto } = session.user

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: fetchUnreadCount,
    refetchInterval: 30_000,
  })

  return (
    <header className="h-[57px] bg-background border-b border-border flex items-center justify-between px-4 shrink-0 sticky top-0 z-30">
      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <ThemeToggle />

        {/* Notifications */}
        <Link href="/notifications">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground relative" aria-label="Notifications">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-foreground opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-foreground" />
              </span>
            )}
          </Button>
        </Link>

        <div className="w-px h-4 bg-border mx-1" />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="h-6 w-6">
                <AvatarImage src={profilePhoto ?? undefined} />
                <AvatarFallback className="bg-foreground text-background text-[10px] font-semibold">
                  {getInitials(firstName, lastName)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden md:block">{firstName} {lastName}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground hidden md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal py-2">
              <div className="flex items-center gap-2.5">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={profilePhoto ?? undefined} />
                  <AvatarFallback className="bg-foreground text-background text-[10px] font-semibold">
                    {getInitials(firstName, lastName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium leading-tight">{firstName} {lastName}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[150px]">{email}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="cursor-pointer gap-2 text-sm">
                <User className="h-3.5 w-3.5" /> My Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer gap-2 text-sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
