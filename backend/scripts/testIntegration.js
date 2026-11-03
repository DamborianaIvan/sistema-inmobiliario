import { spawnSync } from "node:child_process";
const result = spawnSync(process.execPath, ["--test", "integracion.test.js"], {
  stdio: "inherit",
  env: { ...process.env, RUN_INTEGRATION: "1" },
});
process.exitCode = result.status ?? 1;
