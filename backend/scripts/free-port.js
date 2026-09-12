import { execSync } from 'child_process';
import os from 'os';
import { pathToFileURL } from 'url';

// Kills whatever process is listening on `port`. Works on Windows (netstat/taskkill)
// and Unix (lsof/kill). Silently no-ops if nothing is listening.
export function killPort(port) {
  try {
    if (os.platform() === 'win32') {
      const out = execSync(`netstat -ano | findstr :${port}`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
      const pids = new Set(
        out.split('\n')
          .map((line) => line.trim().split(/\s+/).pop())
          .filter((pid) => pid && /^\d+$/.test(pid))
      );
      for (const pid of pids) {
        try { execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' }); } catch { /* already gone */ }
      }
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' });
    }
  } catch {
    // Nothing listening on the port.
  }
}

// Allow running directly: `node scripts/free-port.js [port]`
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  killPort(process.argv[2] || process.env.PORT || 3000);
}
