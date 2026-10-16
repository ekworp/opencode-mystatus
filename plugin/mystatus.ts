/**
 * OpenCode 额度状态查询插件
 *
 * [输入]: OpenCode V2 SQLite 凭证和 ~/.config/opencode/antigravity-accounts.json 中的认证信息
 * [输出]: 带进度条的额度使用情况展示
 * [定位]: 通过 mystatus 工具查询各账号额度
 * [同步]: lib/openai.ts, lib/zhipu.ts, lib/deepseek.ts, lib/google.ts, lib/types.ts, lib/i18n.ts
 */

import { homedir } from "node:os";
import { join } from "node:path";
import { Plugin } from "@opencode/plugin";
import {
  isProviderEnabled,
  type ProviderId,
  readMystatusConfig,
} from "./lib/config";
import { queryCopilotUsage } from "./lib/copilot";
import { queryDeepSeekUsage } from "./lib/deepseek";
import { queryGoogleUsage } from "./lib/google";
import { t } from "./lib/i18n";
import { queryOpenAIUsage } from "./lib/openai";
import { readV2AuthData } from "./lib/opencode-auth";
import type { QueryResult } from "./lib/types";
import { configureOpenCodeProxy } from "./lib/utils";
import { queryZaiUsage, queryZhipuUsage } from "./lib/zhipu";

// ============================================================================
// V2 插件导出
// ============================================================================

export default Plugin.define({
  id: "opencode-mystatus",
  async setup(ctx) {
    await ctx.tool.transform((editor) => {
      editor.add({
        name: "mystatus",
        description:
          "Query account quota usage for all configured AI platforms. Returns remaining quota percentages, usage stats, balances, and reset countdowns. Currently supports OpenAI (ChatGPT/Codex), Zhipu AI, Z.ai, DeepSeek, Google Antigravity, and GitHub Copilot.",
        input: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        async execute() {
          // V2 stores credentials and refreshed OAuth tokens in SQLite.
          const databasePath = join(
            homedir(),
            ".local/share/opencode/opencode.db",
          );
          const config = await readMystatusConfig();
          const { disabledProviders } = config;
          configureOpenCodeProxy(config.useOpenCodeProxy);
          const authData = await readV2AuthData(
            databasePath,
            disabledProviders,
          );

          const providers: ProviderId[] = [
            "openai",
            "zhipuai-coding-plan",
            "zai-coding-plan",
            "deepseek",
            "google",
            "github-copilot",
          ];
          const hasEnabledProvider = providers.some((provider) =>
            isProviderEnabled(disabledProviders, provider),
          );

          if (!hasEnabledProvider) return { content: t.noAccounts };

          if (
            Object.keys(authData).length === 0 &&
            !isProviderEnabled(disabledProviders, "google")
          ) {
            return {
              content: t.authError(
                databasePath,
                "OpenCode V2 credentials were not found in the credential table",
              ),
            };
          }

          // 2. 并行查询所有平台（Google 不依赖 authData）
          const [
            openaiResult,
            zhipuResult,
            zaiResult,
            deepseekResult,
            googleResult,
            copilotResult,
          ] = await Promise.all([
            isProviderEnabled(disabledProviders, "openai")
              ? retryQuery(() => queryOpenAIUsage(authData.openai))
              : null,
            isProviderEnabled(disabledProviders, "zhipuai-coding-plan")
              ? retryQuery(() =>
                  queryZhipuUsage(authData["zhipuai-coding-plan"]),
                )
              : null,
            isProviderEnabled(disabledProviders, "zai-coding-plan")
              ? retryQuery(() => queryZaiUsage(authData["zai-coding-plan"]))
              : null,
            isProviderEnabled(disabledProviders, "deepseek")
              ? retryQuery(() => queryDeepSeekUsage(authData.deepseek))
              : null,
            isProviderEnabled(disabledProviders, "google")
              ? retryQuery(() => queryGoogleUsage())
              : null,
            isProviderEnabled(disabledProviders, "github-copilot")
              ? retryQuery(() => queryCopilotUsage(authData["github-copilot"]))
              : null,
          ]);

          // 3. 收集结果
          const results: string[] = [];
          const errors: string[] = [];

          // 处理 OpenAI 结果
          collectResult(openaiResult, t.openaiTitle, results, errors);

          // 处理智谱结果
          collectResult(zhipuResult, t.zhipuTitle, results, errors);

          // 处理 Z.ai 结果
          collectResult(zaiResult, t.zaiTitle, results, errors);

          // 处理 DeepSeek 结果
          collectResult(deepseekResult, t.deepseekTitle, results, errors);

          // 处理 Google 结果
          collectResult(googleResult, t.googleTitle, results, errors);

          // 处理 GitHub Copilot 结果
          collectResult(copilotResult, t.copilotTitle, results, errors);

          // 4. 汇总输出
          if (results.length === 0 && errors.length === 0) {
            return { content: t.noAccounts };
          }

          let output = results.join("\n");

          if (errors.length > 0) {
            if (output) output += "\n\n";
            output += t.queryFailed + errors.join("\n");
          }

          return { content: output };
        },
      });
    });
  },
});

/**
 * 收集查询结果到 results 和 errors 数组
 * 注意：这是内部函数，不导出，避免被 OpenCode 当作插件加载
 */
function collectResult(
  result: QueryResult | null,
  title: string,
  results: string[],
  errors: string[],
): void {
  if (!result) return;

  if (result.success && result.output) {
    if (results.length > 0) results.push(""); // 分隔符
    results.push(title);
    results.push("");
    results.push(result.output);
  } else if (result.error) {
    errors.push(result.error);
  }
}

/** Retry transient provider failures before displaying an error. */
async function retryQuery(
  query: () => Promise<QueryResult | null>,
): Promise<QueryResult | null> {
  const maxAttempts = 3;
  let result: QueryResult | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      result = await query();
    } catch (err) {
      result = {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    // null means the provider is not configured; it should not be retried.
    if (!result || result.success || attempt === maxAttempts) return result;

    // 500ms, then 1s. Avoid hammering a temporarily unavailable API.
    await new Promise((resolve) => setTimeout(resolve, attempt * 500));
  }

  return result;
}
