import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { getUserFromSession, verifySession } from "@/lib/auth/services/auth.service"
import { getMenuConfigForUserType, type PortalType } from "@/lib/menu-config"
import { filterMenuItems } from "@/lib/menu-utils"
import { Logo } from "@/components/logo"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  portal?: PortalType
}

export async function AppSidebar({ ...props }: AppSidebarProps) {
  const user = await getUserFromSession()
  const session = await verifySession()
  const userRoles = session?.roles || []
  const userType = session?.userType

  // Get menu config based on user type
  // Note: portal prop reserved for future use (explicit override)
  const menuConfig = getMenuConfigForUserType(userType)

  // Filter menu items based on user roles
  const filteredNavMain = filterMenuItems(menuConfig.navMain, userRoles)

  const userData = user ? {
    name: `${user.firstName} ${user.lastName}`.trim() || user.username,
    email: user.email,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(`${user.firstName} ${user.lastName}`.trim() || user.username)}&background=random`,
  } : {
    name: "Guest",
    email: "",
    avatar: "",
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <Logo />
      </SidebarHeader>
      <SidebarSeparator className="w-fit mx-1" />
      <SidebarContent>
        <NavMain items={filteredNavMain} />
      </SidebarContent>
      <SidebarFooter>
        {user && <NavUser user={userData} />}
      </SidebarFooter>
    </Sidebar>
  )
}
