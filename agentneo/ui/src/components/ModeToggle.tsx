import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useSidebar } from "../contexts/SidebarContext";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const { isCollapsed } = useSidebar();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  if (isCollapsed) {
    return (
      <button 
        onClick={toggleTheme}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
      >
        {theme === 'dark' ? (
          <Moon className="w-5 h-5 text-white" />
        ) : (
          <Sun className="w-5 h-5 text-white" />
        )}
      </button>
    );
  }

  return (
    <div className="w-full">
      <button 
        onClick={toggleTheme}
        className={`relative w-16 h-8 rounded-full 
          ${theme === 'dark' ? 'bg-purple-600' : 'bg-yellow-400'}
          transition-colors duration-300 
          flex items-center 
          justify-between
          p-1
        `}
      >
        {/* Sliding circle */}
        <div 
          className={`absolute w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300
            ${theme === 'dark' ? 'translate-x-8' : 'translate-x-0'}
          `}
        >
          {theme === 'dark' ? (
            <Moon className="w-full h-full p-1 text-purple-600" />
          ) : (
            <Sun className="w-full h-full p-1 text-yellow-400" />
          )}
        </div>

        <div className="flex w-full justify-between px-2 text-white">
          <Sun className="w-4 h-4" />
          <Moon className="w-4 h-4" />
        </div>
      </button>
    </div>
  );
}

export default ModeToggle;