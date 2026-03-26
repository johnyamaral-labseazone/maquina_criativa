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
