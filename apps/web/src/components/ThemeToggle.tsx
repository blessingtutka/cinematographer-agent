import { Monitor, Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import { type Theme, useTheme } from "@/providers/theme.provider"

const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light theme", icon: Sun },
  { value: "dark", label: "Dark theme", icon: Moon },
  { value: "system", label: "System theme", icon: Monitor },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div
      className="flex items-center gap-0.5 rounded-xl border border-border/70 bg-muted/40 p-1 shadow-sm backdrop-blur-sm"
      aria-label="Theme selection"
    >
      {themeOptions.map((option) => {
        const OptionIcon = option.icon
        const isActive = theme === option.value

        return (
          <Button
            key={option.value}
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={option.label}
            aria-pressed={isActive}
            onClick={() => setTheme(option.value)}
            className={`
              relative h-8 w-8 rounded-lg transition-all duration-200
              ${
                isActive
                  ? "bg-background text-primary shadow-sm ring-1 ring-border/80"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
              }
            `}
          >
            <OptionIcon
              className={`size-4 transition-all duration-200 ${
                isActive ? "scale-110" : "scale-100"
              }`}
            />

            {isActive && (
              <span className="absolute -bottom-0.5 left-1/2 h-0.5 w-3 -translate-x-1/2 rounded-full bg-primary" />
            )}
          </Button>
        )
      })}
    </div>
  )
}
