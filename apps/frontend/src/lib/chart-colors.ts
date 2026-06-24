/**
 * Colorblind-safe color palette for charts
 * Based on Okabe-Ito palette and accessibility standards
 * Accessible for Protanopia, Deuteranopia, and Tritanopia
 */

export const COLORBLIND_SAFE_PALETTE = {
  // Primary colors - high contrast, distinguishable for all types of colorblindness
  blue: '#0173B2',
  orange: '#DE8F05',
  red: '#CC78BC',
  yellow: '#CA9161',
  green: '#56B4E9',
  purple: '#F8766D',
  
  // Extended palette for multiple series
  colors: [
    '#0173B2', // Blue
    '#DE8F05', // Orange
    '#CC78BC', // Red/Purple
    '#CA9161', // Brown
    '#56B4E9', // Light Blue
    '#F8766D', // Pink
    '#A6761D', // Dark Brown
    '#999999', // Gray
  ],
} as const;

export const CHART_COLORS = {
  // Performance metrics
  excellent: '#0173B2', // Blue - good performance
  good: '#56B4E9',      // Light Blue - acceptable performance
  average: '#DE8F05',   // Orange - needs improvement
  poor: '#CC78BC',      // Red/Purple - critical attention needed
  
  // Neutral colors
  neutral: '#999999',
  background: '#F5F5F5',
  text: '#333333',
  textLight: '#666666',
  
  // Dark mode
  darkBackground: '#1F2937',
  darkText: '#F3F4F6',
  darkTextLight: '#D1D5DB',
} as const;

// Accessible color scheme for charts with multiple series
export const SERIES_COLORS = [
  '#0173B2', // Blue - Primary
  '#DE8F05', // Orange - Secondary
  '#CC78BC', // Purple - Tertiary
  '#56B4E9', // Light Blue - Quaternary
  '#F8766D', // Pink - Quinary
  '#CA9161', // Brown - Senary
] as const;

// Gradient stops for area charts (colorblind safe)
export const GRADIENT_STOPS = {
  primary: [
    { offset: '0%', color: '#0173B2', stopOpacity: 0.3 },
    { offset: '100%', color: '#0173B2', stopOpacity: 0.05 },
  ],
  secondary: [
    { offset: '0%', color: '#DE8F05', stopOpacity: 0.3 },
    { offset: '100%', color: '#DE8F05', stopOpacity: 0.05 },
  ],
  accent: [
    { offset: '0%', color: '#56B4E9', stopOpacity: 0.3 },
    { offset: '100%', color: '#56B4E9', stopOpacity: 0.05 },
  ],
} as const;
