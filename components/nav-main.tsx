"use client"

import {
  IconCirclePlusFilled,
  IconMail,
  IconDashboard,
  IconListDetails,
  IconChartBar,
  IconFolder,
  IconUsers,
  IconCreditCard,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  IconDashboard,
  IconListDetails,
  IconChartBar,
  IconFolder,
  IconUsers,
  IconCreditCard,
}

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: string
  }[]
}) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => {
            const IconComponent = item.icon ? iconMap[item.icon] : null
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton tooltip={item.title} asChild={!!item.url && item.url !== '#'}>
                  {item.url && item.url !== '#' ? (
                    <a href={item.url}>
                      {IconComponent && <IconComponent />}
                      <span>{item.title}</span>
                    </a>
                  ) : (
                    <>
                      {IconComponent && <IconComponent />}
                      <span>{item.title}</span>
                    </>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
