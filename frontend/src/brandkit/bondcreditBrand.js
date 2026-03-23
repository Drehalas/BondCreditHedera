// BondCredit Brand Kit Resources
// Centralized location for all BondCredit brand assets and styling constants

export const bondcreditBrand = {
  // Logo Assets
  logos: {
    primary: '/brandkit/logos/bondcredit-logo-primary.svg',
    horizontal: '/brandkit/logos/bondcredit-logo-horizontal.svg',
    icon: '/brandkit/logos/bondcredit-icon.svg',
    white: '/brandkit/logos/bondcredit-logo-white.svg',
    dark: '/brandkit/logos/bondcredit-logo-dark.svg'
  },

  // Color Palette
  colors: {
    // Primary Brand Colors
    primary: '#1FB2FF',
    secondary: '#FF57A5',
    accent: '#12D4B6',
    
    // Neutral Palette
    white: '#FFFFFF',
    lightGray: '#F8FAFC',
    gray: '#90A4C5',
    darkGray: '#2A3547',
    black: '#090E1A',
    
    // Semantic Colors
    success: '#12D4B6',
    warning: '#F4B343',
    error: '#F04C74',
    info: '#1FB2FF',
    
    // Gradients
    primaryGradient: 'linear-gradient(135deg, #1FB2FF 0%, #12D4B6 100%)',
    secondaryGradient: 'linear-gradient(135deg, #FF57A5 0%, #F04C74 100%)',
    backgroundGradient: 'radial-gradient(circle at 12% 18%, rgba(31, 178, 255, 0.15), transparent 36%), radial-gradient(circle at 82% 18%, rgba(255, 87, 165, 0.14), transparent 42%), radial-gradient(circle at 54% 90%, rgba(18, 212, 182, 0.13), transparent 42%)'
  },

  // Typography
  typography: {
    fontFamily: {
      primary: '"Bricolage Grotesque", sans-serif',
      mono: '"JetBrains Mono", monospace',
      system: 'system-ui, -apple-system, sans-serif'
    },
    fontSizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem'
    },
    fontWeights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },

  // Spacing & Layout
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '2.5rem',
    '3xl': '3rem',
    '4xl': '4rem',
    '5xl': '5rem'
  },

  // Border Radius
  borderRadius: {
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    full: '9999px'
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    glow: '0 0 20px rgba(31, 178, 255, 0.3)'
  },

  // Icons & Assets
  icons: {
    bondToken: '/brandkit/icons/bond-token.svg',
    creditToken: '/brandkit/icons/credit-token.svg',
    vault: '/brandkit/icons/vault.svg',
    rebalancer: '/brandkit/icons/rebalancer.svg',
    volatility: '/brandkit/icons/volatility.svg',
    hedera: '/brandkit/icons/hedera.svg'
  },

  // Brand Guidelines
  guidelines: {
    logoMinSize: '120px',
    logoClearSpace: '2rem',
    primaryColorUsage: 'Use for main CTAs, highlights, and key UI elements',
    secondaryColorUsage: 'Use for secondary actions and complementary elements',
    gradientUsage: 'Use for backgrounds, hero sections, and premium features'
  }
};

// Export individual constants for easy importing
export const {
  logos,
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  icons,
  guidelines
} = bondcreditBrand;

// CSS Custom Properties helper for consistent theming
export const brandCSSVariables = `
  /* BondCredit Brand Colors */
  --bondcredit-primary: ${colors.primary};
  --bondcredit-secondary: ${colors.secondary};
  --bondcredit-accent: ${colors.accent};
  --bondcredit-white: ${colors.white};
  --bondcredit-light-gray: ${colors.lightGray};
  --bondcredit-gray: ${colors.gray};
  --bondcredit-dark-gray: ${colors.darkGray};
  --bondcredit-black: ${colors.black};
  
  /* BondCredit Brand Gradients */
  --bondcredit-primary-gradient: ${colors.primaryGradient};
  --bondcredit-secondary-gradient: ${colors.secondaryGradient};
  --bondcredit-background-gradient: ${colors.backgroundGradient};
  
  /* BondCredit Typography */
  --bondcredit-font-primary: ${typography.fontFamily.primary};
  --bondcredit-font-mono: ${typography.fontFamily.mono};
`;

export default bondcreditBrand;