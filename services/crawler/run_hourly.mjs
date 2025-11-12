import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const entry = path.resolve(__dirname, "./private_connectors/controller.mjs");
const logFile = "/tmp/marcatus-crawler.log";

console.log(`[Scheduler] Launching Marcatus private connectors at ${new Date().toISOString()}`);

const child = spawn(process.execPath, [entry], {
  stdio: ["ignore", "pipe", "pipe"]
});

let output = "";
child.stdout.on("data", d => output += d.toString());
child.stderr.on("data", d => output += d.toString());
child.on("close", code => {
  const fs = await import("fs");
  fs.appendFileSync(logFile, `\n[${new Date().toISOString()}] Exit ${code}\n${output}\n`);
  console.log(`[Scheduler] Completed with code ${code}`);
});
