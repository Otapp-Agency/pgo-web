'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

import { MoonIcon, SunIcon } from 'lucide-react'

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export function ThemeToggle() {
    const { theme, setTheme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    // Ensure component is mounted before accessing theme to avoid hydration mismatch
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true)
    }, [])

    // Use resolvedTheme when available, fallback to theme
    const currentTheme = resolvedTheme ?? theme
    // Always render unchecked on server to match initial client render
    const checked = mounted && currentTheme === 'dark'

    const handleCheckedChange = (isChecked: boolean) => {
        setTheme(isChecked ? 'dark' : 'light')
    }

    // Determine icon based on resolved theme, default to SunIcon during SSR
    const isDark = mounted && currentTheme === 'dark'

    return (
        <div className='inline-flex items-center gap-2'>
            <Switch
                id='theme-toggle'
                checked={checked}
                onCheckedChange={handleCheckedChange}
                aria-label='Toggle theme'
            />
            <Label htmlFor='theme-toggle'>
                <span className='sr-only'>Toggle theme</span>
                {isDark ? (
                    <MoonIcon className='size-4' aria-hidden='true' />
                ) : (
                    <SunIcon className='size-4' aria-hidden='true' />
                )}
            </Label>
        </div>
    )
}   
