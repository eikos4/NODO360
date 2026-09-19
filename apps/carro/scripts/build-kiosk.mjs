import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const web = path.resolve(root, '../web');
const win = process.platform === 'win32';

function run(command, args, cwd, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: win,
      env: { ...process.env, ...extraEnv },
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited ${code}`));
    });
  });
}

const api = process.env.VITE_API_URL || 'https://nodo360-api.onrender.com/api';
await run('npm', ['run', 'build:render'], web, {
  VITE_CARRO_KIOSK: '1',
  VITE_API_URL: api,
});
