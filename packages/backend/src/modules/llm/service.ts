import { config } from "../../config/env.js";
import { FAQ_KNOWLEDGE_BASE } from "../../config/faq.js";
import { AppError, LLMGenerateOptions, Message } from "../../types/index.js";
import {
  getToolRegistry,
  LLMToolCall,
  ToolResult,
  StructuredLLMResponse,
} from "../tools/index.js";

export interface LLMResponse {
  text: string;
  toolCalls?: LLMToolCall[];
  proposedActions?: string[];
}

interface ToolMessage {
  role: string;
  content: string | Array<Record<string, unknown>>;
  tool_call_id?: string;
}

const STRUCTURED_OUTPUT_INSTRUCTIONS = `
RESPONSE FORMAT:
You must ALWAYS respond with a valid JSON object containing exactly these fields:
{
  "answer": "Your conversational reply to the customer",
  "proposed_actions": ["Action 1", "Action 2", "Action 3"]
}

PROPOSED ACTIONS GUIDELINES:
- Include 0-3 relevant suggested next steps as natural language phrases
- Base actions on conversation context and available store capabilities
- Suggest actions the user might want, even without explicit intent
- Examples: "Schedule an appointment", "Track my order", "Learn about return policy"
- Keep actions concise and actionable (3-7 words each)

TOOL USAGE:
When you need to perform actions (like scheduling appointments), use the provided tools.
After a tool is executed, incorporate its results naturally into your response.
`;

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

  abstract continueWithToolResults(
    conversationHistory: Message[],
    userMessage: string,
    previousResponse: LLMResponse,
    toolResults: ToolResult[],
    options?: LLMGenerateOptions
  ): Promise<LLMResponse>;

  protected buildSystemPrompt(): string {
    return `${FAQ_KNOWLEDGE_BASE}

${STRUCTURED_OUTPUT_INSTRUCTIONS}

AVAILABLE TOOLS:
You have access to the following tools that you can call when needed:
- schedule_appointment: Schedule customer appointments for store services (product demos, technical support, consultations, device setup, repair assessments)

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

  protected parseStructuredResponse(text: string): {
    answer: string;
    proposedActions: string[];
  } {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          answer: parsed.answer || text,
          proposedActions: Array.isArray(parsed.proposed_actions)
            ? parsed.proposed_actions.slice(0, 3)
            : [],
        };
      }
    } catch {
      // Fall through to default
    }
    return { answer: text, proposedActions: [] };
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

    const messages: ToolMessage[] = [
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

    return this.makeRequest(messages, options);
  }

  async continueWithToolResults(
    conversationHistory: Message[],
    userMessage: string,
    previousResponse: LLMResponse,
    toolResults: ToolResult[],
    options?: LLMGenerateOptions
  ): Promise<LLMResponse> {
    const systemPrompt = this.buildSystemPrompt();
    const conversationContext =
      this.buildConversationContext(conversationHistory);

    const messages: ToolMessage[] = [
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

    if (previousResponse.toolCalls && previousResponse.toolCalls.length > 0) {
      const toolCallsFormatted = previousResponse.toolCalls.map((tc) => ({
        id: tc.id,
        type: "function",
        function: {
          name: tc.name,
          arguments: JSON.stringify(tc.arguments),
        },
      }));

      messages.push({
        role: "assistant",
        content: previousResponse.text || "",
        tool_calls: toolCallsFormatted,
      } as unknown as ToolMessage);

      for (const result of toolResults) {
        messages.push({
          role: "tool",
          tool_call_id: result.toolCallId,
          content: JSON.stringify(
            result.success ? result.result : { error: result.error }
          ),
        });
      }
    }

    return this.makeRequest(messages, options);
  }

  private async makeRequest(
    messages: ToolMessage[],
    options?: LLMGenerateOptions
  ): Promise<LLMResponse> {
    const registry = getToolRegistry();
    const tools = registry.getAllOpenAITools();

    try {
      const requestBody: Record<string, unknown> = {
        model: "gpt-4o-mini",
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1000,
      };

      if (tools.length > 0) {
        requestBody.tools = tools.map((t) => ({
          type: "function",
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
            strict: true,
          },
        }));
        requestBody.tool_choice = "auto";
      }

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
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
      const message = choices?.[0]?.message as Record<string, unknown>;
      const text = (message?.content as string) || "";
      const toolCallsRaw = message?.tool_calls as
        | Array<Record<string, unknown>>
        | undefined;

      const toolCalls: LLMToolCall[] = [];
      if (toolCallsRaw && toolCallsRaw.length > 0) {
        for (const tc of toolCallsRaw) {
          const fn = tc.function as Record<string, unknown>;
          toolCalls.push({
            id: tc.id as string,
            name: fn.name as string,
            arguments: JSON.parse(fn.arguments as string),
          });
        }
      }

      if (toolCalls.length > 0) {
        return { text, toolCalls };
      }

      const parsed = this.parseStructuredResponse(text);
      return {
        text: parsed.answer,
        proposedActions: parsed.proposedActions,
      };
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

    const messages = [
      {
        role: "user",
        content: fullUserMessage,
      },
    ];

    return this.makeRequest(systemPrompt, messages, options);
  }

  async continueWithToolResults(
    conversationHistory: Message[],
    userMessage: string,
    previousResponse: LLMResponse,
    toolResults: ToolResult[],
    options?: LLMGenerateOptions
  ): Promise<LLMResponse> {
    const systemPrompt = this.buildSystemPrompt();
    const conversationContext =
      this.buildConversationContext(conversationHistory);

    const fullUserMessage =
      conversationContext && conversationContext.length > 0
        ? `Previous conversation:\n${conversationContext}\n\nCurrent message: ${userMessage}`
        : userMessage;

    const messages: Array<Record<string, unknown>> = [
      {
        role: "user",
        content: fullUserMessage,
      },
    ];

    if (previousResponse.toolCalls && previousResponse.toolCalls.length > 0) {
      const assistantContent: Array<Record<string, unknown>> = [];

      if (previousResponse.text) {
        assistantContent.push({
          type: "text",
          text: previousResponse.text,
        });
      }

      for (const tc of previousResponse.toolCalls) {
        assistantContent.push({
          type: "tool_use",
          id: tc.id,
          name: tc.name,
          input: tc.arguments,
        });
      }

      messages.push({
        role: "assistant",
        content: assistantContent,
      });

      const toolResultContent: Array<Record<string, unknown>> = [];
      for (const result of toolResults) {
        toolResultContent.push({
          type: "tool_result",
          tool_use_id: result.toolCallId,
          content: JSON.stringify(
            result.success ? result.result : { error: result.error }
          ),
        });
      }

      messages.push({
        role: "user",
        content: toolResultContent,
      });
    }

    return this.makeRequest(systemPrompt, messages, options);
  }

  private async makeRequest(
    systemPrompt: string,
    messages: Array<Record<string, unknown>>,
    options?: LLMGenerateOptions
  ): Promise<LLMResponse> {
    const registry = getToolRegistry();
    const tools = registry.getAllAnthropicTools();

    try {
      const requestBody: Record<string, unknown> = {
        model: "claude-3-5-sonnet-20241022",
        max_tokens: options?.maxTokens ?? 1000,
        system: systemPrompt,
        messages,
      };

      if (tools.length > 0) {
        requestBody.tools = tools;
        requestBody.tool_choice = { type: "auto" };
      }

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(requestBody),
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

      let text = "";
      const toolCalls: LLMToolCall[] = [];

      if (content) {
        for (const block of content) {
          if (block.type === "text") {
            text = block.text as string;
          } else if (block.type === "tool_use") {
            toolCalls.push({
              id: block.id as string,
              name: block.name as string,
              arguments: block.input as Record<string, unknown>,
            });
          }
        }
      }

      if (toolCalls.length > 0) {
        return { text, toolCalls };
      }

      if (!text) {
        throw new AppError(
          500,
          "Empty response from Anthropic",
          "EMPTY_RESPONSE"
        );
      }

      const parsed = this.parseStructuredResponse(text);
      return {
        text: parsed.answer,
        proposedActions: parsed.proposedActions,
      };
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
  private maxToolIterations = 5;

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
  ): Promise<StructuredLLMResponse> {
    const registry = getToolRegistry();
    let response = await this.provider.generateReply(
      conversationHistory,
      userMessage,
      options
    );

    const executedToolCalls: LLMToolCall[] = [];

    let iterations = 0;
    while (
      response.toolCalls &&
      response.toolCalls.length > 0 &&
      iterations < this.maxToolIterations
    ) {
      executedToolCalls.push(...response.toolCalls);

      const toolResults = await registry.executeToolCalls(response.toolCalls);

      response = await this.provider.continueWithToolResults(
        conversationHistory,
        userMessage,
        response,
        toolResults,
        options
      );

      iterations++;
    }

    return {
      answer: response.text,
      proposedActions: response.proposedActions || [],
      toolCalls: executedToolCalls.length > 0 ? executedToolCalls : undefined,
    };
  }
}
