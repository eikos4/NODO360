const fs = require('fs');
let code = fs.readFileSync('src/pages/MotoresPage.tsx', 'utf8');

// Global Text replacements
code = code.replace(/text-white/g, 'text-slate-900 dark:text-white');
code = code.replace(/text-slate-500/g, 'text-slate-500 dark:text-slate-500');
code = code.replace(/text-slate-400/g, 'text-slate-600 dark:text-slate-400');
code = code.replace(/text-slate-300/g, 'text-slate-700 dark:text-slate-300');
code = code.replace(/text-slate-200/g, 'text-slate-800 dark:text-slate-200');
code = code.replace(/text-slate-100/g, 'text-slate-900 dark:text-slate-100');
code = code.replace(/text-slate-600/g, 'text-slate-500 dark:text-slate-600');
code = code.replace(/text-slate-700/g, 'text-slate-400 dark:text-slate-700');

// Colors adjustments
code = code.replace(/text-emerald-400/g, 'text-emerald-600 dark:text-emerald-400');
code = code.replace(/text-red-400/g, 'text-red-600 dark:text-red-400');
code = code.replace(/text-yellow-400/g, 'text-yellow-600 dark:text-yellow-400');
code = code.replace(/text-blue-400/g, 'text-blue-600 dark:text-blue-400');
code = code.replace(/text-orange-400/g, 'text-orange-600 dark:text-orange-400');
code = code.replace(/text-red-500/g, 'text-red-600 dark:text-red-500');
code = code.replace(/text-orange-500/g, 'text-orange-600 dark:text-orange-500');
code = code.replace(/text-orange-300/g, 'text-orange-600 dark:text-orange-300');
code = code.replace(/text-emerald-300/g, 'text-emerald-600 dark:text-emerald-300');

// Fix accidental double darks
code = code.replace(/text-[a-z]+-[0-9]+ dark:text-[a-z]+-[0-9]+ dark:text-([a-z]+)-([0-9]+)/g, 'text-$1-600 dark:text-$1-$2');
code = code.replace(/text-slate-[0-9]+ dark:text-slate-[0-9]+ dark:text-white/g, 'text-slate-900 dark:text-white');
code = code.replace(/text-slate-900 dark:text-slate-[0-9]+ dark:text-white/g, 'text-slate-900 dark:text-white');

// Backgrounds & Borders
code = code.replace(/bg-slate-900 border border-slate-800/g, 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none');
code = code.replace(/bg-slate-900 border-slate-800 hover:border-slate-700/g, 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm dark:shadow-none');
code = code.replace(/bg-slate-800 border-slate-600/g, 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600');
code = code.replace(/bg-slate-800\/60/g, 'bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-transparent');
code = code.replace(/bg-slate-800/g, 'bg-slate-100 dark:bg-slate-800');
code = code.replace(/bg-slate-900 rounded-xl p-3/g, 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-transparent rounded-xl p-3');
code = code.replace(/border-slate-700/g, 'border-slate-300 dark:border-slate-700');

// Sidebar selected card
code = code.replace(/bg-orange-600\/15 border-orange-500\/50/g, 'bg-orange-50 dark:bg-orange-600/15 border border-orange-300 dark:border-orange-500/50');

// Hero Banner Gradient
code = code.replace(/from-slate-900 via-slate-900\/95 to-slate-900\/80/g, 'from-white via-white/95 to-white/80 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-900/80');

// Hero Image Placeholder (if no image)
code = code.replace(/w-full sm:w-48 h-36 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden shrink-0 border border-slate-300 dark:border-slate-700/g, 'w-full sm:w-48 h-36 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700');

// Timeline icon bg
code = code.replace(/bg-red-600\/15 border-red-500\/40/g, 'bg-red-100 dark:bg-red-600/15 border-red-300 dark:border-red-500/40');
code = code.replace(/bg-blue-600\/15 border-blue-500\/40/g, 'bg-blue-100 dark:bg-blue-600/15 border-blue-300 dark:border-blue-500/40');
code = code.replace(/bg-yellow-600\/15 border-yellow-500\/40/g, 'bg-yellow-100 dark:bg-yellow-600/15 border-yellow-300 dark:border-yellow-500/40');

// KPI Backgrounds
code = code.replace(/bg-emerald-600\/10 border-emerald-600\/20/g, 'bg-emerald-50 dark:bg-emerald-600/10 border-emerald-200 dark:border-emerald-600/20');
code = code.replace(/bg-blue-600\/10 border-blue-600\/20/g, 'bg-blue-50 dark:bg-blue-600/10 border-blue-200 dark:border-blue-600/20');
code = code.replace(/bg-red-600\/10 border-red-600\/20/g, 'bg-red-50 dark:bg-red-600/10 border-red-200 dark:border-red-600/20');
code = code.replace(/bg-orange-600\/10 border-orange-600\/20/g, 'bg-orange-50 dark:bg-orange-600/10 border-orange-200 dark:border-orange-600/20');
code = code.replace(/bg-red-600\/10 border-red-600\/30/g, 'bg-red-50 dark:bg-red-600/10 border border-red-200 dark:border-red-600/30');
code = code.replace(/bg-orange-600\/10 border-orange-600\/30/g, 'bg-orange-50 dark:bg-orange-600/10 border border-orange-200 dark:border-orange-600/30');

// Timeline filter buttons
code = code.replace(/bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-600 dark:text-slate-600/g, 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600');
code = code.replace(/text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:text-slate-300 border border-transparent/g, 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent');
code = code.replace(/bg-red-600\/20 text-red-600 dark:text-red-400 border border-red-600\/30/g, 'bg-red-100 dark:bg-red-600/20 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-600/30');
code = code.replace(/bg-yellow-600\/20 text-yellow-600 dark:text-yellow-400 border border-yellow-600\/30/g, 'bg-yellow-100 dark:bg-yellow-600/20 text-yellow-600 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-600/30');
code = code.replace(/bg-blue-600\/20 text-blue-600 dark:text-blue-400 border border-blue-600\/30/g, 'bg-blue-100 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-600/30');

// Header of timeline
code = code.replace(/border-b border-slate-800/g, 'border-b border-slate-200 dark:border-slate-800');

// Make 'text-white' stick on button if needed
code = code.replace(/text-slate-900 dark:text-white text-xs font-bold px-3 py-1 rounded-full/g, 'text-white text-xs font-bold px-3 py-1 rounded-full');
code = code.replace(/text-slate-900 dark:text-white font-semibold py-2\.5 rounded-xl/g, 'text-white font-semibold py-2.5 rounded-xl');

// Ensure image opacity is higher in light mode so it can be seen
code = code.replace(/opacity-15/g, 'opacity-25 dark:opacity-15');

// Sidebar button text 'text-slate-900 dark:text-white font-mono truncate'
// Ensure it's legible in selected state (which is orange-50 dark:orange-600/15)
// It is legible as text-slate-900 dark:text-white

// Top header icon Truck
code = code.replace(/text-slate-900 dark:text-white/g, 'text-slate-900 dark:text-white'); // Ensure it remains

// Write file
fs.writeFileSync('src/pages/MotoresPage.tsx', code);
