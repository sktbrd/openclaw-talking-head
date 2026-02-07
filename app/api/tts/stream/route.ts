import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return Response.json({ error: 'Text is required' }, { status: 400 });
    }

    console.log('[TTS] Processing text:', text.substring(0, 50) + '...');

    // Call ElevenLabs streaming API
    const elevenLabsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}/stream`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
        },
        body: JSON.stringify({
          text,
          model_id: process.env.ELEVENLABS_MODEL || 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!elevenLabsResponse.ok) {
      const errorText = await elevenLabsResponse.text();
      console.error('[TTS] ElevenLabs error:', errorText);
      return Response.json(
        { error: `ElevenLabs API error: ${elevenLabsResponse.statusText}` },
        { status: elevenLabsResponse.status }
      );
    }

    const encoder = new TextEncoder();
    const reader = elevenLabsResponse.body?.getReader();

    if (!reader) {
      return Response.json({ error: 'No response body' }, { status: 500 });
    }

    // Create SSE stream from audio chunks
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let chunkCount = 0;

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              console.log(`[TTS] Streaming complete. Sent ${chunkCount} chunks`);
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
              break;
            }

            // Convert audio chunk to base64
            const base64Audio = Buffer.from(value).toString('base64');

            // Send as SSE event
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
        console.log('[TTS] Stream cancelled by client');
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
