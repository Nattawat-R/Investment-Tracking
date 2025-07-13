import type { Config } from "tailwindcss"
import defaultConfig from "shadcn/ui/tailwind.config"

const config: Config = {
  ...defaultConfig,
  content: [
    ...defaultConfig.content,
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./investment-dashboard.tsx",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    ...defaultConfig.theme,
    extend: {
      ...defaultConfig.theme.extend,
      colors: {
        ...defaultConfig.theme.extend.colors,
        // Ensure crypto purple colors are always included
        purple: {
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED",
        },
        // Asset type specific colors
        "asset-crypto": "#8B5CF6",
        "asset-crypto-bg": "#8B5CF620",
        "asset-crypto-border": "#8B5CF650",
        "asset-stock": "#3B82F6",
        "asset-stock-bg": "#3B82F620",
        "asset-stock-border": "#3B82F650",
        "asset-thai-stock": "#10B981",
        "asset-thai-stock-bg": "#10B98120",
        "asset-thai-stock-border": "#10B98150",
        "asset-thai-gold": "#EAB308",
        "asset-thai-gold-bg": "#EAB30820",
        "asset-thai-gold-border": "#EAB30850",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [...defaultConfig.plugins, require("tailwindcss-animate")],
  // Safelist important colors to prevent purging
  safelist: [
    "text-purple-400",
    "text-purple-500",
    "border-purple-500/30",
    "bg-purple-500/20",
    "text-blue-400",
    "border-blue-500/30",
    "bg-blue-500/20",
    "text-green-400",
    "border-green-500/30",
    "bg-green-500/20",
    "text-yellow-400",
    "border-yellow-500/30",
    "bg-yellow-500/20",
    // Asset type colors
    "text-asset-crypto",
    "bg-asset-crypto-bg",
    "border-asset-crypto-border",
    "text-asset-stock",
    "bg-asset-stock-bg",
    "border-asset-stock-border",
    "text-asset-thai-stock",
    "bg-asset-thai-stock-bg",
    "border-asset-thai-stock-border",
    "text-asset-thai-gold",
    "bg-asset-thai-gold-bg",
    "border-asset-thai-gold-border",
  ],
}

export default config
