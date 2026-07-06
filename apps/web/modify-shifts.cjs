const fs = require('fs');
let code = fs.readFileSync('src/pages/ShiftsPage.tsx', 'utf8');

// Global Text replacements
code = code.replace(/text-white/g, 'text-slate-900 dark:text-white');
code = code.replace(/text-slate-500/g, 'text-slate-500 dark:text-slate-500');
code = code.replace(/text-slate-400/g, 'text-slate-600 dark:text-slate-400');
code = code.replace(/text-slate-200/g, 'text-slate-900 dark:text-slate-200');
code = code.replace(/text-slate-100/g, 'text-slate-900 dark:text-slate-100');

// Fix accidental double darks
code = code.replace(/text-slate-[0-9]+ dark:text-slate-[0-9]+ dark:text-slate-400/g, 'text-slate-600 dark:text-slate-400');
code = code.replace(/text-slate-900 dark:text-slate-900 dark:text-white/g, 'text-slate-900 dark:text-white');
code = code.replace(/text-slate-500 dark:text-slate-500 dark:text-slate-500/g, 'text-slate-500 dark:text-slate-500');
code = code.replace(/text-slate-[0-9]+ dark:text-slate-[0-9]+ dark:text-slate-200/g, 'text-slate-900 dark:text-slate-200');

// Fix buttons text-white that actually need to stay white (e.g., 'Nueva guardia')
code = code.replace(/text-slate-900 dark:text-white text-sm font-medium px-4 py-2/g, 'text-white text-sm font-medium px-4 py-2');
code = code.replace(/text-slate-900 dark:text-white text-sm font-medium px-5 py-2/g, 'text-white text-sm font-medium px-5 py-2');

// Top filters container
code = code.replace(/bg-slate-900 border border-slate-800 rounded-lg p-1/g, 'bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1');

// Form container
code = code.replace(/bg-slate-900 border border-slate-700/g, 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm');
code = code.replace(/bg-slate-800 border border-slate-700/g, 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700');
code = code.replace(/bg-slate-800 rounded-lg p-3/g, 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3');
code = code.replace(/hover:bg-slate-700 transition-colors/g, 'hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors');
code = code.replace(/hover:bg-slate-800 transition-colors/g, 'hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors');

// Empty state
code = code.replace(/bg-slate-900 border border-slate-800/g, 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm');
code = code.replace(/text-slate-[0-9]+ dark:text-slate-[0-9]+ mx-auto mb-3/g, 'text-slate-400 dark:text-slate-600 mx-auto mb-3');

// Cards
code = code.replace(/border-slate-800/g, 'border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none');
code = code.replace(/bg-slate-900 border/g, 'bg-white dark:bg-slate-900 border');
code = code.replace(/bg-slate-800\/50/g, 'bg-slate-50 dark:bg-slate-800/50');
code = code.replace(/isPast \? 'bg-slate-700' : 'bg-slate-800'/g, `isPast ? 'bg-slate-200 dark:bg-slate-700' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-transparent'`);
code = code.replace(/text-slate-[0-9]+ dark:text-slate-500/g, 'text-slate-500 dark:text-slate-500');

// Shift List
code = code.replace(/divide-slate-800\/50/g, 'divide-slate-100 dark:divide-slate-800/50');
code = code.replace(/hover:bg-slate-800\/40/g, 'hover:bg-slate-50 dark:hover:bg-slate-800/40');
code = code.replace(/bg-slate-800 text-slate-[0-9]+ dark:text-slate-[0-9]+/g, 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500');
code = code.replace(/text-slate-[0-9]+ dark:text-slate-[0-9]+ •/g, 'text-slate-400 dark:text-slate-600 •');

// Actions
code = code.replace(/hover:bg-slate-700/g, 'hover:bg-slate-200 dark:hover:bg-slate-700');

// Footer
code = code.replace(/bg-slate-800\/30 border-t border-slate-800\/50/g, 'bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800/50');
code = code.replace(/bg-slate-700 text-slate-600 dark:text-slate-[0-9]+/g, 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-2 border-white dark:border-slate-900');
code = code.replace(/bg-slate-700 flex/g, 'bg-slate-200 dark:bg-slate-700 flex border-2 border-white dark:border-slate-900');
code = code.replace(/flex -space-x-1\.5/g, 'flex -space-x-2');

// Fix 'Hoy' button in header to be more visible in light mode (since it was just red background with red text)
code = code.replace(/bg-red-600\/20/g, 'bg-red-100 dark:bg-red-600/20');
code = code.replace(/bg-gradient-to-r from-red-600\/20 to-red-600\/5/g, 'bg-gradient-to-r from-red-100 dark:from-red-600/20 to-red-50 dark:to-red-600/5');

// Active filter tabs in light mode
code = code.replace(/viewMode === m \? 'bg-red-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-[0-9]+ hover:text-slate-[0-9]+ dark:hover:text-slate-[0-9]+'/g, `viewMode === m ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'`);

fs.writeFileSync('src/pages/ShiftsPage.tsx', code);
