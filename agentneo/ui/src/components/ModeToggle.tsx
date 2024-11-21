// import { Moon, Sun } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { useTheme } from "@/components/ThemeProvider";

// export function ModeToggle() {
//   const { setTheme } = useTheme();

//   return (
//     <DropdownMenu>
//     <DropdownMenuTrigger asChild>
//       <Button 
//         variant="ghost" 
//         size="icon"
//         className="ml-2 bg-white/10 hover:bg-white/20 border-white/10 backdrop-blur-sm"
//       >
//         <Sun className="h-5 w-5 rotate-0 scale-100 transition-transform duration-200 text-white dark:-rotate-90 dark:scale-0" />
//         <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-transform duration-200 text-white dark:rotate-0 dark:scale-100" />
//         <span className="sr-only">Toggle theme</span>
//       </Button>
//     </DropdownMenuTrigger>
//     <DropdownMenuContent align="end" className="mt-2">
//       <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer">
//         <Sun className="h-4 w-4 mr-2" />
//         Light
//       </DropdownMenuItem>
//       <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer">
//         <Moon className="h-4 w-4 mr-2" />
//         Dark
//       </DropdownMenuItem>
//       <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer">
//         <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
//           <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
//         </svg>
//         System
//       </DropdownMenuItem>
//     </DropdownMenuContent>
//   </DropdownMenu>
//   );
// };

// export default ModeToggle;


// import { Moon, Sun } from "lucide-react";
// import { useTheme } from "@/components/ThemeProvider";
// import { useSidebar } from "../contexts/SidebarContext";

// export function ModeToggle() {
//   const { theme, setTheme } = useTheme();
//   const { isCollapsed } = useSidebar();

//   const toggleTheme = () => {
//     setTheme(theme === 'dark' ? 'light' : 'dark');
//   };

//   return (
//     <div 
//       className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} w-full`}
//     >
//       <button 
//         onClick={toggleTheme}
//         className={`relative w-16 h-8 rounded-full 
//           ${theme === 'dark' ? 'bg-purple-600' : 'bg-yellow-400'}
//           transition-colors duration-300 
//           flex items-center 
//           ${isCollapsed ? 'justify-center' : 'justify-between'}
//           p-1
//         `}
//       >
//         {/* Sliding circle */}
//         <div 
//           className={`absolute w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300
//             ${theme === 'dark' ? 'translate-x-8' : 'translate-x-0'}
//           `}
//         >
//           {theme === 'dark' ? (
//             <Moon className="w-full h-full p-1 text-purple-600" />
//           ) : (
//             <Sun className="w-full h-full p-1 text-yellow-400" />
//           )}
//         </div>

//         {/* Only show full labels when not collapsed */}
//         {!isCollapsed && (
//           <div className="flex w-full justify-between px-2 text-white">
//             <Sun className="w-4 h-4" />
//             <Moon className="w-4 h-4" />
//           </div>
//         )}
//       </button>
//     </div>
//   );
// }

// export default ModeToggle;



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