const fs = require('fs');
let code = fs.readFileSync('src/pages/TrainingPage.tsx', 'utf8');

// Global Text replacements
code = code.replace(/text-white/g, 'text-slate-900 dark:text-white');
code = code.replace(/text-slate-500/g, 'text-slate-500 dark:text-slate-500');
code = code.replace(/text-slate-400/g, 'text-slate-600 dark:text-slate-400');
code = code.replace(/text-slate-300/g, 'text-slate-600 dark:text-slate-300');
code = code.replace(/text-slate-200/g, 'text-slate-900 dark:text-slate-200');
code = code.replace(/text-slate-100/g, 'text-slate-900 dark:text-slate-100');

// Fix accidental double darks
code = code.replace(/text-slate-[0-9]+ dark:text-slate-[0-9]+ dark:text-slate-400/g, 'text-slate-600 dark:text-slate-400');
code = code.replace(/text-slate-900 dark:text-slate-900 dark:text-white/g, 'text-slate-900 dark:text-white');
code = code.replace(/text-slate-500 dark:text-slate-500 dark:text-slate-500/g, 'text-slate-500 dark:text-slate-500');
code = code.replace(/text-slate-[0-9]+ dark:text-slate-[0-9]+ dark:text-slate-200/g, 'text-slate-900 dark:text-slate-200');
code = code.replace(/text-slate-[0-9]+ dark:text-slate-[0-9]+ dark:text-slate-300/g, 'text-slate-600 dark:text-slate-300');

// Fix buttons text-white that actually need to stay white
code = code.replace(/text-slate-900 dark:text-white text-sm font-medium px-4 py-2/g, 'text-white text-sm font-medium px-4 py-2');
code = code.replace(/text-slate-900 dark:text-white font-semibold/g, 'text-white font-semibold');

// Tab and Filters
code = code.replace(/bg-red-600\/20 text-red-300/g, 'bg-red-100 dark:bg-red-600/20 text-red-600 dark:text-red-300');
code = code.replace(/border-slate-800/g, 'border-slate-200 dark:border-slate-800');
code = code.replace(/bg-slate-900 border border-slate-200 dark:border-slate-800/g, 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none');
code = code.replace(/bg-slate-800 border/g, 'bg-white dark:bg-slate-800 border');
code = code.replace(/border-slate-700/g, 'border-slate-200 dark:border-slate-700');
code = code.replace(/hover:bg-slate-800\/50/g, 'hover:bg-slate-50 dark:hover:bg-slate-800/50');
code = code.replace(/bg-slate-950\/60/g, 'bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-transparent');

// Vencidos / Por vencer boxes
code = code.replace(/bg-red-950\/30 border border-red-800\/40/g, 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40');
code = code.replace(/bg-amber-950\/20 border border-amber-800\/30/g, 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30');
code = code.replace(/text-red-300/g, 'text-red-600 dark:text-red-300');
code = code.replace(/text-amber-300/g, 'text-amber-600 dark:text-amber-300');
code = code.replace(/bg-slate-900\/80/g, 'bg-white dark:bg-slate-900/80 shadow-sm dark:shadow-none');

// Cards
code = code.replace(/hover:border-slate-700/g, 'hover:border-slate-300 dark:hover:border-slate-700');

// Modal Form
code = code.replace(/bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full/g, 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full shadow-2xl');
code = code.replace(/bg-slate-800 border border-slate-200 dark:border-slate-700/g, 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700');

// Badges inside Roster
code = code.replace(/bg-slate-800 text-slate-[0-9]+ dark:text-slate-400/g, 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400');
code = code.replace(/bg-red-500\/20 text-red-[0-9]+ border border-red-500\/30/g, 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30');
code = code.replace(/bg-amber-500\/20 text-amber-[0-9]+ border border-amber-500\/30/g, 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30');
code = code.replace(/bg-red-600\/20 text-red-[0-9]+ dark:text-red-300/g, 'bg-red-100 dark:bg-red-600/20 text-red-600 dark:text-red-300');

// Fix the badges inside constants STATUS_META and CATEGORY_COLORS 
// Actually those are defined at the top as constants.
// For CATEGORY_COLORS:
code = code.replace(/bg-sky-500\/20 text-sky-400 border-sky-500\/30/g, 'bg-sky-50 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-500/30');
code = code.replace(/bg-orange-500\/20 text-orange-400 border-orange-500\/30/g, 'bg-orange-50 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/30');
code = code.replace(/bg-emerald-500\/20 text-emerald-400 border-emerald-500\/30/g, 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30');
code = code.replace(/bg-violet-500\/20 text-violet-400 border-violet-500\/30/g, 'bg-violet-50 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/30');
code = code.replace(/bg-amber-500\/20 text-amber-400 border-amber-500\/30/g, 'bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30');
code = code.replace(/bg-slate-500\/20 text-slate-400 border-slate-500\/30/g, 'bg-slate-100 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-500/30');
code = code.replace(/bg-red-500\/20 text-red-400 border-red-500\/30/g, 'bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30');

// Fix standard texts of icons
code = code.replace(/text-emerald-400/g, 'text-emerald-600 dark:text-emerald-400');
code = code.replace(/text-amber-400/g, 'text-amber-600 dark:text-amber-400');
code = code.replace(/text-red-400/g, 'text-red-600 dark:text-red-400');
code = code.replace(/text-emerald-600 dark:text-emerald-400 border-emerald-200/g, 'text-emerald-600 dark:text-emerald-400 border-emerald-200'); // No change if it overlaps

fs.writeFileSync('src/pages/TrainingPage.tsx', code);
