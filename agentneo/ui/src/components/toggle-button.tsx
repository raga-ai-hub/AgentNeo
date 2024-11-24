import React from "react";
import { useTheme } from "./theme-provider";
import { FiSun, FiMoon } from "react-icons/fi";

const ThemeToggleButton: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={`flex items-top transition-colors ${
      theme === "dark" ? "bg-gray-800" : "bg-gray-100"
    }`}>
      
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={theme === "dark"}
          onChange={toggleTheme}
        />
        <div className="w-20 h-10 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:bg-gray-700 transition-colors">
          <div
            className={`absolute top-0.5 left-1 h-8 w-8 flex items-center justify-center rounded-full bg-white border border-purple-900 shadow-sm transition-transform ${
              theme === "dark" ? "translate-x-10" : ""
            }`}
          >
            {theme === "light" ? (
              <span className="text-yellow-500 text-2xl" >
                <FiSun/>
              </span>

            ) : (
              <span className="text-blue-500 text-2xl" >
                <FiMoon/>
              </span>
            )}
          </div>
        </div>
      </label>
    </div>
  );
};

export default ThemeToggleButton;