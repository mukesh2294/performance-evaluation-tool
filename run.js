const { spawn } = require('child_process');
const path = require('path');

console.log('Starting Performify Application (Backend + Frontend)...');

// Start Backend
const backendPath = path.join(__dirname, 'backend');
const backendProcess = spawn('npm', ['start'], {
  cwd: backendPath,
  shell: true,
  stdio: 'inherit'
});

// Start Frontend
const frontendPath = path.join(__dirname, 'frontend');
const frontendProcess = spawn('npm', ['run', 'dev'], {
  cwd: frontendPath,
  shell: true,
  stdio: 'inherit'
});

// Clean up processes on exit
const cleanup = () => {
  console.log('\nShutting down backend and frontend servers...');
  backendProcess.kill();
  frontendProcess.kill();
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
