"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Toggle } from "@/components/ui/toggle"
import { Moon, Sun } from "lucide-react"

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()

  // evita flicker/hydration
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const isDark = (resolvedTheme ?? theme) === "dark"

  return (
    <Toggle
      pressed={isDark}
      onPressedChange={(pressed) => setTheme(pressed ? "dark" : "light")}
      variant="outline"
      className="
        gap-2
        border-[rgb(var(--border))]
        bg-[rgb(var(--card))]
        text-[rgb(var(--text))]
      "
      aria-label="Alternar tema"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      <span className="text-sm">{isDark ? "Claro" : "Escuro"}</span>
    </Toggle>
  )
}
