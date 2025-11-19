export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface CostBreakdown {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  model: string;
}

// Pricing per 1M tokens (input/output in USD)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // GPT-5.1 Series (Newest - Nov 2025)
  'gpt-5.1': { input: 1.25, output: 10 },
  'gpt-5.1-chat-latest': { input: 1.25, output: 10 },

  // GPT-5 Series (Aug 2025)
  'gpt-5': { input: 1.25, output: 10 },
  'gpt-5-mini': { input: 0.25, output: 2 },
  'gpt-5-nano': { input: 0.05, output: 0.40 },

  // GPT-4o Series (Multimodal)
  'gpt-4o': { input: 2.50, output: 10 },
  'gpt-4o-2024-11-20': { input: 2.50, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o-mini-2024-07-18': { input: 0.15, output: 0.60 },

  // O-Series Reasoning Models
  'o1-pro': { input: 150, output: 600 },
  'o1-2024-12-17': { input: 15, output: 60 },
  'o1-mini-2024-09-12': { input: 1.10, output: 4.40 },
  'o3-mini-2025-01-31': { input: 1.10, output: 4.40 },
  'o4-mini-2025-04-16': { input: 1.10, output: 4.40 },

  // GPT-4 Legacy
  'gpt-4-turbo-2024-04-09': { input: 10, output: 30 },
  'gpt-4': { input: 30, output: 60 },

  // GPT-3.5 Budget
  'gpt-3.5-turbo-0125': { input: 0.50, output: 1.50 },
};

/**
 * Calculate the cost of an OpenAI API call based on token usage and model
 * @param usage Token usage from OpenAI API response
 * @param model Model name used for the API call
 * @returns Detailed cost breakdown
 */
export function calculateCost(
  usage: TokenUsage,
  model: string
): CostBreakdown {
  // Get pricing for the model, fallback to GPT-4o if model not found
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-4o'];

  // Calculate cost (pricing is per 1M tokens, so divide by 1,000,000)
  const inputCost = (usage.prompt_tokens / 1_000_000) * pricing.input;
  const outputCost = (usage.completion_tokens / 1_000_000) * pricing.output;
  const totalCost = inputCost + outputCost;

  return {
    inputTokens: usage.prompt_tokens,
    outputTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
    inputCost,
    outputCost,
    totalCost,
    model,
  };
}

/**
 * Format a cost value for display
 * @param cost Cost in USD
 * @returns Formatted string with 4 decimal places
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}
