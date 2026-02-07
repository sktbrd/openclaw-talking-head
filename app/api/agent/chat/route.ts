import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { getServerTools, executeTools } from '../tools';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// In-memory conversation store (replace with database or KV store in production)
const conversations = new Map<string, any[]>();

interface ChatRequest {
  message: string;
  conversationId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, conversationId } = body;

    if (!message) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }

    // Generate or retrieve conversation ID
    const convId = conversationId || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get conversation history
    const history = conversations.get(convId) || [];

    // Build messages array
    const messages = [
      {
        role: 'system' as const,
        content: `You are a friendly AI assistant embodied in a 3D avatar. Keep your responses concise and conversational - aim for 1-3 short sentences (under 50 words total). Be warm, helpful, and natural in your speech. When using tools, briefly acknowledge the action and provide the information clearly.`
      },
      ...history,
      {
        role: 'user' as const,
        content: message
      }
    ];

    console.log('[Chat] Processing message:', message);

    // Call OpenAI with tools
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
      messages,
      tools: getServerTools(),
      tool_choice: 'auto' as const,
    });

    const assistantMessage = response.choices[0].message;

    // Handle tool calls if present
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log('[Chat] Tool calls detected:', assistantMessage.tool_calls.map(tc => tc.function.name));

      // Execute tools
      const toolResults = await executeTools(assistantMessage.tool_calls.map(tc => ({
        id: tc.id,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments
        }
      })));

      console.log('[Chat] Tool results:', toolResults);

      // Add assistant message with tool calls to history
      messages.push({
        role: 'assistant' as const,
        content: assistantMessage.content || '',
        tool_calls: assistantMessage.tool_calls
      } as any);

      // Add tool results to messages
      for (const toolResult of toolResults) {
        messages.push({
          role: 'tool' as const,
          content: JSON.stringify(toolResult.result),
          tool_call_id: toolResult.id
        } as any);
      }

      // Get final response from OpenAI with tool results
      const finalResponse = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
        messages,
      });

      const finalMessage = finalResponse.choices[0].message.content || '';

      // Update conversation history
      const updatedHistory = [
        ...history,
        { role: 'user', content: message },
        { role: 'assistant', content: finalMessage }
      ];

      // Keep only last 10 exchanges (20 messages)
      if (updatedHistory.length > 20) {
        updatedHistory.splice(0, updatedHistory.length - 20);
      }

      conversations.set(convId, updatedHistory);

      return Response.json({
        text: finalMessage,
        conversationId: convId,
        toolCalls: toolResults,
        usage: finalResponse.usage
      });
    }

    // No tool calls - direct response
    const responseText = assistantMessage.content || '';

    // Update conversation history
    const updatedHistory = [
      ...history,
      { role: 'user', content: message },
      { role: 'assistant', content: responseText }
    ];

    // Keep only last 10 exchanges (20 messages)
    if (updatedHistory.length > 20) {
      updatedHistory.splice(0, updatedHistory.length - 20);
    }

    conversations.set(convId, updatedHistory);

    return Response.json({
      text: responseText,
      conversationId: convId,
      usage: response.usage
    });

  } catch (error: any) {
    console.error('[Chat] API error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Optional: Add a GET endpoint to retrieve conversation history
export async function GET(request: NextRequest) {
  const conversationId = request.nextUrl.searchParams.get('conversationId');

  if (!conversationId) {
    return Response.json({ error: 'Conversation ID is required' }, { status: 400 });
  }

  const history = conversations.get(conversationId) || [];

  return Response.json({
    conversationId,
    history,
    messageCount: history.length
  });
}
