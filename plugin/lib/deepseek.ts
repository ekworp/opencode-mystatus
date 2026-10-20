/** DeepSeek account balance query module. */

import { t } from "./i18n";
import type { DeepSeekAuthData, QueryResult } from "./types";
import { fetchWithTimeout, maskString } from "./utils";

interface BalanceInfo {
  currency: string;
  total_balance: string;
  granted_balance: string;
  topped_up_balance: string;
}

interface BalanceResponse {
  is_available: boolean;
  balance_infos: BalanceInfo[];
}

const DEEPSEEK_BALANCE_URL = "https://api.deepseek.com/user/balance";

async function fetchBalance(apiKey: string): Promise<BalanceResponse> {
  const response = await fetchWithTimeout(DEEPSEEK_BALANCE_URL, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "OpenCode-Status-Plugin/1.0",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(t.deepseekApiError(response.status, errorText));
  }

  return (await response.json()) as BalanceResponse;
}

function formatBalance(data: BalanceResponse, apiKey: string): string {
  const lines = [
    `${t.account}        ${maskString(apiKey)} (${t.deepseekAccountName})`,
    "",
  ];

  if (!data.is_available || !data.balance_infos?.length) {
    lines.push(t.deepseekNoBalance);
    return lines.join("\n");
  }

  for (const balance of data.balance_infos) {
    lines.push(
      `${t.deepseekBalance}: ${balance.total_balance} ${balance.currency}`,
    );
    lines.push(
      `${t.deepseekGrantedBalance}: ${balance.granted_balance} ${balance.currency}`,
    );
    lines.push(
      `${t.deepseekToppedUpBalance}: ${balance.topped_up_balance} ${balance.currency}`,
    );
  }

  return lines.join("\n");
}

export async function queryDeepSeekUsage(
  authData: DeepSeekAuthData | undefined,
): Promise<QueryResult | null> {
  // OpenCode stores API-key credentials with type "key" in V2.
  // Keep accepting the older "api" shape for compatibility.
  if (!authData?.key || !["key", "api"].includes(authData.type)) return null;

  try {
    const balance = await fetchBalance(authData.key);
    return { success: true, output: formatBalance(balance, authData.key) };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
