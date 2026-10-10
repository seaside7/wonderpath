export type Provider = 'openai' | 'deepseek';

export interface UsageInfo {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface GatewayResult {
  provider: Provider;
  model: string;
  content: string;
  usage: UsageInfo;
}

interface ProviderConfig {
  apiKey: string;
  model: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required but not set (check repo-root .env)`);
  }
  return value;
}

function openAiConfig(model?: string): ProviderConfig {
  return {
    apiKey: requireEnv('OPENAI_API_KEY'),
    model: model ?? process.env.QA_OPENAI_MODEL ?? 'gpt-5.6-sol',
  };
}

function deepSeekConfig(model?: string): ProviderConfig {
  return {
    apiKey: requireEnv('DEEPSEEK_API_KEY'),
    model: model ?? process.env.QA_DEEPSEEK_MODEL ?? 'deepseek-chat',
  };
}

async function callOpenAi(
  prompt: string,
  systemPrompt: string,
  requestedModel?: string,
): Promise<GatewayResult> {
  const { apiKey, model } = openAiConfig(requestedModel);
  const reasoningEffort = process.env.QA_OPENAI_REASONING_EFFORT ?? 'medium';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      reasoning_effort: reasoningEffort,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const rawBody = await response.text();
    throw new Error(
      `OpenAI request failed (${response.status}): ${rawBody.slice(0, 500)}`,
    );
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  };

  return {
    provider: 'openai',
    model,
    content: data.choices[0].message.content,
    usage: {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    },
  };
}

async function callDeepSeek(
  prompt: string,
  systemPrompt: string,
  requestedModel?: string,
): Promise<GatewayResult> {
  const { apiKey, model } = deepSeekConfig(requestedModel);

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const rawBody = await response.text();
    throw new Error(
      `DeepSeek request failed (${response.status}): ${rawBody.slice(0, 500)}`,
    );
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  };

  return {
    provider: 'deepseek',
    model,
    content: data.choices[0].message.content,
    usage: {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    },
  };
}

/**
 * Single entry point for all LLM calls in the QA seed pipeline.
 * Nothing else in this pipeline should import an OpenAI/DeepSeek SDK
 * or call fetch() against either provider directly.
 */
export async function generate(
  provider: Provider,
  prompt: string,
  systemPrompt: string,
  model?: string,
): Promise<GatewayResult> {
  return provider === 'openai'
    ? callOpenAi(prompt, systemPrompt, model)
    : callDeepSeek(prompt, systemPrompt, model);
}

/**
 * Vision variant for image auditing (OpenAI only — DeepSeek chat has no
 * vision input on this endpoint). Sends the image URLs alongside the prompt
 * and requires strict JSON back, same contract as the text calls.
 */
export async function generateWithImages(
  prompt: string,
  systemPrompt: string,
  model: string,
  imageUrls: string[],
): Promise<GatewayResult> {
  const { apiKey } = openAiConfig();
  const usedModel = model || openAiConfig().model;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: usedModel,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            ...imageUrls.map((url) => ({
              type: 'image_url',
              image_url: { url },
            })),
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const rawBody = await response.text();
    throw new Error(
      `OpenAI vision request failed (${response.status}): ${rawBody.slice(0, 500)}`,
    );
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  };

  return {
    provider: 'openai',
    model: usedModel,
    content: data.choices[0].message.content,
    usage: {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    },
  };
}
