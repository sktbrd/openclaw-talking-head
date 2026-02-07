# Talking Head - Voice Conversation System

A Next.js application featuring a 3D animated talking head with full-duplex voice conversation powered by OpenAI and ElevenLabs.

![Talking Head Preview](./docs/preview.png)

## Features

- **Real-Time Voice Conversation**: Full-duplex audio system with barge-in support
- **AI-Powered Responses**: OpenAI GPT-4 Turbo for intelligent conversation
- **Natural Voice Synthesis**: ElevenLabs streaming TTS for realistic speech
- **Real-Time Lip Sync**: Audio frequency analysis driving 3D morph targets
- **State-Driven Expressions**: Facial expressions adapt to conversation state
- **Tool Calling System**: Extensible demo tools (time, jokes, weather)
- **3D Character Animation**: Three.js-powered 3D head with morph target animations

## Voice System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js on Vercel                        │
├─────────────────────────────────────────────────────────────┤
│  Client (Browser)                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ TalkingHead Component                                 │  │
│  │  - Three.js 3D model rendering                        │  │
│  │  - Viseme mapping from audio analysis                 │  │
│  │  - Morph target animation                             │  │
│  └──────────────────────────────────────────────────────┘  │
│         ↕                                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ VoiceCoordinator (Client Services)                    │  │
│  │  - BrowserSTT (Web Speech API)                        │  │
│  │  - ConversationStateMachine                           │  │
│  │  - BargeInDetector                                    │  │
│  │  - Audio playback & analysis                          │  │
│  └──────────────────────────────────────────────────────┘  │
│         ↕ (fetch + SSE)                                      │
├─────────────────────────────────────────────────────────────┤
│  Next.js API Routes (Server-Side)                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ /api/agent/chat                                       │  │
│  │  - OpenAI streaming responses                         │  │
│  │  - Tool calling coordination                          │  │
│  │  - Conversation history management                    │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ /api/tts/stream                                       │  │
│  │  - ElevenLabs WebSocket proxy                         │  │
│  │  - SSE audio streaming to client                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         ↕                              ↕
   OpenAI API                   ElevenLabs WebSocket
```

## Setup

### 1. Get API Keys

**OpenAI**:
- Visit: https://platform.openai.com/api-keys
- Create a new API key
- Copy the key (starts with `sk-`)

**ElevenLabs**:
- Visit: https://elevenlabs.io
- Sign up and go to your profile
- Copy your API key
- (Optional) Copy a Voice ID from the Voice Library

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
# OpenAI Configuration (Required)
OPENAI_API_KEY=sk-your-openai-key-here
OPENAI_MODEL=gpt-4-turbo

# ElevenLabs Configuration (Required)
ELEVENLABS_API_KEY=your-elevenlabs-key-here
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
ELEVENLABS_MODEL=eleven_turbo_v2_5

# Optional Settings
NEXT_PUBLIC_DEBUG_MODE=false
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the talking head.

## Usage

1. **Start Conversation**: Click the "Start Conversation" button
2. **Allow Microphone**: Grant microphone permission when prompted
3. **Speak Naturally**: Just talk - the AI will respond automatically
4. **Interrupt Anytime**: You can interrupt the AI while it's speaking (barge-in)
5. **Stop Conversation**: Click "Stop Conversation" when done

## Available Commands

Try asking the AI to:

- **Tell you the time**: "What time is it?" or "What's the date?"
- **Tell a joke**: "Tell me a joke" or "Tell me a programming joke"
- **Get weather**: "What's the weather in San Francisco?"

## System Components

### Client-Side Services

- **VoiceCoordinator** (`/lib/voice/VoiceCoordinator.ts`): Main orchestrator
- **BrowserSTT** (`/lib/voice/browser-stt.ts`): Speech-to-text using Web Speech API
- **ConversationStateMachine** (`/lib/voice/conversation-state.ts`): State management
- **BargeInDetector** (`/lib/voice/barge-in-detector.ts`): Interrupt detection
- **LipSyncEngine** (`/lib/audio/lipSyncEngine.ts`): Audio-to-viseme mapping

### API Routes

- **`/api/agent/chat`**: OpenAI conversation endpoint
- **`/api/tts/stream`**: ElevenLabs TTS streaming endpoint
- **`/api/agent/tools.ts`**: Server-side tool implementations

### React Components

- **TalkingHead** (`/components/TalkingHead/index.tsx`): 3D character rendering
- **VoiceControls** (`/components/VoiceControls.tsx`): UI controls
- **useVoice** (`/hooks/useVoice.ts`): React hook for voice system

## Conversation States

The system has 5 states:

- **IDLE**: Not active
- **LISTENING**: Waiting for user input
- **THINKING**: Processing user request
- **SPEAKING**: AI is responding
- **BARGE_IN**: User interrupted AI

Facial expressions automatically adapt to each state.

## Adding Custom Tools

Edit `/app/api/agent/tools.ts` to add new tools:

```typescript
{
  type: 'function',
  function: {
    name: 'my_custom_tool',
    description: 'Description for AI to know when to use this tool',
    parameters: {
      type: 'object',
      properties: {
        param1: {
          type: 'string',
          description: 'Parameter description'
        }
      },
      required: ['param1']
    }
  }
}
```

Then add the implementation in the `executeTools` function.

## 3D Model Support

The system supports 3D models with ARKit blend shapes (morph targets):

- **Required**: jawOpen, mouthOpen, mouthClose morph targets
- **Recommended**: Full ARKit 52 blend shapes for best quality
- **Format**: GLTF/GLB with morph targets

Current models available:
- Facecap (default)
- Bald, Beard, Orc, Slim, Soldier, Woman

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import repository in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

```bash
# Or use Vercel CLI
vercel --prod
```

### Environment Variables in Vercel

Add these in your Vercel project settings:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`
- `ELEVENLABS_MODEL`

## Troubleshooting

### No voice output
- Check browser console for errors
- Verify ElevenLabs API key in `.env.local`
- Check network tab for SSE stream connection

### Microphone not working
- Grant microphone permission in browser
- Check browser console for STT errors
- Verify HTTPS connection (required for Web Speech API)

### AI not responding
- Verify OpenAI API key
- Check browser network tab for API errors
- Look at server logs (`npm run dev` output)

### Lip sync not working
- Verify 3D model has morph targets
- Check browser console for "morph target" messages
- Ensure audio is playing (check volume)

## Performance

**Target Metrics:**
- TTS latency: < 500ms to first audio chunk
- Lip sync latency: < 50ms
- Frame rate: 60 FPS
- No audio stuttering

**Optimization Tips:**
- Use `gpt-3.5-turbo` for faster responses (lower quality)
- Reduce morph target smoothing factor for snappier animations
- Enable debug mode to monitor performance

## Security

- ✅ All API keys are server-side only (never exposed to client)
- ✅ Server-Sent Events (SSE) for audio streaming (no WebSocket needed)
- ✅ No client-side API key storage
- ✅ Environment variables properly configured

## Tech Stack

- **Next.js 14**: React framework with App Router
- **Three.js**: 3D rendering and animation
- **OpenAI API**: GPT-4 Turbo for conversation
- **ElevenLabs API**: Text-to-speech streaming
- **Web Speech API**: Browser native speech recognition
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Credits

- OpenAI for GPT-4 Turbo
- ElevenLabs for voice synthesis
- Three.js community for 3D rendering tools

## Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/yourusername/talking-head-v2/issues)
- Documentation: See `/docs` folder

---

Built with ❤️ using Claude Code
