const fs = require('fs');
let code = fs.readFileSync('src/pages/Nodo360Page.tsx', 'utf8');

// Modificamos el HEADER principal de Nodo360Page para el tema claro
code = code.replace(
  /<div className="flex items-center gap-3">\s*<div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-600\/30">\s*<Flame className="w-5 h-5 text-white" \/>\s*<\/div>\s*<div>\s*<h1 className="text-xl font-bold text-white">NODO360<\/h1>\s*<p className="text-sm text-slate-400">/g,
  `<div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/30">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">NODO360</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">`
);

code = code.replace(
  /<div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">/g,
  `<div className="flex bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1">`
);

code = code.replace(
  /className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all \${section === 'panel' \? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}/g,
  'className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${section === \'panel\' ? \'bg-white dark:bg-red-600 text-red-600 dark:text-white shadow-sm dark:shadow-none\' : \'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white\'}`}'
);

code = code.replace(
  /className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all \${section === 'reports' \? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}/g,
  'className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${section === \'reports\' ? \'bg-white dark:bg-red-600 text-red-600 dark:text-white shadow-sm dark:shadow-none\' : \'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white\'}`}'
);

code = code.replace(
  /className="bg-slate-800 border border-slate-700 text-slate-100 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-red-500 transition-colors min-w-\[220px\]"/g,
  'className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-red-500 transition-colors min-w-[220px] shadow-sm dark:shadow-none"'
);

code = code.replace(
  /className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"/g,
  'className="flex items-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors shadow-sm dark:shadow-none"'
);

fs.writeFileSync('src/pages/Nodo360Page.tsx', code);
