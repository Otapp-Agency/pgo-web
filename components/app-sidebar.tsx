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
import { menuConfig } from "@/lib/menu-config"
import { filterMenuItems } from "@/lib/menu-utils"
import { normalizeUserType } from "@/lib/auth/user-types"
import { Logo } from "@/components/logo"

export async function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = await getUserFromSession()
  const session = await verifySession()
  const userRoles = session?.roles || []
  // Normalize userType to handle different API formats
  const userType = normalizeUserType(session?.userType)

  // Filter menu items based on user roles and user type
  const filteredNavMain = filterMenuItems(menuConfig.navMain, userRoles, userType)

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
