import * as fs from 'fs';
import * as path from 'path';

export function logToFile(text: string) {
  const logPath = path.join(__dirname, '..', 'logs', 'agent.log');
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, `${new Date().toISOString()} - ${text}\n`);
}
