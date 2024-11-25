# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```

# AgentNeo Dashboard

## Add Dark Mode Support
- Implement theme switching with custom colour palettes
- Remember user preferences and detect system theme

## Overview
AgentNeo Dashboard is an advanced, dynamic web application designed for seamless project management and analysis. This dashboard incorporates modern UI/UX practices, offering a clean, responsive design with light and dark modes. Built with React, TailwindCSS, and other cutting-edge libraries, it provides a robust solution for organizing and analyzing project data.

## Features

### Core Features

1. **Dark/Light Mode**
   - Integrated with TailwindCSS and React Context
   - Toggle the theme globally with a single click

2. **Interactive Pages**
   - Overview: Provides a snapshot of project activities
   - Analysis: Detailed analytics and performance metrics
   - Trace History: Historical record of project changes and activities
   - Evaluation: Evaluate project status with custom parameters

3. **Sidebar Navigation**
   - Expandable and collapsible sidebar to improve accessibility

4. **Responsive Design**
   - Fully optimized for desktop, tablet, and mobile views

## Getting Started

### Prerequisites
Before starting, ensure the following are installed on your system:
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1. Clone the Repository:
   ```bash
   git clone https://github.com/your-username/agentneo-dashboard.git
   cd agentneo-dashboard
   ```

2. Install Dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Run the Development Server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. Open in Browser:
   Navigate to [http://localhost:3000](http://localhost:3000) to access the application.

## Project Structure

```
src/
├── components/
│   ├── ProjectInformation.tsx       # Component for rendering project data
│   ├── toggle-button.tsx            # Theme toggle button (light/dark mode)
│   ├── theme-provider.tsx           # Theme context provider
├── contexts/
│   ├── ProjectContext.tsx           # Context for managing project state
│   ├── SidebarContext.tsx           # Context for managing sidebar
├── pages/
│   ├── Overview.tsx                 # Overview page
│   ├── Analysis.tsx                 # Analysis page
│   ├── TraceHistory.tsx            # Trace history page
│   ├── Evaluation.tsx              # Evaluation page
├── App.tsx                         # Main app component with routing
├── index.tsx                       # Application entry point
├── tailwind.config.ts             # TailwindCSS configuration
└── styles/
    ├── globals.css                # Global CSS styles
```

## Features in Detail

### 1. Theme Toggle (Dark/Light Mode)
- **How It Works:**
  - Uses a `ThemeProvider` to manage global theme state via React Context
  - TailwindCSS's `darkMode: ['class']` strategy ensures easy styling

- **Implementation:**
  - `<ThemeToggleButton />` allows users to toggle between themes
  - Example Code for Conditional Styling:
    ```jsx
    <div className="bg-white dark:bg-gray-800 text-black dark:text-white">
      Your themed content here.
    </div>
    ```

## How to Use

### Navigate Through the App
- Default Route: `/` (Overview Page)
- Other Routes:
  - `/analysis` - View analytics data
  - `/trace-history` - Access historical records
  - `/evaluation` - Evaluate project metrics

### Switch Themes
- Click the toggle button in the header to switch between light and dark modes

## Dependencies

### Core Libraries
- [React](https://reactjs.org/) (UI Library)
- [React Router](https://reactrouter.com/) (Routing)
- [TailwindCSS](https://tailwindcss.com/) (CSS Framework)

### Utilities
- [React Icons](https://react-icons.github.io/react-icons/) (For icons)


