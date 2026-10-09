/**
 * OpenCode 额度状态查询插件
 *
 * [输入]: ~/.local/share/opencode/auth.json 和 ~/.config/opencode/antigravity-accounts.json 中的认证信息
 * [输出]: 带进度条的额度使用情况展示
 * [定位]: 通过 mystatus 工具查询各账号额度
 * [同步]: lib/openai.ts, lib/zhipu.ts, lib/google.ts, lib/types.ts, lib/i18n.ts
 */

import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { Plugin } from "@opencode/plugin";
import { queryCopilotUsage } from "./lib/copilot";
import { queryGoogleUsage } from "./lib/google";
import { t } from "./lib/i18n";
import { queryOpenAIUsage } from "./lib/openai";
import type { AuthData, QueryResult } from "./lib/types";
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
          "Query account quota usage for all configured AI platforms. Returns remaining quota percentages, usage stats, and reset countdowns with visual progress bars. Currently supports OpenAI (ChatGPT/Codex), Zhipu AI, Z.ai, Google Antigravity, and GitHub Copilot.",
        input: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        async execute() {
          // 1. 读取 auth.json
          const authPath = join(homedir(), ".local/share/opencode/auth.json");
          let authData: AuthData;

          try {
            const content = await readFile(authPath, "utf-8");
            authData = JSON.parse(content);
          } catch (err) {
            return {
              content: t.authError(
                authPath,
                err instanceof Error ? err.message : String(err),
              ),
            };
          }

          // 2. 并行查询所有平台（Google 不依赖 authData）
          const [
            openaiResult,
            zhipuResult,
            zaiResult,
            googleResult,
            copilotResult,
          ] = await Promise.all([
            queryOpenAIUsage(authData.openai),
            queryZhipuUsage(authData["zhipuai-coding-plan"]),
            queryZaiUsage(authData["zai-coding-plan"]),
            queryGoogleUsage(),
            queryCopilotUsage(authData["github-copilot"]),
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
