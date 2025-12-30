'use client'

import { useTRPC } from '@/lib/trpc/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { useMutation } from '@tanstack/react-query'

export function LogoutButton() {
  const router = useRouter()
  const trpc = useTRPC()

  const logoutMutation = useMutation(trpc.auth.logout.mutationOptions({
    onSuccess: (data) => {
      if (data.success) {
        router.push(data.redirectTo || '/login')
      }
    },
    onError: (error: unknown) => {
      console.error('Logout error:', error)
      // Still redirect on error to clear any stale state
      router.push('/login')
    },
  }))

  const handleLogout = () => {
    logoutMutation.mutate()
  }

  return (
    <DropdownMenuItem onClick={handleLogout} disabled={logoutMutation.isPending}>
      <LogOut className="mr-2 h-4 w-4" />
      Log out
    </DropdownMenuItem>
  )
}

