import {
  AnthropicTool,
  LLMToolCall,
  OpenAITool,
  ToolDefinition,
  ToolExecutor,
  ToolResult,
} from "./types.js";

export abstract class BaseTool implements ToolExecutor {
  abstract readonly definition: ToolDefinition;

  abstract execute(args: Record<string, unknown>): Promise<ToolResult>;

  toOpenAIFormat(): OpenAITool {
    return {
      type: "function",
      name: this.definition.name,
      description: this.definition.description,
      parameters: {
        type: "object",
        properties: this.definition.parameters.properties,
        required: this.definition.parameters.required,
        additionalProperties: false,
      },
      strict: true,
    };
  }

  toAnthropicFormat(): AnthropicTool {
    return {
      name: this.definition.name,
      description: this.definition.description,
      input_schema: {
        type: "object",
        properties: this.definition.parameters.properties,
        required: this.definition.parameters.required,
      },
    };
  }
}

export class ToolRegistry {
  private tools: Map<string, BaseTool> = new Map();

  register(tool: BaseTool): void {
    this.tools.set(tool.definition.name, tool);
  }

  get(name: string): BaseTool | undefined {
    return this.tools.get(name);
  }

  getAll(): BaseTool[] {
    return Array.from(this.tools.values());
  }

  getAllOpenAITools(): OpenAITool[] {
    return this.getAll().map((tool) => tool.toOpenAIFormat());
  }

  getAllAnthropicTools(): AnthropicTool[] {
    return this.getAll().map((tool) => tool.toAnthropicFormat());
  }

  async executeToolCalls(toolCalls: LLMToolCall[]): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const call of toolCalls) {
      const tool = this.get(call.name);

      if (!tool) {
        results.push({
          toolCallId: call.id,
          success: false,
          error: `Unknown tool: ${call.name}`,
        });
        continue;
      }

      try {
        const result = await tool.execute(call.arguments);
        results.push({
          ...result,
          toolCallId: call.id,
        });
      } catch (error) {
        results.push({
          toolCallId: call.id,
          success: false,
          error:
            error instanceof Error ? error.message : "Tool execution failed",
        });
      }
    }

    return results;
  }
}

const globalToolRegistry = new ToolRegistry();

export function getToolRegistry(): ToolRegistry {
  return globalToolRegistry;
}
