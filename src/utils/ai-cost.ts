import { env } from "../config/env.js";

export function computeAiCostUsd(
  inputTokens: number,
  outputTokens: number
): number {
  const inputCost =
    (inputTokens / 1_000_000) * env.ai.inputCostPerMtk;
  const outputCost =
    (outputTokens / 1_000_000) * env.ai.outputCostPerMtk;
  return inputCost + outputCost;
}

export function computeAiCostBrl(
  inputTokens: number,
  outputTokens: number
): number {
  return computeAiCostUsd(inputTokens, outputTokens) * env.ai.usdToBrlRate;
}

export const AI_COST_INPUT_SQL = `(COALESCE(input_tokens, 0)::float / 1000000.0 * ${env.ai.inputCostPerMtk})`;
export const AI_COST_OUTPUT_SQL = `(COALESCE(output_tokens, 0)::float / 1000000.0 * ${env.ai.outputCostPerMtk})`;
export const AI_COST_USD_SQL = `(${AI_COST_INPUT_SQL} + ${AI_COST_OUTPUT_SQL})`;
export const AI_COST_BRL_SQL = `(${AI_COST_USD_SQL} * ${env.ai.usdToBrlRate})`;
