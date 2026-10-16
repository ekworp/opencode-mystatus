/**
 * Read credentials from OpenCode V2's SQLite database.
 *
 * The sqlite3 CLI is used instead of adding a native Node SQLite dependency.
 */

import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { promisify } from "node:util";
import type { ProviderId } from "./config";
import type { AuthData } from "./types";

const execFileAsync = promisify(execFile);
const DATABASE_PATH = `${homedir()}/.local/share/opencode/opencode.db`;

interface CredentialRow {
  integration_id: string;
  value: string;
}

/** Read active V2 credentials without modifying the database. */
export async function readV2AuthData(
  databasePath = DATABASE_PATH,
  disabledProviders: Set<ProviderId> = new Set(),
): Promise<AuthData> {
  const providerIds = [
    "openai",
    "zhipuai-coding-plan",
    "zai-coding-plan",
    "github-copilot",
    "deepseek",
  ].filter((provider) => !disabledProviders.has(provider as ProviderId));
  if (providerIds.length === 0) return {};

  const sql = `SELECT integration_id, value FROM credential WHERE (active IS NULL OR active != 0) AND integration_id IN (${providerIds.map((provider) => `'${provider}'`).join(", ")}) ORDER BY time_updated DESC;`;

  try {
    const { stdout } = await execFileAsync(
      "sqlite3",
      ["-json", `file:${databasePath}?mode=ro`, sql],
      { maxBuffer: 1024 * 1024, windowsHide: true },
    );
    const rows = JSON.parse(stdout) as CredentialRow[];
    const authData: AuthData = {};

    for (const row of rows) {
      if (!row.integration_id || typeof row.value !== "string") continue;

      try {
        const value: unknown = JSON.parse(row.value);
        if (
          value &&
          typeof value === "object" &&
          !(row.integration_id in authData)
        ) {
          // Integration IDs are the same provider IDs used by auth.json.
          (authData as Record<string, unknown>)[row.integration_id] = value;
        }
      } catch {
        // Ignore malformed rows and continue reading other providers.
      }
    }

    return authData;
  } catch {
    return {};
  }
}
