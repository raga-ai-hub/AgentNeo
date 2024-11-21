import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeStyles = () => {
  return (
    <style>
      {`
        /* Light theme defaults */
        :root {
          --input-background: #ffffff;
          --input-text: #000000;
          --input-border: #e2e8f0;
          --input-placeholder: #94a3b8;
        }
        /* Dark theme overrides */
        :root[class~="dark"] {
          --input-background: #1e293b;
          --input-text: #e2e8f0;
          --input-border: #334155;
          --input-placeholder: #64748b;
        }
        /* Apply variables to form elements */
        input:not([type="submit"]):not([type="button"]):not([type="radio"]):not([type="checkbox"]),
        textarea,
        select {
          background-color: var(--input-background) !important;
          color: var(--input-text) !important;
          border-color: var(--input-border) !important;
        }
        /* Style placeholder text */
        input::placeholder,
        textarea::placeholder {
          color: var(--input-placeholder) !important;
        }
        /* Style autofill */
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        textarea:-webkit-autofill,
        textarea:-webkit-autofill:hover,
        textarea:-webkit-autofill:focus,
        select:-webkit-autofill,
        select:-webkit-autofill:hover,
        select:-webkit-autofill:focus {
          -webkit-text-fill-color: var(--input-text) !important;
          -webkit-box-shadow: 0 0 0px 1000px var(--input-background) inset !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}
    </style>
  );
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      <ThemeStyles />
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};