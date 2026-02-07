/**
 * Tool System Types
 *
 * Core types for the agent tool calling system.
 */

/**
 * Tool parameter schema following JSON Schema format
 */
export interface ToolParameterProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  enum?: string[];
  items?: ToolParameterProperty;
  properties?: Record<string, ToolParameterProperty>;
}

export interface ToolParameters {
  type: 'object';
  properties: Record<string, ToolParameterProperty>;
  required?: string[];
}

/**
 * Tool definition for agent
 */
export interface AgentTool {
  name: string;
  description: string;
  parameters: ToolParameters;
  handler: (params: any) => Promise<any>;
}

/**
 * Result of tool execution
 */
export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Tool Registry - manages available tools
 */
export class ToolRegistry {
  private tools: Map<string, AgentTool> = new Map();

  register(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
  }

  registerAll(tools: AgentTool[]): void {
    tools.forEach((tool) => this.register(tool));
  }

  get(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  getAll(): AgentTool[] {
    return Array.from(this.tools.values());
  }

  async execute(name: string, params: any): Promise<ToolExecutionResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        success: false,
        error: `Tool not found: ${name}`,
      };
    }

    try {
      const data = await tool.handler(params);
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || String(error),
      };
    }
  }

  getOpenAIFunctions(): Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: any;
    };
  }> {
    return this.getAll().map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  clear(): void {
    this.tools.clear();
  }
}
