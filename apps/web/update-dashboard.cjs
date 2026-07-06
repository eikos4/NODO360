const fs = require('fs');
let code = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf-8');

const replacements = [
  ['text-blue-400', 'text-blue-600 dark:text-blue-400'],
  ['text-emerald-400', 'text-emerald-600 dark:text-emerald-400'],
  ['text-purple-400', 'text-purple-600 dark:text-purple-400'],
  ['text-yellow-400', 'text-yellow-600 dark:text-yellow-400'],
  ['text-orange-400', 'text-orange-600 dark:text-orange-400'],
  ['text-cyan-400', 'text-cyan-600 dark:text-cyan-400'],
  ['text-red-400', 'text-red-600 dark:text-red-400'],
  ['text-slate-400', 'text-slate-600 dark:text-slate-400'],
  ['text-indigo-400', 'text-indigo-600 dark:text-indigo-400'],
  ['text-violet-400', 'text-violet-600 dark:text-violet-400'],

  // Header background
  ['bg-gradient-to-r from-red-600/10 via-slate-900 to-slate-900', 'bg-gradient-to-r from-red-50 dark:from-red-600/10 via-white dark:via-slate-900 to-slate-50 dark:to-slate-900'],
  ['border border-red-600/20', 'border border-red-200 dark:border-red-600/20'],
  ['text-white', 'text-slate-900 dark:text-white'],
  ['bg-slate-800', 'bg-slate-100 dark:bg-slate-800'],
  ['border-slate-700', 'border-slate-200 dark:border-slate-700'],
  ['text-slate-300', 'text-slate-700 dark:text-slate-300'],
  
  // Header icon bg
  ['bg-red-600/10 border border-red-600/20', 'bg-red-50 dark:bg-red-600/10 border border-red-200 dark:border-red-600/20'],

  // Tabs
  [
    "'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'",
    "'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'"
  ],

  // Skeletons
  ['bg-slate-900 border border-slate-800', 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'],

  // KPIs
  ["bg: 'bg-blue-600/10'", "bg: 'bg-blue-50 dark:bg-blue-600/10'"],
  ["border: 'border-blue-600/20'", "border: 'border-blue-200 dark:border-blue-600/20'"],
  ["ic: 'text-blue-400'", "ic: 'text-blue-600 dark:text-blue-400'"],
  ["vc: 'text-blue-400'", "vc: 'text-blue-700 dark:text-blue-400'"],

  ["bg: 'bg-emerald-600/10'", "bg: 'bg-emerald-50 dark:bg-emerald-600/10'"],
  ["border: 'border-emerald-600/20'", "border: 'border-emerald-200 dark:border-emerald-600/20'"],
  ["ic: 'text-emerald-400'", "ic: 'text-emerald-600 dark:text-emerald-400'"],
  ["vc: 'text-emerald-400'", "vc: 'text-emerald-700 dark:text-emerald-400'"],

  ["bg: 'bg-purple-600/10'", "bg: 'bg-purple-50 dark:bg-purple-600/10'"],
  ["border: 'border-purple-600/20'", "border: 'border-purple-200 dark:border-purple-600/20'"],
  ["ic: 'text-purple-400'", "ic: 'text-purple-600 dark:text-purple-400'"],
  ["vc: 'text-purple-400'", "vc: 'text-purple-700 dark:text-purple-400'"],

  ["bg: 'bg-indigo-600/10'", "bg: 'bg-indigo-50 dark:bg-indigo-600/10'"],
  ["border: 'border-indigo-600/20'", "border: 'border-indigo-200 dark:border-indigo-600/20'"],
  ["ic: 'text-indigo-400'", "ic: 'text-indigo-600 dark:text-indigo-400'"],
  ["vc: 'text-indigo-400'", "vc: 'text-indigo-700 dark:text-indigo-400'"],

  ["bg: vehicleRate < 70 ? 'bg-orange-600/10' : 'bg-slate-800'", "bg: vehicleRate < 70 ? 'bg-orange-50 dark:bg-orange-600/10' : 'bg-slate-50 dark:bg-slate-800'"],
  ["border: vehicleRate < 70 ? 'border-orange-600/20' : 'border-slate-700'", "border: vehicleRate < 70 ? 'border-orange-200 dark:border-orange-600/20' : 'border-slate-200 dark:border-slate-700'"],
  ["ic: 'text-orange-400'", "ic: 'text-orange-600 dark:text-orange-400'"],
  ["vc: vehicleRate < 70 ? 'text-orange-400' : 'text-white'", "vc: vehicleRate < 70 ? 'text-orange-700 dark:text-orange-400' : 'text-slate-800 dark:text-white'"],

  ["bg: totalExpired > 0 ? 'bg-red-600/10' : 'bg-slate-800'", "bg: totalExpired > 0 ? 'bg-red-50 dark:bg-red-600/10' : 'bg-slate-50 dark:bg-slate-800'"],
  ["border: totalExpired > 0 ? 'border-red-600/30' : 'border-slate-700'", "border: totalExpired > 0 ? 'border-red-200 dark:border-red-600/30' : 'border-slate-200 dark:border-slate-700'"],
  ["ic: totalExpired > 0 ? 'text-red-400' : 'text-slate-500'", "ic: totalExpired > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'"],
  ["vc: totalExpired > 0 ? 'text-red-400' : 'text-white'", "vc: totalExpired > 0 ? 'text-red-700 dark:text-red-400' : 'text-slate-800 dark:text-white'"],

  ["bg: totalSoon > 0 ? 'bg-yellow-600/10' : 'bg-slate-800'", "bg: totalSoon > 0 ? 'bg-yellow-50 dark:bg-yellow-600/10' : 'bg-slate-50 dark:bg-slate-800'"],
  ["border: totalSoon > 0 ? 'border-yellow-600/20' : 'border-slate-700'", "border: totalSoon > 0 ? 'border-yellow-200 dark:border-yellow-600/20' : 'border-slate-200 dark:border-slate-700'"],
  ["ic: totalSoon > 0 ? 'text-yellow-400' : 'text-slate-500'", "ic: totalSoon > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-slate-400 dark:text-slate-500'"],
  ["vc: totalSoon > 0 ? 'text-yellow-400' : 'text-white'", "vc: totalSoon > 0 ? 'text-yellow-700 dark:text-yellow-400' : 'text-slate-800 dark:text-white'"],

  ["bg: execRate > 90 ? 'bg-red-600/10' : 'bg-slate-800'", "bg: execRate > 90 ? 'bg-red-50 dark:bg-red-600/10' : 'bg-slate-50 dark:bg-slate-800'"],
  ["border: execRate > 90 ? 'border-red-600/20' : 'border-slate-700'", "border: execRate > 90 ? 'border-red-200 dark:border-red-600/20' : 'border-slate-200 dark:border-slate-700'"],
  ["ic: execRate > 90 ? 'text-red-400' : 'text-slate-400'", "ic: execRate > 90 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'"],
  ["vc: execRate > 90 ? 'text-red-400' : 'text-white'", "vc: execRate > 90 ? 'text-red-700 dark:text-red-400' : 'text-slate-800 dark:text-white'"],

  ['bg-slate-900/50', 'bg-slate-100 dark:bg-slate-900/50'],

  // Progress bars container
  ['bg-slate-900 border border-slate-800', 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'],
  
  // Overviews
  ['bg-slate-900 border border-slate-800', 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'],
  ['bg-blue-600/15', 'bg-blue-50 dark:bg-blue-600/15'],
  ['hover:bg-slate-800/60', 'hover:bg-slate-50 dark:hover:bg-slate-800/60'],
  ['bg-slate-800 border border-slate-700', 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'],
  ['text-slate-200', 'text-slate-800 dark:text-slate-200'],
  ['text-slate-600', 'text-slate-500 dark:text-slate-400'], // adjusted text-slate-600 logic
  ['bg-red-600/15', 'bg-red-50 dark:bg-red-600/15'],
  ['border-red-600/30', 'border-red-200 dark:border-red-600/30'],
  ['bg-yellow-600/20', 'bg-yellow-50 dark:bg-yellow-600/20'],
  ['border-yellow-600/30', 'border-yellow-200 dark:border-yellow-600/30'],

  ['bg-emerald-600/10', 'bg-emerald-50 dark:bg-emerald-600/10'],
  ['bg-red-600/5', 'bg-red-50 dark:bg-red-600/5'],
  ['border-red-600/20', 'border-red-200 dark:border-red-600/20'],
  ['bg-yellow-600/5', 'bg-yellow-50 dark:bg-yellow-600/5'],
  ['border-yellow-600/20', 'border-yellow-200 dark:border-yellow-600/20'],
  ['bg-red-600/20', 'bg-red-100 dark:bg-red-600/20'],
  ['bg-yellow-600/20', 'bg-yellow-100 dark:bg-yellow-600/20'],

  ['bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600', 'bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600'],
  ['bg-slate-900', 'bg-slate-50 dark:bg-slate-900'],
  ['border-slate-700', 'border-slate-200 dark:border-slate-700'],
  ['group-hover:border-slate-500', 'group-hover:border-slate-300 dark:group-hover:border-slate-500'],
  ['group-hover:text-white', 'group-hover:text-slate-900 dark:group-hover:text-white'],

];

replacements.forEach(([from, to]) => {
  code = code.split(from).join(to);
});

fs.writeFileSync('src/pages/DashboardPage.tsx', code);
console.log('Replacements done');
