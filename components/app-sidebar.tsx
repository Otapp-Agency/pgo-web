import * as React from "react"
import { IconInnerShadowTop } from "@tabler/icons-react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { getUserFromSession } from "@/lib/dal"

const navData = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: "IconDashboard",
    },
    {
      title: "Lifecycle",
      url: "#",
      icon: "IconListDetails",
    },
    {
      title: "Analytics",
      url: "#",
      icon: "IconChartBar",
    },
    {
      title: "Projects",
      url: "#",
      icon: "IconFolder",
    },
    {
      title: "Team",
      url: "#",
      icon: "IconUsers",
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: "IconSettings",
    },
    {
      title: "Get Help",
      url: "#",
      icon: "IconHelp",
    },
    {
      title: "Search",
      url: "#",
      icon: "IconSearch",
    },
  ],
  documents: [
    {
      name: "Data Library",
      url: "#",
      icon: "IconDatabase",
    },
    {
      name: "Reports",
      url: "#",
      icon: "IconReport",
    },
    {
      name: "Word Assistant",
      url: "#",
      icon: "IconFileWord",
    },
  ],
}

export async function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = await getUserFromSession()
  
  const userData = user ? {
    name: user.name,
    email: user.email,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`,
  } : {
    name: "Guest",
    email: "",
    avatar: "",
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/dashboard">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">Acme Inc.</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navData.navMain} />
        <NavDocuments items={navData.documents} />
        <NavSecondary items={navData.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        {user && <NavUser user={userData} />}
      </SidebarFooter>
    </Sidebar>
  )
}
