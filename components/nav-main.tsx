"use client"

import {
  IconDashboard,
  IconListDetails,
  IconChartBar,
  IconFolder,
  IconUsers,
  IconCreditCard,
  IconChevronRight,
  IconFingerprint,
} from "@tabler/icons-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  IconDashboard,
  IconListDetails,
  IconChartBar,
  IconFolder,
  IconUsers,
  IconCreditCard,
  IconFingerprint,
}

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: string
    subItems?: {
      title: string
      url: string
      icon?: string
    }[]
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
                {item.subItems ? (
                  <Collapsible defaultOpen={false} className="group/collapsible">
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={item.title}>
                        {IconComponent && <IconComponent />}
                        <span>{item.title}</span>
                        <IconChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.subItems.map((subItem) => {
                          const SubIconComponent = subItem.icon ? iconMap[subItem.icon] : null
                          return (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton asChild>
                                <a href={subItem.url}>
                                  {SubIconComponent && <SubIconComponent />}
                                  <span>{subItem.title}</span>
                                </a>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
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
                )}
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}