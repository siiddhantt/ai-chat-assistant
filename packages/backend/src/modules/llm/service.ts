import { config } from "../../config/env.js";
import { FAQ_KNOWLEDGE_BASE } from "../../config/faq.js";
import { AppError, LLMGenerateOptions, Message } from "../../types/index.js";

export interface LLMResponse {
  text: string;
}

export abstract class LLMProvider {
  protected apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  abstract generateReply(
    conversationHistory: Message[],
    userMessage: string,
    options?: LLMGenerateOptions
  ): Promise<LLMResponse>;

  protected buildSystemPrompt(): string {
    return `${FAQ_KNOWLEDGE_BASE}

Important Guidelines:
- Be concise and helpful
- Only discuss topics related to our store, products, orders, shipping, and returns
- If asked about unrelated topics, politely redirect to store-related questions
- If you don't have information to answer a question, offer to escalate to a human agent
- Never provide personal advice, political opinions, or discuss sensitive topics
- Do not generate, encourage, or assist with any harmful, illegal, or inappropriate content`;
  }

  protected buildConversationContext(conversationHistory: Message[]): string {
    return conversationHistory
      .slice(-10)
      .map(
        (msg) => `${msg.role === "user" ? "Customer" : "Agent"}: ${msg.content}`
      )
      .join("\n");
  }
}

export class OpenAIProvider extends LLMProvider {
  private apiUrl = "https://api.openai.com/v1/chat/completions";

  async generateReply(
    conversationHistory: Message[],
    userMessage: string,
    options?: LLMGenerateOptions
  ): Promise<LLMResponse> {
    const systemPrompt = this.buildSystemPrompt();
    const conversationContext =
      this.buildConversationContext(conversationHistory);

    const messages = [
      { role: "system", content: systemPrompt },
      ...(conversationContext
        ? [
            {
              role: "system",
              content: `Previous conversation:\n${conversationContext}`,
            },
          ]
        : []),
      { role: "user", content: userMessage },
    ];

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 500,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as Record<string, unknown>;
        if (response.status === 401) {
          throw new AppError(401, "Invalid OpenAI API key", "INVALID_API_KEY");
        }
        if (response.status === 429) {
          throw new AppError(
            429,
            "Rate limit exceeded. Please try again later.",
            "RATE_LIMIT"
          );
        }
        const errorMsg =
          (errorData.error as Record<string, unknown>)?.message ||
          "OpenAI API error";
        throw new AppError(500, String(errorMsg), "LLM_ERROR");
      }

      const data = (await response.json()) as Record<string, unknown>;
      const choices = data.choices as
        | Array<Record<string, unknown>>
        | undefined;
      const text =
        ((choices?.[0]?.message as Record<string, unknown>)
          ?.content as string) || "";

      if (!text) {
        throw new AppError(500, "Empty response from OpenAI", "EMPTY_RESPONSE");
      }

      return { text };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof Error) {
        if (error.message.includes("fetch")) {
          throw new AppError(
            500,
            "Failed to connect to OpenAI API",
            "CONNECTION_ERROR"
          );
        }
      }
      throw new AppError(500, "Failed to generate reply", "LLM_ERROR");
    }
  }
}

export class AnthropicProvider extends LLMProvider {
  private apiUrl = "https://api.anthropic.com/v1/messages";

  async generateReply(
    conversationHistory: Message[],
    userMessage: string,
    options?: LLMGenerateOptions
  ): Promise<LLMResponse> {
    const systemPrompt = this.buildSystemPrompt();
    const conversationContext =
      this.buildConversationContext(conversationHistory);

    const fullUserMessage =
      conversationContext && conversationContext.length > 0
        ? `Previous conversation:\n${conversationContext}\n\nCurrent message: ${userMessage}`
        : userMessage;

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: options?.maxTokens ?? 500,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: fullUserMessage,
            },
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new AppError(
            401,
            "Invalid Anthropic API key",
            "INVALID_API_KEY"
          );
        }
        if (response.status === 429) {
          throw new AppError(
            429,
            "Rate limit exceeded. Please try again later.",
            "RATE_LIMIT"
          );
        }
        const errorData = (await response.json()) as Record<string, unknown>;
        const errorMsg =
          (errorData.error as Record<string, unknown>)?.message ||
          "Anthropic API error";
        throw new AppError(500, String(errorMsg), "LLM_ERROR");
      }

      const data = (await response.json()) as Record<string, unknown>;
      const content = data.content as
        | Array<Record<string, unknown>>
        | undefined;
      const text = (content?.[0]?.text as string) || "";

      if (!text) {
        throw new AppError(
          500,
          "Empty response from Anthropic",
          "EMPTY_RESPONSE"
        );
      }

      return { text };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof Error) {
        if (error.message.includes("fetch")) {
          throw new AppError(
            500,
            "Failed to connect to Anthropic API",
            "CONNECTION_ERROR"
          );
        }
      }
      throw new AppError(500, "Failed to generate reply", "LLM_ERROR");
    }
  }
}

export class LLMService {
  private provider: LLMProvider;

  constructor() {
    const { provider: providerName, apiKey } = config.llm;

    if (!apiKey) {
      throw new Error("LLM_API_KEY environment variable is not set");
    }

    if (providerName === "anthropic") {
      this.provider = new AnthropicProvider(apiKey);
    } else {
      this.provider = new OpenAIProvider(apiKey);
    }
  }

  async generateReply(
    conversationHistory: Message[],
    userMessage: string,
    options?: LLMGenerateOptions
  ): Promise<string> {
    const response = await this.provider.generateReply(
      conversationHistory,
      userMessage,
      options
    );
    return response.text;
  }
}
