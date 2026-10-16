import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export type ProviderId =
  | "openai"
  | "zhipuai-coding-plan"
  | "zai-coding-plan"
  | "deepseek"
  | "google"
  | "github-copilot";

interface MystatusConfigFile {
  disabledProviders?: unknown;
  useOpenCodeProxy?: unknown;
}

export interface MystatusConfig {
  disabledProviders: Set<ProviderId>;
  useOpenCodeProxy: boolean;
}

const CONFIG_PATH = join(homedir(), ".config/opencode/mystatus.json");

/** Read optional provider filters. Invalid or missing config means enabled all. */
export async function readMystatusConfig(): Promise<MystatusConfig> {
  try {
    const content = await readFile(CONFIG_PATH, "utf8");
    const config = JSON.parse(content) as MystatusConfigFile;
    if (!Array.isArray(config.disabledProviders)) {
      return {
        disabledProviders: new Set(),
        useOpenCodeProxy: config.useOpenCodeProxy !== false,
      };
    }

    const validProviders: ProviderId[] = [
      "openai",
      "zhipuai-coding-plan",
      "zai-coding-plan",
      "deepseek",
      "google",
      "github-copilot",
    ];
    return {
      disabledProviders: new Set(
        config.disabledProviders.filter((provider): provider is ProviderId =>
          validProviders.includes(provider as ProviderId),
        ),
      ),
      useOpenCodeProxy: config.useOpenCodeProxy !== false,
    };
  } catch {
    return { disabledProviders: new Set(), useOpenCodeProxy: true };
  }
}

export function isProviderEnabled(
  disabledProviders: Set<ProviderId>,
  provider: ProviderId,
): boolean {
  return !disabledProviders.has(provider);
}

export { CONFIG_PATH };
