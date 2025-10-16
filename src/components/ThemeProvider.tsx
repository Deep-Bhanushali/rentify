import React, { createContext, useContext, useEffect, useState } from 'react';

// Theme types
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  primary: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  secondary: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  neutral: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  success: string;
  warning: string;
  error: string;
  info: string;
  background: {
    default: string;
    paper: string;
  };
  text: {
    primary: string;
    secondary: string;
    disabled: string;
    hint: string;
  };
  divider: string;
  border: string;
}

export interface Theme {
  mode: ThemeMode;
  colors: ThemeColors;
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
  };
  borderRadius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  shadows: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
  zIndex: {
    mobileStepper: number;
    appBar: number;
    drawer: number;
    modal: number;
    snackbar: number;
    tooltip: number;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
      '4xl': string;
    };
    fontWeight: {
      light: number;
      regular: number;
      medium: number;
      bold: number;
    };
  };
}

// Default light theme colors
const lightColors: ThemeColors = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  neutral: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
  },
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#06b6d4',
  background: {
    default: '#ffffff',
    paper: '#ffffff',
  },
  text: {
    primary: '#111827',
    secondary: '#4b5563',
    disabled: '#9ca3af',
    hint: '#d1d5db',
  },
  divider: '#e5e7eb',
  border: '#d1d5db',
};

// Default dark theme colors
const darkColors: ThemeColors = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  neutral: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
  },
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#06b6d4',
  background: {
    default: '#111827',
    paper: '#1f2937',
  },
  text: {
    primary: '#f9fafb',
    secondary: '#d1d5db',
    disabled: '#6b7280',
    hint: '#4b5563',
  },
  divider: '#374151',
  border: '#374151',
};

// Default theme configuration
const defaultTheme: Theme = {
  mode: 'light',
  colors: lightColors,
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
    '4xl': '6rem',
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px',
  },
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  zIndex: {
    mobileStepper: 1000,
    appBar: 1100,
    drawer: 1200,
    modal: 1300,
    snackbar: 1400,
    tooltip: 1500,
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      md: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    },
    fontWeight: {
      light: 300,
      regular: 400,
      medium: 500,
      bold: 700,
    },
  },
};

// Theme context
interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Partial<Theme>) => void;
  setThemeMode: (mode: ThemeMode) => void;
  toggleThemeMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme provider component
interface ThemeProviderProps {
  children: React.ReactNode;
  defaultMode?: ThemeMode;
  storageKey?: string;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultMode = 'light',
  storageKey = 'ui-theme',
}) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Try to get theme from localStorage
    if (typeof window !== 'undefined') {
      try {
        const storedMode = localStorage.getItem(storageKey) as ThemeMode | null;
        if (storedMode) {
          return {
            ...defaultTheme,
            mode: storedMode,
            colors: storedMode === 'dark' ? darkColors : lightColors,
          };
        }
      } catch (error) {
        console.error('Failed to retrieve theme from localStorage:', error);
      }
    }
    
    return {
      ...defaultTheme,
      mode: defaultMode,
      colors: defaultMode === 'dark' ? darkColors : lightColors,
    };
  });

  // Update theme when mode changes
  useEffect(() => {
    const newTheme = {
      ...theme,
      colors: theme.mode === 'dark' ? darkColors : lightColors,
    };
    setThemeState(newTheme);
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, theme.mode);
      } catch (error) {
        console.error('Failed to save theme to localStorage:', error);
      }
    }
    
    // Apply theme to document
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme.mode);
      
      if (theme.mode === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [theme.mode, storageKey]);

  // Handle system theme preference
  useEffect(() => {
    if (theme.mode === 'system' && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = (e: MediaQueryListEvent) => {
        setThemeState(prev => ({
          ...prev,
          colors: e.matches ? darkColors : lightColors,
        }));
      };
      
      // Set initial theme based on system preference
      setThemeState(prev => ({
        ...prev,
        colors: mediaQuery.matches ? darkColors : lightColors,
      }));
      
      // Listen for changes
      mediaQuery.addEventListener('change', handleChange);
      
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }
  }, [theme.mode]);

  const setTheme = (newTheme: Partial<Theme>) => {
    setThemeState(prev => ({
      ...prev,
      ...newTheme,
    }));
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeState(prev => ({
      ...prev,
      mode,
    }));
  };

  const toggleThemeMode = () => {
    setThemeMode(theme.mode === 'light' ? 'dark' : 'light');
  };

  const value = {
    theme,
    setTheme,
    setThemeMode,
    toggleThemeMode,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook to use theme
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Theme toggle button component
interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  className = '', 
  size = 'md' 
}) => {
  const { theme, toggleThemeMode } = useTheme();
  
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  return (
    <button
      onClick={toggleThemeMode}
      className={`rounded-full p-1 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 ${sizeClasses[size]} ${className}`}
      aria-label="Toggle theme"
    >
      {theme.mode === 'light' ? (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ) : (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )}
    </button>
  );
};