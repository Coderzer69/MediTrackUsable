// ElevenLabs REST API: Scribe speech-to-text and text-to-speech.
//
// Env vars:
//   ELEVENLABS_API_KEY     required for both features
//   ELEVENLABS_STT_MODEL   default "scribe_v2_medical" (tuned for clinical audio)
//   ELEVENLABS_TTS_MODEL   default "eleven_v4" (covers all patient languages)
//   ELEVENLABS_VOICE_ID    default "JBFqnCBsd6RMkjVDRZzb" (premade multilingual voice)
//
// Never log audio, transcripts or generated text: they contain medical information.

const API = 'https://api.elevenlabs.io/v1';

export const isElevenLabsConfigured = () => !!process.env.ELEVENLABS_API_KEY;

export class ElevenLabsError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

const apiKey = () => {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new ElevenLabsError('ELEVENLABS_API_KEY is not set');
  return key;
};

const failure = async (res: Response, what: string) => {
  // ElevenLabs error bodies describe the problem (quota, auth), not our content.
  const body = (await res.text().catch(() => '')).slice(0, 300);
  return new ElevenLabsError(`ElevenLabs ${what} failed (${res.status}): ${body}`, res.status);
};

export type Transcript = { text: string; languageCode: string | null; languageProbability: number | null };

// Transcribes a recording. The language is detected automatically, so doctors can
// speak English, Hindi, Tamil, or mix languages.
export const speechToText = async (audio: Buffer, mimeType: string): Promise<Transcript> => {
  const form = new FormData();
  const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : mimeType.includes('wav') ? 'wav' : mimeType.includes('mpeg') ? 'mp3' : 'webm';
  form.append('file', new Blob([new Uint8Array(audio)], { type: mimeType }), `consultation.${ext}`);
  form.append('model_id', process.env.ELEVENLABS_STT_MODEL || 'scribe_v2_medical');
  form.append('tag_audio_events', 'false');

  const res = await fetch(`${API}/speech-to-text`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey() },
    body: form,
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw await failure(res, 'speech-to-text');
  const data = (await res.json()) as { text?: string; language_code?: string; language_probability?: number };
  return {
    text: (data.text || '').trim(),
    languageCode: data.language_code || null,
    languageProbability: typeof data.language_probability === 'number' ? data.language_probability : null,
  };
};

// Speaks the given text and returns MP3 bytes.
export const textToSpeech = async (text: string): Promise<Buffer> => {
  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';
  const res = await fetch(`${API}/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_64`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey(), 'content-type': 'application/json', accept: 'audio/mpeg' },
    body: JSON.stringify({
      text,
      model_id: process.env.ELEVENLABS_TTS_MODEL || 'eleven_v4',
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw await failure(res, 'text-to-speech');
  return Buffer.from(await res.arrayBuffer());
};
