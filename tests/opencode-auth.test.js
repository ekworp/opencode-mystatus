import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { promisify } from "node:util";

import { readV2AuthData } from "../dist/plugin/lib/opencode-auth.js";

const execFileAsync = promisify(execFile);

async function createDatabase() {
  const directory = await mkdtemp(`${tmpdir()}/mystatus-test-`);
  const databasePath = `${directory}/opencode.db`;
  const sql = `
    CREATE TABLE credential (
      id TEXT PRIMARY KEY,
      integration_id TEXT,
      label TEXT NOT NULL,
      value TEXT NOT NULL,
      connector_id TEXT,
      method_id TEXT,
      active INTEGER,
      time_created INTEGER NOT NULL,
      time_updated INTEGER NOT NULL
    );
    INSERT INTO credential VALUES
      ('openai-1', 'openai', 'OAuth', '{"type":"oauth","access":"test-access"}', NULL, NULL, NULL, 1, 2),
      ('deepseek-1', 'deepseek', 'API key', '{"type":"api","key":"test-key"}', NULL, NULL, 1, 1, 1),
      ('disabled-1', 'zai-coding-plan', 'API key', '{"type":"api","key":"ignored"}', NULL, NULL, 0, 1, 1);
  `;

  await execFileAsync("sqlite3", [databasePath, sql]);
  return { databasePath, directory };
}

test("reads active V2 credentials and filters disabled providers", async () => {
  const { databasePath, directory } = await createDatabase();
  try {
    const auth = await readV2AuthData(databasePath, new Set(["deepseek"]));
    assert.deepEqual(Object.keys(auth), ["openai"]);
    assert.equal(auth.openai.access, "test-access");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
