// import React from 'react'
// import { ScrollArea } from '@/components/ui/scroll-area'
// import {
//   ChevronLeft,
//   ChevronRight,
//   LayoutDashboard,
//   PieChart,
//   History,
//   ClipboardCheck,
//   BookOpen,
//   Github
// } from 'lucide-react'
// import { useSidebar } from '../contexts/SidebarContext'
// import { SidebarLink, SidebarExternalLink } from './SidebarComponents'
// import { ModeToggle } from '@/components/ModeToggle'


// const Sidebar: React.FC = () => {
//   const { isCollapsed, toggleSidebar } = useSidebar()

//   return (
//     <aside
//       className={`bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-400 text-white p-6 relative overflow-visible flex flex-col border-r border-white border-opacity-20 transition-all duration-300 ${
//         isCollapsed ? 'w-sidebar-collapsed' : 'w-sidebar-expanded'
//       } fixed h-full`}
//     >
//       <div className='absolute inset-0 bg-black opacity-10'></div>
//       <div className='absolute inset-0 backdrop-blur-sm bg-white bg-opacity-5'></div>
//       <div className='absolute inset-0 bg-gradient-to-tr from-transparent via-white to-transparent opacity-5'></div>
//       <div className='relative z-10 flex-grow'>
//         <div className='flex items-center justify-between mb-100'>
//           <div className='flex items-center'>
//             <img
//               src='/assets/logo.png'
//               alt='RagaAI Logo'
//               className={`w-10 h-10 ${isCollapsed ? 'mx-auto' : 'mr-3'}`}
//             />
//             {!isCollapsed && (
//               <div>
//                 <h1 className='text-2xl font-bold'>AgentNeo</h1>
//                 <p className='text-sm text-white text-opacity-80 -mt-1'>
//                   by{' '}
//                   <a
//                     href='https://raga.ai'
//                     target='_blank'
//                     rel='noopener noreferrer'
//                     className='hover:underline'
//                   >
//                     RagaAI
//                   </a>
//                 </p>
//                 </div>
//             )}
//             {!isCollapsed && <ModeToggle />}
//           </div>
//         </div>
//         <ScrollArea className='h-[calc(100vh-16rem)]'>
//           <nav>
//             <ul className='space-y-4'>
//               <SidebarLink
//                 to='/'
//                 icon={LayoutDashboard}
//                 text='Overview'
//                 isCollapsed={isCollapsed}
//               />
//               <SidebarLink
//                 to='/analysis'
//                 icon={PieChart}
//                 text='Analytics'
//                 isCollapsed={isCollapsed}
//               />
//               <SidebarLink
//                 to='/trace-history'
//                 icon={History}
//                 text='Trace History'
//                 isCollapsed={isCollapsed}
//               />
//               <SidebarLink
//                 to='/evaluation'
//                 icon={ClipboardCheck}
//                 text='Evaluation'
//                 isCollapsed={isCollapsed}
//               />
//               </ul>
//           </nav>
//         </ScrollArea>
//       </div>

//       <div className='relative z-10 mt-auto pt-6 border-t border-white border-opacity-20'>
//         <ul className='space-y-4'>
//           <SidebarExternalLink
//             href='https://docs.raga.ai/agentneo'
//             icon={BookOpen}
//             text='Documentation'
//             isCollapsed={isCollapsed}
//           />
//           <SidebarExternalLink
//             href='https://github.com/raga-ai-hub/agentneo'
//             icon={Github}
//             text='Code Repository'
//             isCollapsed={isCollapsed}
//           />
//           </ul>
//       </div>

//       <div className='absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full opacity-5 -mb-16 -ml-16'></div>
//       <button
//         onClick={toggleSidebar}
//         className={`absolute -right-6 top-1/2 transform -translate-y-1/2 w-12 h-12 rounded-full bg-gray-800 text-white flex items-center justify-center transition-all duration-200 z-20 focus:outline-none`}
//       >
//         <div className='absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-400 rounded-full opacity-80'></div>
//         {isCollapsed ? (
//           <ChevronRight className='h-6 w-6 relative z-10' />
//         ) : (
//           <ChevronLeft className='h-6 w-6 relative z-10' />
//         )}
//       </button>
//     </aside>
//   );
// };

// export default Sidebar;




// import React from 'react'
// import { ScrollArea } from '@/components/ui/scroll-area'
// import {
//   ChevronLeft,
//   ChevronRight,
//   LayoutDashboard,
//   PieChart,
//   History,
//   ClipboardCheck,
//   BookOpen,
//   Github
// } from 'lucide-react'
// import { useSidebar } from '../contexts/SidebarContext'
// import { SidebarLink, SidebarExternalLink } from './SidebarComponents'
// import { ModeToggle } from '@/components/ModeToggle'

// const Sidebar: React.FC = () => {
//   const { isCollapsed, toggleSidebar } = useSidebar()

//   return (
//     <aside
//       className={`bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-400 text-white p-6 relative overflow-visible flex flex-col border-r border-white border-opacity-20 transition-all duration-300 ${
//         isCollapsed ? 'w-sidebar-collapsed' : 'w-sidebar-expanded'
//       } fixed h-full`}
//     >
//       <div className='absolute inset-0 bg-black opacity-10'></div>
//       <div className='absolute inset-0 backdrop-blur-sm bg-white bg-opacity-5'></div>
//       <div className='absolute inset-0 bg-gradient-to-tr from-transparent via-white to-transparent opacity-5'></div>
//       <div className='relative z-10 flex-grow'>
//         <div className='flex items-center justify-between mb-100'>
//           <div className='flex items-center'>
//             <img
//               src='/assets/logo.png'
//               alt='RagaAI Logo'
//               className={`w-10 h-10 ${isCollapsed ? 'mx-auto' : 'mr-3'}`}
//             />
//             {!isCollapsed && (
//               <div>
//                 <h1 className='text-2xl font-bold'>AgentNeo</h1>
//                 <p className='text-sm text-white text-opacity-80 -mt-1'>
//                   by{' '}
//                   <a
//                     href='https://raga.ai'
//                     target='_blank'
//                     rel='noopener noreferrer'
//                     className='hover:underline'
//                   >
//                     RagaAI
//                   </a>
//                 </p>
//               </div>
//             )}
//           </div>
//         </div>
//         <ScrollArea className='h-[calc(100vh-16rem)]'>
//           <nav>
//             <ul className='space-y-4'>
//               <SidebarLink
//                 to='/'
//                 icon={LayoutDashboard}
//                 text='Overview'
//                 isCollapsed={isCollapsed}
//               />
//               <SidebarLink
//                 to='/analysis'
//                 icon={PieChart}
//                 text='Analytics'
//                 isCollapsed={isCollapsed}
//               />
//               <SidebarLink
//                 to='/trace-history'
//                 icon={History}
//                 text='Trace History'
//                 isCollapsed={isCollapsed}
//               />
//               <SidebarLink
//                 to='/evaluation'
//                 icon={ClipboardCheck}
//                 text='Evaluation'
//                 isCollapsed={isCollapsed}
//               />
//             </ul>
//           </nav>
//         </ScrollArea>
//       </div>

//       <div className='relative z-10 mt-auto pt-6 border-t border-white border-opacity-20'>
//         <ModeToggle />
//         <ul className='space-y-4 mt-4'>
//           <SidebarExternalLink
//             href='https://docs.raga.ai/agentneo'
//             icon={BookOpen}
//             text='Documentation'
//             isCollapsed={isCollapsed}
//           />
//           <SidebarExternalLink
//             href='https://github.com/raga-ai-hub/agentneo'
//             icon={Github}
//             text='Code Repository'
//             isCollapsed={isCollapsed}
//           />
//         </ul>
//       </div>

//       <div className='absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full opacity-5 -mb-16 -ml-16'></div>
//       <button
//         onClick={toggleSidebar}
//         className={`absolute -right-6 top-1/2 transform -translate-y-1/2 w-12 h-12 rounded-full bg-gray-800 text-white flex items-center justify-center transition-all duration-200 z-20 focus:outline-none`}
//       >
//         <div className='absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-400 rounded-full opacity-80'></div>
//         {isCollapsed ? (
//           <ChevronRight className='h-6 w-6 relative z-10' />
//         ) : (
//           <ChevronLeft className='h-6 w-6 relative z-10' />
//         )}
//       </button>
//     </aside>
//   );
// };

// export default Sidebar;



import React from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  PieChart,
  History,
  ClipboardCheck,
  BookOpen,
  Github
} from 'lucide-react'
import { useSidebar } from '../contexts/SidebarContext'
import { SidebarLink, SidebarExternalLink } from './SidebarComponents'
import { ModeToggle } from '@/components/ModeToggle'
import { useTheme } from '@/components/ThemeProvider'

const Sidebar: React.FC = () => {
  const { isCollapsed, toggleSidebar } = useSidebar()
  const { theme } = useTheme()

  return (
    <aside
      className={`
        bg-gradient-to-br 
        ${theme === 'dark' 
          ? 'from-[#1e293b] via-[#283541] to-[#334155]' 
          : 'from-indigo-600 via-purple-600 to-pink-400'}
        text-white 
        p-6 
        relative 
        overflow-visible 
        flex 
        flex-col 
        border-r 
        border-white 
        border-opacity-20 
        transition-all 
        duration-300 
        ${isCollapsed ? 'w-sidebar-collapsed' : 'w-sidebar-expanded'}
        fixed 
        h-full
      `}
    >
      {/* Background layers */}
      <div 
        className={`
          absolute 
          inset-0 
          bg-black 
          ${theme === 'dark' ? 'opacity-30' : 'opacity-10'}
        `}
      ></div>
      <div 
        className={`
          absolute 
          inset-0 
          backdrop-blur-sm 
          ${theme === 'dark' 
            ? 'bg-black bg-opacity-40' 
            : 'bg-white bg-opacity-5'}
        `}
      ></div>
      <div 
        className={`
          absolute 
          inset-0 
          bg-gradient-to-tr 
          from-transparent 
          via-white 
          to-transparent 
          ${theme === 'dark' ? 'opacity-10' : 'opacity-5'}
        `}
      ></div>

      {/* Sidebar Content */}
      <div className='relative z-10 flex-grow'>
        <div className='flex items-center justify-between mb-100'>
          <div className='flex items-center'>
            <img
              src='/assets/logo.png'
              alt='RagaAI Logo'
              className={`w-10 h-10 ${isCollapsed ? 'mx-auto' : 'mr-3'}`}
            />
            {!isCollapsed && (
              <div>
                <h1 
                  className={`
                    text-2xl 
                    font-bold 
                    ${theme === 'dark' ? 'text-white' : 'text-white'}
                  `}
                >
                  AgentNeo
                </h1>
                <p 
                  className={`
                    text-sm 
                    ${theme === 'dark' 
                      ? 'text-white text-opacity-80' 
                      : 'text-white text-opacity-80'}
                    -mt-1
                  `}
                >
                  by{' '}
                  <a
                    href='https://raga.ai'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='hover:underline'
                  >
                    RagaAI
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>

        <ScrollArea className='h-[calc(100vh-16rem)]'>
          <nav>
            <ul className='space-y-4'>
              <SidebarLink
                to='/'
                icon={LayoutDashboard}
                text='Overview'
                isCollapsed={isCollapsed}
              />
              <SidebarLink
                to='/analysis'
                icon={PieChart}
                text='Analytics'
                isCollapsed={isCollapsed}
              />
              <SidebarLink
                to='/trace-history'
                icon={History}
                text='Trace History'
                isCollapsed={isCollapsed}
              />
              <SidebarLink
                to='/evaluation'
                icon={ClipboardCheck}
                text='Evaluation'
                isCollapsed={isCollapsed}
              />
            </ul>
          </nav>
        </ScrollArea>
      </div>

      {/* Sidebar Footer */}
      <div 
        className={`
          relative 
          z-10 
          mt-auto 
          pt-6 
          border-t 
          border-white 
          ${theme === 'dark' 
            ? 'border-opacity-10' 
            : 'border-opacity-20'}
        `}
      >
  
        <ModeToggle />
        
        <ul className='space-y-4 mt-4'>
          
          <SidebarExternalLink
            href='https://docs.raga.ai/agentneo'
            icon={BookOpen}
            text='Documentation'
            isCollapsed={isCollapsed}
          />
          <SidebarExternalLink
            href='https://github.com/raga-ai-hub/agentneo'
            icon={Github}
            text='Code Repository'
            isCollapsed={isCollapsed}
          />
        </ul>
      </div>

      {/* Decorative elements */}
      <div 
        className={`
          absolute 
          bottom-0 
          left-0 
          w-32 
          h-32 
          bg-white 
          rounded-full 
          ${theme === 'dark' ? 'opacity-10' : 'opacity-5'}
          -mb-16 
          -ml-16
        `}
      ></div>

      {/* Sidebar Toggle Button */}
      <button
        onClick={toggleSidebar}
        className={`
          absolute 
          -right-6 
          top-1/2 
          transform 
          -translate-y-1/2 
          w-12 
          h-12 
          rounded-full 
          flex 
          items-center 
          justify-center 
          transition-all 
          duration-200 
          z-20 
          focus:outline-none
          ${theme === 'dark' 
            ? 'bg-gray-700 text-white' 
            : 'bg-gray-800 text-white'}
        `}
      >
        <div 
          className={`
            absolute 
            inset-0 
            rounded-full 
            opacity-80
            ${theme === 'dark' 
              ? 'bg-gray-700' 
              : 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-400'}
          `}
        ></div>
        {isCollapsed ? (
          <ChevronRight className='h-6 w-6 relative z-10' />
        ) : (
          <ChevronLeft className='h-6 w-6 relative z-10' />
        )}
      </button>
    </aside>
  );
};

export default Sidebar;