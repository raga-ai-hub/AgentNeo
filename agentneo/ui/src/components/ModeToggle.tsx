import React from "react";
import { useTheme } from "@/contexts/ThemeContext"; // Custom hook to manage theme context
import { cn } from "@/lib/utils"; // Utility for conditional class names
import { Sun, Monitor, Moon } from "lucide-react"; // Icons from lucide-react library

// Define possible theme modes
type Mode = "light" | "system" | "dark";

export const ModeToggle: React.FC = () => {
  // Destructure theme and setTheme from custom ThemeContext
  const { setTheme, theme } = useTheme();

  // Function to handle theme changes
  const handleModeChange = (mode: Mode) => {
    setTheme(mode); // Update theme using context
    console.log(`Theme set to ${mode}`); // Log the change (optional)
  };

  return (
    <div
      // Wrapper for the mode toggle buttons
      className={cn(
        "flex items-center justify-center py-1 gap-1 rounded-full w-32 shadow-sm",
        theme === "light" && "bg-white", // Background for light theme
        theme === "dark" && "bg-gray-700", // Background for dark theme
        theme === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches &&
          "bg-gray-700", // Background for system theme (dark preference)
        theme === "system" &&
          window.matchMedia("(prefers-color-scheme: light)").matches &&
          "bg-white" // Background for system theme (light preference)
      )}
    >
      {/* Light Mode Button */}
      <button
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-full",
          theme === "light" ? "bg-blue-500 text-white" : "text-gray-600"
        )}
        onClick={() => handleModeChange("light")}
        aria-label="Light Mode" // Accessibility label
      >
        <Sun
          className="h-5 w-5" // Icon size
          color={theme === "light" ? "#ffffff" : "#9FA6B5"} // Dynamic icon color
        />
      </button>

      {/* System Default Mode Button */}
      <button
        className={cn(
          "flex items-center justify-center  w-8 h-8 rounded-full",
          theme === "system" ? "bg-blue-500 text-white" : "text-gray-600"
        )}
        onClick={() => handleModeChange("system")}
        aria-label="System Default Mode" // Accessibility label
      >
        <Monitor
          className="h-5 w-5" // Icon size
          color={theme === "system" ? "#ffffff" : "#9FA6B5"} // Dynamic icon color
        />
      </button>

      {/* Dark Mode Button */}
      <button
        className={cn(
          "flex items-center justify-center  w-8 h-8 rounded-full",
          theme === "dark" ? "bg-blue-500 text-white" : "text-gray-600"
        )}
        onClick={() => handleModeChange("dark")}
        aria-label="Dark Mode" // Accessibility label
      >
        <Moon
          className="h-5 w-5" // Icon size
          color={theme === "dark" ? "#ffffff" : "#9FA6B5"} // Dynamic icon color
        />
      </button>
    </div>
  );
};
