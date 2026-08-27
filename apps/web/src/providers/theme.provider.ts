import {
  createContext,
  createElement,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react"

export type Theme = "light" | "dark" | "system"

type ThemeContextValue = {
  theme: Theme
  resolvedTheme: "light" | "dark"
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)
const themeStorageKey = "cinematographer.theme"

function getStoredTheme(): Theme {
  const storedTheme = window.localStorage.getItem(themeStorageKey)
  return storedTheme === "light" || storedTheme === "dark" || storedTheme === "system"
    ? storedTheme
    : "dark"
}

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme)
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(getSystemTheme)
  const resolvedTheme = theme === "system" ? systemTheme : theme

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark")
    document.documentElement.style.colorScheme = resolvedTheme

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      const handleChange = (event: MediaQueryListEvent) => {
        const systemTheme = event.matches ? "dark" : "light"
        document.documentElement.classList.toggle("dark", systemTheme === "dark")
        document.documentElement.style.colorScheme = systemTheme
        setSystemTheme(systemTheme)
      }
      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    }
  }, [resolvedTheme, theme])

  function setTheme(nextTheme: Theme) {
    window.localStorage.setItem(themeStorageKey, nextTheme)
    setThemeState(nextTheme)
  }

  return createElement(
    ThemeContext.Provider,
    { value: { theme, resolvedTheme, setTheme } },
    children,
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
