'use client';

import dynamic from 'next/dynamic';
import { useVoice } from '@/hooks/useVoice';
import VoiceControls from '@/components/VoiceControls';

const TalkingHead = dynamic(() => import('@/components/TalkingHead'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="text-white text-xl">Loading Talking Head...</div>
    </div>
  ),
});

export default function Home() {
  const voice = useVoice();

  return (
    <main className="relative w-full h-screen bg-gray-900">
      <TalkingHead
        conversationState={voice.state}
        lipSyncEngine={voice.lipSyncEngine}
      />

      <VoiceControls
        isActive={voice.isActive}
        state={voice.state}
        transcript={voice.transcript}
        response={voice.response}
        error={voice.error}
        onStart={voice.start}
        onStop={voice.stop}
      />
    </main>
  );
}
