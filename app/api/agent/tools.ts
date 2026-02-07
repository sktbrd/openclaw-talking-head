/**
 * Server-side tools for the AI agent
 *
 * These are demo tools to demonstrate the tool calling system.
 * In production, you would replace these with real integrations.
 */

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResult {
  id: string;
  result: any;
}

/**
 * Get all available server tools in OpenAI format
 */
export function getServerTools(): ToolDefinition[] {
  return [
    {
      type: 'function',
      function: {
        name: 'get_current_time',
        description: 'Get the current time and date. Use this when the user asks what time it is or what the date is.',
        parameters: {
          type: 'object',
          properties: {}
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'tell_joke',
        description: 'Tell a random joke. Use this when the user wants to hear something funny or asks for a joke.',
        parameters: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: ['general', 'programming', 'dad'],
              description: 'Type of joke to tell. Choose based on context or default to general.'
            }
          },
          required: []
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'get_weather',
        description: 'Get current weather for a location (demo - returns simulated weather data). Use this when the user asks about weather.',
        parameters: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'City name or location to get weather for'
            }
          },
          required: ['location']
        }
      }
    }
  ];
}

/**
 * Execute tool calls and return results
 */
export async function executeTools(toolCalls: ToolCall[]): Promise<ToolResult[]> {
  const results: ToolResult[] = [];

  for (const toolCall of toolCalls) {
    let params: any = {};

    try {
      params = JSON.parse(toolCall.function.arguments);
    } catch (error) {
      console.error('[Tools] Error parsing tool arguments:', error);
      results.push({
        id: toolCall.id,
        result: { error: 'Invalid arguments' }
      });
      continue;
    }

    let result: any;

    try {
      switch (toolCall.function.name) {
        case 'get_current_time':
          result = await getCurrentTime();
          break;

        case 'tell_joke':
          result = await tellJoke(params.category || 'general');
          break;

        case 'get_weather':
          result = await getWeather(params.location);
          break;

        default:
          result = { error: `Unknown tool: ${toolCall.function.name}` };
      }
    } catch (error: any) {
      console.error(`[Tools] Error executing ${toolCall.function.name}:`, error);
      result = { error: error.message };
    }

    results.push({
      id: toolCall.id,
      result
    });
  }

  return results;
}

/**
 * Tool: Get current time
 */
async function getCurrentTime() {
  const now = new Date();
  return {
    time: now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    }),
    date: now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    timestamp: now.toISOString()
  };
}

/**
 * Tool: Tell a joke
 */
async function tellJoke(category: 'general' | 'programming' | 'dad' = 'general') {
  const jokes = {
    general: [
      'Why did the scarecrow win an award? He was outstanding in his field!',
      'What do you call a bear with no teeth? A gummy bear!',
      'Why don\'t scientists trust atoms? Because they make up everything!',
      'What did the ocean say to the beach? Nothing, it just waved!',
      'Why did the bicycle fall over? It was two tired!'
    ],
    programming: [
      'Why do programmers prefer dark mode? Because light attracts bugs!',
      'How many programmers does it take to change a light bulb? None, that\'s a hardware problem!',
      'Why do Java developers wear glasses? Because they don\'t C#!',
      'What\'s a programmer\'s favorite hangout place? Foo Bar!',
      'Why did the programmer quit his job? Because he didn\'t get arrays!'
    ],
    dad: [
      'What do you call a fake noodle? An impasta!',
      'I used to hate facial hair, but then it grew on me.',
      'Why can\'t you hear a pterodactyl go to the bathroom? Because the P is silent!',
      'What time did the man go to the dentist? Tooth hurty!',
      'I\'m reading a book about anti-gravity. It\'s impossible to put down!'
    ]
  };

  const jokeList = jokes[category] || jokes.general;
  const randomJoke = jokeList[Math.floor(Math.random() * jokeList.length)];

  return {
    joke: randomJoke,
    category
  };
}

/**
 * Tool: Get weather (simulated)
 */
async function getWeather(location: string) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Generate random weather data
  const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy', 'Stormy'];
  const temperature = Math.floor(Math.random() * 40) + 50; // 50-90°F
  const condition = conditions[Math.floor(Math.random() * conditions.length)];

  return {
    location,
    temperature,
    condition,
    humidity: Math.floor(Math.random() * 40) + 40,
    windSpeed: Math.floor(Math.random() * 20) + 5,
    note: 'This is simulated weather data for demonstration purposes'
  };
}
