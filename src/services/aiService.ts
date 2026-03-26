export interface AnalysisResult {
  prompt: string
  description: string
  mood: string
}

export interface AiStatus {
  vision: boolean
  generation: boolean
  video: boolean
  ready: boolean
  fal?: boolean
  freepik?: boolean
  elevenlabs?: boolean
}

export interface TtsResult {
  audioUrl: string   // served via /temp/videos/xxx.mp3
  filename: string
  generator: string
}

export interface ElevenLabsVoice {
  voice_id: string
  name: string
  labels: Record<string, string>
}

export interface VideoResult {
  videoUrl: string   // served via /temp/videos/xxx.mp4
  filename: string
}

export async function checkAiStatus(): Promise<AiStatus> {
  try {
    const res = await fetch('/api/ai/status')
    if (!res.ok) return { vision: false, generation: false, video: false, ready: false }
    return res.json()
  } catch {
    return { vision: false, generation: false, video: false, ready: false }
  }
}

// Generate video with Veo 3 (Google AI Studio)
// aspectRatio: '9:16' | '4:5' | '1:1' — durationSeconds: 5-8
export async function generateVideo(
  prompt: string,
  aspectRatio: string,
  durationSeconds = 5,
): Promise<VideoResult> {
  const res = await fetch('/api/ai/generate-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, aspectRatio, durationSeconds }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
    throw new Error(err.error ?? 'Erro ao gerar vídeo')
  }
  return res.json()
}

export async function analyzeReference(
  imageBase64: string,
  context?: string,
): Promise<AnalysisResult> {
  const res = await fetch('/api/ai/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, context }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
    throw new Error(err.error ?? 'Erro ao analisar imagem')
  }
  return res.json()
}

export async function generateBackground(prompt: string, aspectRatio: string): Promise<string> {
  const res = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, aspectRatio }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
    throw new Error(err.error ?? 'Erro ao gerar imagem')
  }
  const data = await res.json()
  return data.imageDataUrl as string
}

// Generate image with Imagen 3 (Google AI Studio) — aspectRatio: '1:1'|'9:16'|'4:5'|'3:4'
export async function generateImageImagen(prompt: string, aspectRatio: string): Promise<string> {
  const res = await fetch('/api/ai/generate-imagen', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, aspectRatio }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
    throw new Error(err.error ?? 'Erro ao gerar imagem com Imagen 3')
  }
  const data = await res.json()
  return data.imageDataUrl as string
}

export async function generateFromReference(
  referenceImage: string,
  aspectRatio: string,
  context?: string,
): Promise<{ imageDataUrl: string; analysis: AnalysisResult }> {
  const analysis = await analyzeReference(referenceImage, context)
  const imageDataUrl = await generateBackground(analysis.prompt, aspectRatio)
  return { imageDataUrl, analysis }
}

// ── ElevenLabs TTS ────────────────────────────────────────────────────────────

// Generate speech from text using ElevenLabs
// voiceId: use listTtsVoices() to get available voices
// modelId: 'eleven_multilingual_v2' (default, supports PT-BR) | 'eleven_turbo_v2_5' (faster)
export async function generateTts(
  text: string,
  voiceId?: string,
  modelId?: string,
): Promise<TtsResult> {
  const res = await fetch('/api/ai/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voiceId, modelId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
    throw new Error(err.error ?? 'Erro ao gerar locução')
  }
  return res.json()
}

// List available ElevenLabs voices
export async function listTtsVoices(): Promise<ElevenLabsVoice[]> {
  const res = await fetch('/api/ai/tts/voices')
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
    throw new Error(err.error ?? 'Erro ao listar vozes')
  }
  const data = await res.json()
  return data.voices as ElevenLabsVoice[]
}

// ── FAL.AI dedicated endpoints ────────────────────────────────────────────────

// Generate image with FAL.AI FLUX
// model: 'fal-ai/flux/schnell' | 'fal-ai/flux/dev' | 'fal-ai/flux-pro'
export async function generateImageFal(
  prompt: string,
  aspectRatio: string,
  model: string = 'fal-ai/flux/schnell',
): Promise<string> {
  const res = await fetch('/api/ai/generate-fal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, aspectRatio, model }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
    throw new Error(err.error ?? 'Erro ao gerar imagem com FAL.AI')
  }
  const data = await res.json()
  return data.imageDataUrl as string
}

// Generate video with FAL.AI Kling
// tipo: 'narrado' | 'apresentadora'
// model: 'fal-ai/kling-video/v2.1/standard/text-to-video' | 'fal-ai/kling-video/v1.6/standard/text-to-video'
export async function generateVideoFal(
  prompt: string,
  durationSeconds = 5,
  tipo: string = 'narrado',
  presenterImage?: string,
  model?: string,
): Promise<VideoResult> {
  const res = await fetch('/api/ai/generate-video-fal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, durationSeconds, tipo, presenterImage, model }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
    throw new Error(err.error ?? 'Erro ao gerar vídeo com FAL.AI')
  }
  return res.json()
}
