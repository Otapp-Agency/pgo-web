import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { getUserFromSession } from "@/lib/auth/services/auth.service"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { logout } from "@/app/(auth)/actions/auth.actions"
import { LogOut, User } from "lucide-react"
import { ThemeSwitcher } from "./ui/shadcn-io/theme-switcher"
import { ThemeToggle } from "./theme-toggle"

export async function SiteHeader() {
  const user = await getUserFromSession()

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) sticky top-0 z-40 backdrop-blur-2xl">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        {/* <div className="ml-auto flex items-center gap-2">
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {user.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">{user.username}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.username}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    {user.role && user.role.length > 0 && (
                      <p className="text-xs leading-none text-muted-foreground mt-1">
                        {user.role}
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/dashboard/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <form action={logout}>
                  <DropdownMenuItem asChild>
                    <button type="submit" className="w-full flex items-center">
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </button>
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div> */}
        <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
