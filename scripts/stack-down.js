const { spawn } = require('node:child_process');

const isWindows = process.platform === 'win32';

const runCommand = (command, args, label) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: true,
      windowsHide: true,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) {
        resolve('');
        return;
      }

      reject(new Error(`${label} exited with code ${code}`));
    });
  });

const runCommandCapture = (command, args, label) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: true,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }

      reject(
        new Error(
          `${label} exited with code ${code}${
            stderr ? `: ${stderr.trim()}` : ''
          }`,
        ),
      );
    });
  });

const getPidsOnPort = async port => {
  if (isWindows) {
    const output = await runCommandCapture(
      'netstat',
      ['-ano', '-p', 'tcp'],
      'netstat',
    );

    const pids = output
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => line.split(/\s+/))
      .filter(parts => parts.length >= 5)
      .filter(parts => {
        const localAddress = parts[1] ?? '';
        const state = parts[3] ?? '';
        return localAddress.endsWith(`:${port}`) && state === 'LISTENING';
      })
      .map(parts => Number(parts[4]))
      .filter(pid => !Number.isNaN(pid));

    return [...new Set(pids)];
  }

  const output = await runCommandCapture('lsof', ['-ti', `tcp:${port}`], 'lsof');
  const pids = output
    .split(/\r?\n/)
    .map(line => Number(line.trim()))
    .filter(pid => !Number.isNaN(pid));

  return [...new Set(pids)];
};

const killPid = async pid => {
  if (isWindows) {
    await runCommand('taskkill', ['/PID', String(pid), '/T', '/F'], 'taskkill');
    return;
  }

  process.kill(pid, 'SIGTERM');
};

const stopMetroIfRunning = async () => {
  const metroPort = 8081;
  const pids = await getPidsOnPort(metroPort);

  if (pids.length === 0) {
    process.stdout.write('[stack:down] No process is listening on port 8081.\n');
    return;
  }

  process.stdout.write(
    `[stack:down] Stopping process(es) on port 8081: ${pids.join(', ')}\n`,
  );

  for (const pid of pids) {
    await killPid(pid);
  }
};

const main = async () => {
  try {
    await runCommand('docker', ['compose', 'down'], 'docker compose down');
    await stopMetroIfRunning();
    process.stdout.write('[stack:down] Stack and Metro shutdown complete.\n');
  } catch (error) {
    process.stderr.write(`[stack:down] ${error.message}\n`);
    process.exit(1);
  }
};

main();
