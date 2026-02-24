import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

/**
 * Creates an ephemeral token for client-side OpenAI Realtime API connection.
 * The client connects directly to OpenAI's Realtime WebSocket using this token.
 */
export async function POST(request: NextRequest) {
  try {
    const { model, voice, instructions } = await request.json();

    // Create ephemeral session token via OpenAI REST API
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-realtime-preview',
        voice: voice || 'alloy',
        instructions: instructions || 'You are a friendly AI assistant. Keep responses concise and conversational.',
        input_audio_transcription: {
          model: 'whisper-1',
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Realtime] Session creation failed:', error);
      return Response.json({ error: 'Failed to create realtime session' }, { status: response.status });
    }

    const session = await response.json();

    return Response.json({
      token: session.client_secret?.value,
      sessionId: session.id,
      model: session.model,
      voice: session.voice,
    });
  } catch (error: any) {
    console.error('[Realtime] API error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
