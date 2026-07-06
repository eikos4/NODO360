const fs = require('fs');
let css = `
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ── Variables semánticas y de Tema Pro ── */
@layer base {
  /* TEMA OSCURO (default) */
  :root, :root.dark {
    /* Surface base (slate-950) */
    --surface-base:    #020617; 
    --surface-raised:  #0f172a; 
    --surface-overlay: #1e293b; 
    --surface-border:  #334155; 
    --content-primary:   #f1f5f9; 
    --content-secondary: #94a3b8; 
    --content-muted:     #475569; 

    /* Paleta Slate Original en RGB (para opacidades) */
    --color-slate-50:  248 250 252;
    --color-slate-100: 241 245 249;
    --color-slate-200: 226 232 240;
    --color-slate-300: 203 213 225;
    --color-slate-400: 148 163 184;
    --color-slate-500: 100 116 139;
    --color-slate-600: 71 85 105;
    --color-slate-700: 51 65 85;
    --color-slate-800: 30 41 59;
    --color-slate-900: 15 23 42;
    --color-slate-950: 2 6 23;
  }

  /* TEMA CLARO */
  :root:not(.dark) {
    --surface-base:    #f1f5f9; 
    --surface-raised:  #ffffff; 
    --surface-overlay: #f8fafc; 
    --surface-border:  #e2e8f0; 
    --content-primary:   #0f172a; 
    --content-secondary: #475569; 
    --content-muted:     #94a3b8; 

    /* Paleta Slate Invertida (magia de Tailwind) */
    --color-slate-950: 241 245 249; /* mapped to slate-100 */
    --color-slate-900: 255 255 255; /* mapped to white */
    --color-slate-800: 241 245 249; /* mapped to slate-100 */
    --color-slate-700: 226 232 240; /* mapped to slate-200 */
    --color-slate-600: 148 163 184; /* mapped to slate-400 */
    --color-slate-500: 100 116 139; /* mapped to slate-500 */
    --color-slate-400: 71 85 105;   /* mapped to slate-600 */
    --color-slate-300: 51 65 85;    /* mapped to slate-700 */
    --color-slate-200: 30 41 59;    /* mapped to slate-800 */
    --color-slate-100: 15 23 42;    /* mapped to slate-900 */
    --color-slate-50:  2 6 23;      /* mapped to slate-950 */
  }

  body {
    background-color: var(--surface-base);
    color: var(--content-primary);
    @apply antialiased;
    font-family: 'Inter', system-ui, sans-serif;
    transition: background-color 0.2s ease, color 0.2s ease;
    min-height: 100%;
  }

  html, body, #root {
    height: 100%;
  }
}

/* ── Clases Utilitarias Pro ── */
@layer utilities {
  .scrollbar-thin {
    scrollbar-width: thin;
    scrollbar-color: rgb(var(--color-slate-700)) transparent;
  }

  /* Glassmorphism premium */
  .glass-panel {
    @apply bg-slate-800/80 backdrop-blur-md border border-slate-700/50 shadow-xl;
  }
  
  .glass-panel-light {
    @apply bg-white/70 backdrop-blur-md border border-slate-200/50 shadow-lg;
  }

  /* Animaciones suaves */
  .animate-fade-in {
    animation: fadeIn 0.3s ease-out forwards;
  }
  .animate-slide-up {
    animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
}

/* ── Sidebar tweaks / Excepciones estáticas ── */
/* Mantenemos solo el rojo vivo del nav lateral en blanco para el tema claro */
html:not(.dark) {
  /* Inputs force light scheme when in light mode */
  input, select, textarea {
    color-scheme: light;
  }

  aside nav a.bg-red-600,
  aside nav button.bg-red-600,
  aside nav .bg-red-600.text-white,
  aside nav span.bg-red-600 {
    color: #ffffff !important;
  }
  aside nav a.bg-red-600 svg,
  aside nav button.bg-red-600 svg {
    color: #ffffff !important;
  }
}
`;

fs.writeFileSync('src/index.css', css);

let tw = fs.readFileSync('tailwind.config.js', 'utf8');
const slateReplacement = `
        slate: {
          50: 'rgb(var(--color-slate-50) / <alpha-value>)',
          100: 'rgb(var(--color-slate-100) / <alpha-value>)',
          200: 'rgb(var(--color-slate-200) / <alpha-value>)',
          300: 'rgb(var(--color-slate-300) / <alpha-value>)',
          400: 'rgb(var(--color-slate-400) / <alpha-value>)',
          500: 'rgb(var(--color-slate-500) / <alpha-value>)',
          600: 'rgb(var(--color-slate-600) / <alpha-value>)',
          700: 'rgb(var(--color-slate-700) / <alpha-value>)',
          800: 'rgb(var(--color-slate-800) / <alpha-value>)',
          900: 'rgb(var(--color-slate-900) / <alpha-value>)',
          950: 'rgb(var(--color-slate-950) / <alpha-value>)',
        },
`;
if (!tw.includes('slate: {')) {
  tw = tw.replace(/colors:\s*\{/, 'colors: {' + slateReplacement);
  fs.writeFileSync('tailwind.config.js', tw);
}
console.log('Update complete!');
