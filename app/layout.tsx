import type { Metadata } from "next"
import "./globals.css"
import { Providers } from "@/components/providers/providers"

export const metadata: Metadata = {
  title: {
    template: "%s | HRMS",
    default: "HRMS - Human Resource Management System",
  },
  description: "Modern HRMS for managing your workforce",
}

const themeBootScript = `
(function() {
  try {
    var raw = localStorage.getItem('hrms-theme-palette');
    if (!raw) return;
    var parsed = JSON.parse(raw);
    var state = parsed && parsed.state;
    if (!state || !state.cssVars) return;
    var root = document.documentElement;
    if (state.mode === 'dark' || state.mode === 'light') {
      root.classList.remove(state.mode === 'dark' ? 'light' : 'dark');
      root.classList.add(state.mode);
      root.style.colorScheme = state.mode;
      try { localStorage.setItem('theme', state.mode); } catch (e) {}
    }
    var vars = state.cssVars;
    for (var k in vars) {
      if (Object.prototype.hasOwnProperty.call(vars, k)) {
        root.style.setProperty('--' + k, vars[k]);
      }
    }
  } catch (e) {}
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
