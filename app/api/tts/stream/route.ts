import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

/**
 * TTS fallback using OpenAI TTS API (for non-realtime mode).
 * Streams audio chunks via SSE.
 */
export async function POST(request: NextRequest) {
  try {
    const { text, voice } = await request.json();

    if (!text) {
      return Response.json({ error: 'Text is required' }, { status: 400 });
    }

    console.log('[TTS] Processing text:', text.substring(0, 50) + '...');

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice || 'alloy',
        response_format: 'mp3',
        speed: 1.0,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TTS] OpenAI error:', errorText);
      return Response.json(
        { error: `OpenAI TTS error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const encoder = new TextEncoder();
    const reader = response.body?.getReader();

    if (!reader) {
      return Response.json({ error: 'No response body' }, { status: 500 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let chunkCount = 0;
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
              break;
            }
            const base64Audio = Buffer.from(value).toString('base64');
            const eventData = `data: ${JSON.stringify({ audio: base64Audio })}\n\n`;
            controller.enqueue(encoder.encode(eventData));
            chunkCount++;
          }
        } catch (error) {
          console.error('[TTS] Stream error:', error);
          controller.error(error);
        }
      },
      cancel() {
        reader.cancel();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('[TTS] API error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
