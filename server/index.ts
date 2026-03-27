import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'
import Replicate from 'replicate'
import { GoogleGenAI } from '@google/genai'
import { fal } from '@fal-ai/client'
import * as dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
// Puppeteer is lazy-imported only when needed (keeps server startup fast)

// ESM-safe __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

dotenv.config()

// ── Temp dir for generated videos ────────────────────────────────────────────
// On Vercel/serverless use /tmp (writable), locally use temp/videos
const TEMP_VIDEO_DIR = (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
  ? '/tmp/videos'
  : path.join(process.cwd(), 'temp', 'videos')
fs.mkdirSync(TEMP_VIDEO_DIR, { recursive: true })

// ── Validate API keys (strip whitespace, check for non-ASCII) ────────────────
function sanitizeKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  const key = raw.trim()
  for (let i = 0; i < key.length; i++) {
    if (key.charCodeAt(i) > 127) {
      console.warn(`⚠️  Chave contém caractere inválido na posição ${i} (valor ${key.charCodeAt(i)}) — será ignorada`)
      return undefined
    }
  }
  return key || undefined
}

const ANTHROPIC_KEY    = sanitizeKey(process.env.ANTHROPIC_API_KEY)
const REPLICATE_KEY    = sanitizeKey(process.env.REPLICATE_API_TOKEN)
const GOOGLE_KEY       = sanitizeKey(process.env.GOOGLE_API_KEY)
const FREEPIK_KEY      = sanitizeKey(process.env.FREEPIK_API_KEY)
const FAL_KEY          = sanitizeKey(process.env.FAL_KEY)
const ELEVENLABS_KEY   = sanitizeKey(process.env.ELEVENLABS_API_KEY)

const anthropic  = ANTHROPIC_KEY ? new Anthropic({ apiKey: ANTHROPIC_KEY })  : null
const replicate  = REPLICATE_KEY ? new Replicate({ auth: REPLICATE_KEY })    : null
const googleAI   = GOOGLE_KEY    ? new GoogleGenAI({ apiKey: GOOGLE_KEY })   : null

// Configure FAL.AI client
if (FAL_KEY) {
  fal.config({ credentials: FAL_KEY })
  console.log('✅ FAL.AI configurado')
}

// ── Freepik helpers ───────────────────────────────────────────────────────────
const FREEPIK_BASE = 'https://api.freepik.com/v1'

async function freepikHeaders() {
  return { 'x-freepik-api-key': FREEPIK_KEY!, 'Content-Type': 'application/json', 'Accept': 'application/json' }
}

// Freepik aspect_ratio param format — exact values from Freepik docs
function freepikAspectRatio(formato: string): string {
  const map: Record<string, string> = {
    '1:1':  'square_1_1',
    '4:5':  'social_post_4_5',   // was wrong: social_story_4_5
    '9:16': 'social_story_9_16',
    '16:9': 'widescreen_16_9',
  }
  return map[formato] ?? 'square_1_1'
}

// Generate image with Freepik Mystic (primary) — returns base64 data URL
// Actual response: { data: { task_id, status, generated: [urlString, ...] } }
async function generateWithMystic(prompt: string, formato: string): Promise<string> {
  if (!FREEPIK_KEY) throw new Error('FREEPIK_API_KEY não configurada')

  const r = await fetch(`${FREEPIK_BASE}/ai/mystic`, {
    method: 'POST',
    headers: await freepikHeaders(),
    body: JSON.stringify({
      prompt,
      resolution: '1k',                       // faster than 2k for bulk gen
      aspect_ratio: freepikAspectRatio(formato),
      model: 'realism',
      creative_detailing: 65,
      num_images: 1,
    }),
    signal: AbortSignal.timeout(15000),
  })

  const json = await r.json() as { data?: { task_id?: string; status?: string; generated?: unknown[] } }
  if (!r.ok) throw new Error(`Freepik Mystic ${r.status}: ${JSON.stringify(json)}`)

  const taskId = json.data?.task_id
  if (!taskId) throw new Error(`Mystic sem task_id: ${JSON.stringify(json)}`)

  return await pollMysticTask(taskId)
}

async function pollMysticTask(taskId: string, maxAttempts = 18): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 3000))           // 3s between polls → max ~54s
    const r = await fetch(`${FREEPIK_BASE}/ai/mystic/${taskId}`, {
      headers: await freepikHeaders(),
      signal: AbortSignal.timeout(10000),
    })
    const json = await r.json() as { data?: { status?: string; generated?: unknown[] } }
    const status    = json.data?.status ?? ''
    const generated = json.data?.generated ?? []

    if (generated.length > 0) {
      // generated[0] is a URL string
      const imgUrl = typeof generated[0] === 'string' ? generated[0] : (generated[0] as { url?: string })?.url
      if (imgUrl) {
        const imgRes = await fetch(imgUrl, { signal: AbortSignal.timeout(20000) })
        const buf    = await imgRes.arrayBuffer()
        return `data:image/jpeg;base64,${Buffer.from(buf).toString('base64')}`
      }
    }
    if (status === 'FAILED' || status === 'failed') throw new Error('Mystic task falhou')
  }
  throw new Error('Mystic polling timeout após ~96s')
}

// Generate video with Freepik Kling 3 (text-to-video)
async function generateWithKling(prompt: string, durationSeconds: number): Promise<string> {
  if (!FREEPIK_KEY) throw new Error('FREEPIK_API_KEY não configurada')

  const body = {
    prompt,
    duration: durationSeconds <= 5 ? 5 : durationSeconds <= 10 ? 10 : 15,
    aspect_ratio: '9:16',
    negative_prompt: 'people, text, watermarks, low quality',
  }

  const r = await fetch(`${FREEPIK_BASE}/ai/video/kling-v3-omni`, {
    method: 'POST',
    headers: await freepikHeaders(),
    body: JSON.stringify(body),
  })

  const data = await r.json() as { task_id?: string; data?: { url?: string }; error?: string }
  if (!r.ok) throw new Error(`Freepik Kling error ${r.status}: ${JSON.stringify(data)}`)

  const taskId = data.task_id
  if (!taskId) throw new Error('Kling não retornou task_id')

  // Poll for completion
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 5000))
    const poll = await fetch(`${FREEPIK_BASE}/ai/video/kling-v3-omni/${taskId}`, {
      headers: await freepikHeaders(),
    })
    const pd = await poll.json() as { status?: string; data?: { url?: string }; error?: string }
    if (pd.status === 'completed' && pd.data?.url) return pd.data.url
    if (pd.status === 'failed') throw new Error(`Kling falhou: ${pd.error ?? 'desconhecido'}`)
  }
  throw new Error('Kling polling timeout')
}

// Generate video with Freepik Veo 2 (text-to-video)
async function generateWithFreepikVeo2(prompt: string, durationSeconds: number, aspectRatio = '9:16'): Promise<string> {
  if (!FREEPIK_KEY) throw new Error('FREEPIK_API_KEY não configurada')

  const body = {
    prompt,
    duration: Math.min(Math.max(durationSeconds, 5), 8),
    aspect_ratio: aspectRatio,
    negative_prompt: 'people, text, watermarks, low quality, blurry',
  }

  const r = await fetch(`${FREEPIK_BASE}/ai/video/veo2`, {
    method: 'POST',
    headers: await freepikHeaders(),
    body: JSON.stringify(body),
  })

  const data = await r.json() as { task_id?: string; data?: { url?: string }; error?: string }
  if (!r.ok) throw new Error(`Freepik Veo2 error ${r.status}: ${JSON.stringify(data)}`)

  const taskId = data.task_id
  if (!taskId) throw new Error('Freepik Veo2 não retornou task_id')

  for (let i = 0; i < 72; i++) {
    await new Promise((res) => setTimeout(res, 5000))
    const poll = await fetch(`${FREEPIK_BASE}/ai/video/veo2/${taskId}`, {
      headers: await freepikHeaders(),
    })
    const pd = await poll.json() as { status?: string; data?: { url?: string }; error?: string }
    if (pd.status === 'completed' && pd.data?.url) return pd.data.url
    if (pd.status === 'failed') throw new Error(`Freepik Veo2 falhou: ${pd.error ?? 'desconhecido'}`)
  }
  throw new Error('Freepik Veo2 polling timeout')
}

// Generate presenter video with Freepik Kling image-to-video
// Uses the presenter's reference photo + a script prompt
async function generateWithKlingImg2Vid(prompt: string, imageDataUrl: string, durationSeconds: number): Promise<string> {
  if (!FREEPIK_KEY) throw new Error('FREEPIK_API_KEY não configurada')

  // Strip data URL prefix for API
  const base64 = imageDataUrl.replace(/^data:image\/[a-z+]+;base64,/, '')
  const mimeType = imageDataUrl.match(/^data:(image\/[a-z+]+);base64,/)?.[1] ?? 'image/jpeg'

  const body = {
    image: { data: base64, media_type: mimeType },
    prompt: `${prompt}, professional presenter speaking confidently to camera, Seazone real estate brand, natural lighting, coastal backdrop, cinematic quality`,
    duration: durationSeconds <= 5 ? 5 : 10,
    aspect_ratio: '9:16',
    negative_prompt: 'bad quality, blurry, distorted face, watermarks, text overlays',
  }

  const r = await fetch(`${FREEPIK_BASE}/ai/video/kling-v3-omni/img2vid`, {
    method: 'POST',
    headers: await freepikHeaders(),
    body: JSON.stringify(body),
  })

  const data = await r.json() as { task_id?: string; data?: { url?: string }; error?: string }
  if (!r.ok) throw new Error(`Kling img2vid error ${r.status}: ${JSON.stringify(data)}`)

  const taskId = data.task_id
  if (!taskId) throw new Error('Kling img2vid não retornou task_id')

  // Poll for completion (same endpoint as text-to-video)
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 5000))
    const poll = await fetch(`${FREEPIK_BASE}/ai/video/kling-v3-omni/${taskId}`, {
      headers: await freepikHeaders(),
    })
    const pd = await poll.json() as { status?: string; data?: { url?: string }; error?: string }
    if (pd.status === 'completed' && pd.data?.url) return pd.data.url
    if (pd.status === 'failed') throw new Error(`Kling img2vid falhou: ${pd.error ?? 'desconhecido'}`)
  }
  throw new Error('Kling img2vid polling timeout')
}

// ── FAL.AI helpers ────────────────────────────────────────────────────────────

// Map aspect ratios to FAL.AI image_size parameter
function falImageSize(formato: string): string | { width: number; height: number } {
  const map: Record<string, string | { width: number; height: number }> = {
    '1:1':  'square_hd',
    '4:5':  { width: 864, height: 1080 },
    '9:16': { width: 576, height: 1024 },
    '16:9': 'landscape_16_9',
    '3:4':  'portrait_4_3',
  }
  return map[formato] ?? 'square_hd'
}

// Generate image with FAL.AI FLUX — returns base64 data URL
// model: 'fal-ai/flux/schnell' | 'fal-ai/flux/dev' | 'fal-ai/flux-pro'
async function generateWithFalFlux(
  prompt: string,
  formato: string,
  model: string = 'fal-ai/flux/schnell',
): Promise<string> {
  if (!FAL_KEY) throw new Error('FAL_KEY não configurada')

  const result = await fal.subscribe(model, {
    input: {
      prompt,
      image_size: falImageSize(formato),
      num_images: 1,
      output_format: 'jpeg',
      num_inference_steps: model.includes('schnell') ? 4 : 28,
    },
  }) as { data: { images: Array<{ url: string }> } }

  const imageUrl = result.data?.images?.[0]?.url
  if (!imageUrl) throw new Error('FAL.AI FLUX não retornou imagem')

  const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(30000) })
  const buf = await imgRes.arrayBuffer()
  return `data:image/jpeg;base64,${Buffer.from(buf).toString('base64')}`
}

// Generate text-to-video with FAL.AI Kling — returns video URL saved locally
// model: 'fal-ai/kling-video/v2.1/standard/text-to-video' | 'fal-ai/kling-video/v1.6/standard/text-to-video'
async function generateWithFalKling(
  prompt: string,
  durationSeconds: number,
  model: string = 'fal-ai/kling-video/v2.1/standard/text-to-video',
): Promise<string> {
  if (!FAL_KEY) throw new Error('FAL_KEY não configurada')

  const duration = durationSeconds <= 5 ? '5' : '10'

  const result = await fal.subscribe(model, {
    input: {
      prompt,
      duration,
      aspect_ratio: '9:16',
      negative_prompt: 'people, text, watermarks, low quality, blurry',
    },
  }) as { data: { video: { url: string } } }

  const videoUrl = result.data?.video?.url
  if (!videoUrl) throw new Error('FAL.AI Kling não retornou vídeo')

  // Download and save video locally
  const dlRes = await fetch(videoUrl, { signal: AbortSignal.timeout(60000) })
  if (!dlRes.ok) throw new Error(`Falha ao baixar vídeo FAL.AI: ${dlRes.status}`)

  const buffer   = await dlRes.arrayBuffer()
  const filename = `fal_kling_${Date.now()}.mp4`
  const filepath = path.join(TEMP_VIDEO_DIR, filename)
  fs.writeFileSync(filepath, Buffer.from(buffer))

  return `/temp/videos/${filename}`
}

// Generate image-to-video with FAL.AI Kling — presenter video
async function generateWithFalKlingImg2Vid(
  prompt: string,
  imageDataUrl: string,
  durationSeconds: number,
): Promise<string> {
  if (!FAL_KEY) throw new Error('FAL_KEY não configurada')

  const duration = durationSeconds <= 5 ? '5' : '10'

  // Upload base64 image to FAL storage to get a URL
  const base64Data = imageDataUrl.replace(/^data:image\/[a-z+]+;base64,/, '')
  const mimeType   = imageDataUrl.match(/^data:(image\/[a-z+]+);base64,/)?.[1] ?? 'image/jpeg'
  const buffer     = Buffer.from(base64Data, 'base64')
  const blob       = new Blob([buffer], { type: mimeType })
  const imageUrl   = await fal.storage.upload(blob as unknown as File)

  const result = await fal.subscribe('fal-ai/kling-video/v2.1/standard/image-to-video', {
    input: {
      prompt: `${prompt}, professional presenter speaking confidently to camera, natural lighting, cinematic quality`,
      image_url: imageUrl,
      duration,
      aspect_ratio: '9:16',
      negative_prompt: 'bad quality, blurry, distorted face, watermarks',
    },
  }) as { data: { video: { url: string } } }

  const videoUrl = result.data?.video?.url
  if (!videoUrl) throw new Error('FAL.AI Kling img2vid não retornou vídeo')

  // Download and save video locally
  const dlRes = await fetch(videoUrl, { signal: AbortSignal.timeout(60000) })
  if (!dlRes.ok) throw new Error(`Falha ao baixar vídeo FAL.AI img2vid: ${dlRes.status}`)

  const buf      = await dlRes.arrayBuffer()
  const filename = `fal_kling_img2vid_${Date.now()}.mp4`
  const filepath = path.join(TEMP_VIDEO_DIR, filename)
  fs.writeFileSync(filepath, Buffer.from(buf))

  return `/temp/videos/${filename}`
}

// ── ElevenLabs helpers ────────────────────────────────────────────────────────
const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1'

// Default voice: "Rachel" (pt-BR friendly, professional female)
// Other options: 'pNInz6obpgDQGcFmaJgB' (Adam), '21m00Tcm4TlvDq8ikWAM' (Rachel)
const ELEVENLABS_DEFAULT_VOICE = '21m00Tcm4TlvDq8ikWAM'

// Generate speech with ElevenLabs — returns audio file saved locally
async function generateWithElevenLabs(
  text: string,
  voiceId: string = ELEVENLABS_DEFAULT_VOICE,
  modelId: string = 'eleven_multilingual_v2',
): Promise<string> {
  if (!ELEVENLABS_KEY) throw new Error('ELEVENLABS_API_KEY não configurada')

  const r = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_KEY,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.3,
        use_speaker_boost: true,
      },
    }),
    signal: AbortSignal.timeout(30000),
  })

  if (!r.ok) {
    const errText = await r.text()
    throw new Error(`ElevenLabs TTS ${r.status}: ${errText}`)
  }

  const buffer   = await r.arrayBuffer()
  const filename = `elevenlabs_${Date.now()}.mp3`
  const filepath = path.join(TEMP_VIDEO_DIR, filename)
  fs.writeFileSync(filepath, Buffer.from(buffer))

  return `/temp/videos/${filename}`
}

// List available ElevenLabs voices
async function listElevenLabsVoices(): Promise<Array<{ voice_id: string; name: string; labels: Record<string, string> }>> {
  if (!ELEVENLABS_KEY) throw new Error('ELEVENLABS_API_KEY não configurada')

  const r = await fetch(`${ELEVENLABS_BASE}/voices`, {
    headers: { 'xi-api-key': ELEVENLABS_KEY },
    signal: AbortSignal.timeout(10000),
  })
  if (!r.ok) throw new Error(`ElevenLabs voices ${r.status}`)
  const data = await r.json() as { voices: Array<{ voice_id: string; name: string; labels: Record<string, string> }> }
  return data.voices ?? []
}

const app = express()
app.use(cors())
app.use(express.json({ limit: '50mb' }))  // increased for presenter image base64

// Serve generated videos
app.use('/temp', express.static(path.join(process.cwd(), 'temp')))

// ── Status ───────────────────────────────────────────────────────────────────
app.get('/api/ai/status', (_req, res) => {
  res.json({
    vision:      !!anthropic || !!googleAI,
    generation:  !!FAL_KEY || !!FREEPIK_KEY || !!replicate || !!googleAI,
    imagen:      !!FAL_KEY || !!FREEPIK_KEY || !!googleAI,
    video:       !!FAL_KEY || !!FREEPIK_KEY || !!googleAI,
    freepik:     !!FREEPIK_KEY,
    fal:         !!FAL_KEY,
    elevenlabs:  !!ELEVENLABS_KEY,
    ready:       !!googleAI || !!FAL_KEY || !!FREEPIK_KEY,
  })
})

// ── ElevenLabs: generate speech (locução) ────────────────────────────────────
app.post('/api/ai/tts', async (req, res) => {
  if (!ELEVENLABS_KEY) {
    res.status(503).json({ error: 'ELEVENLABS_API_KEY não configurada no .env' })
    return
  }
  try {
    const {
      text,
      voiceId = ELEVENLABS_DEFAULT_VOICE,
      modelId = 'eleven_multilingual_v2',
    } = req.body

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({ error: 'Campo "text" é obrigatório' })
      return
    }

    console.log(`[tts] Gerando locução — ${text.slice(0, 60)}...`)
    const audioUrl = await generateWithElevenLabs(text.trim(), voiceId, modelId)
    res.json({ audioUrl, filename: path.basename(audioUrl), generator: 'elevenlabs' })
  } catch (err) {
    console.error('[tts]', err)
    res.status(500).json({ error: String(err) })
  }
})

// ── ElevenLabs: list available voices ────────────────────────────────────────
app.get('/api/ai/tts/voices', async (_req, res) => {
  if (!ELEVENLABS_KEY) {
    res.status(503).json({ error: 'ELEVENLABS_API_KEY não configurada no .env' })
    return
  }
  try {
    const voices = await listElevenLabsVoices()
    res.json({ voices })
  } catch (err) {
    console.error('[tts/voices]', err)
    res.status(500).json({ error: String(err) })
  }
})

// ── Analyze reference image with Claude ──────────────────────────────────────
app.post('/api/ai/analyze', async (req, res) => {
  if (!anthropic) {
    res.status(503).json({ error: 'ANTHROPIC_API_KEY não configurada no .env' })
    return
  }
  try {
    const { imageBase64, context = 'arte para WhatsApp de imóvel' } = req.body

    // Strip data-URL prefix → pure base64
    const base64Data    = (imageBase64 as string).replace(/^data:image\/[a-z+]+;base64,/, '')
    const mediaTypeMatch = (imageBase64 as string).match(/^data:(image\/[a-z+]+);base64,/)
    const mediaType     = (mediaTypeMatch?.[1] ?? 'image/jpeg') as
      'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
          {
            type: 'text',
            text: `Você é especialista em design visual para marketing imobiliário.
Analise esta imagem de referência para uma ${context}.

Retorne APENAS JSON válido (sem markdown):
{
  "prompt": "detailed English prompt 150-200 words: photography style, lighting, architecture, atmosphere, colors, composition — real estate background, no people, no text, no UI",
  "description": "2 frases em português descrevendo o estilo visual",
  "mood": "uma palavra em português para o clima/atmosfera"
}`,
          },
        ],
      }],
    })

    const raw     = message.content[0].type === 'text' ? message.content[0].text : '{}'
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
    res.json(JSON.parse(cleaned))
  } catch (err) {
    console.error('[analyze]', err)
    res.status(500).json({ error: String(err) })
  }
})

// ── Resolve Replicate output → base64 (handles SDK v0.x and v1.x) ────────────
async function replicateOutputToBase64(output: unknown): Promise<string> {
  const item = Array.isArray(output) ? output[0] : output

  // SDK v1.x — FileOutput has arrayBuffer()
  if (item && typeof (item as Record<string, unknown>).arrayBuffer === 'function') {
    const buf = await (item as { arrayBuffer(): Promise<ArrayBuffer> }).arrayBuffer()
    return Buffer.from(buf).toString('base64')
  }

  // SDK v1.x — FileOutput has blob()
  if (item && typeof (item as Record<string, unknown>).blob === 'function') {
    const blob = await (item as { blob(): Promise<Blob> }).blob()
    const buf  = await blob.arrayBuffer()
    return Buffer.from(buf).toString('base64')
  }

  // SDK v1.x — FileOutput has url() method
  if (item && typeof (item as Record<string, unknown>).url === 'function') {
    const urlObj = (item as { url(): URL }).url()
    const r      = await fetch(urlObj.toString())
    const buf    = await r.arrayBuffer()
    return Buffer.from(buf).toString('base64')
  }

  // SDK v0.x / string URL fallback
  const urlStr = String(item)
  if (urlStr.startsWith('http')) {
    const r   = await fetch(urlStr)
    const buf = await r.arrayBuffer()
    return Buffer.from(buf).toString('base64')
  }

  throw new Error(`Formato de saída Replicate desconhecido: ${typeof item}`)
}

// ── Nanobanana (gemini-2.5-flash-image) helper ───────────────────────────────
function aspectRatioHint(ratio: string): string {
  const map: Record<string, string> = {
    '1:1':  'square 1:1 aspect ratio',
    '9:16': 'vertical portrait 9:16 aspect ratio',
    '4:5':  'vertical portrait 4:5 aspect ratio',
    '3:4':  'vertical portrait 3:4 aspect ratio',
    '16:9': 'horizontal landscape 16:9 aspect ratio',
  }
  return map[ratio] ?? 'square 1:1 aspect ratio'
}

async function generateWithNanobanana(prompt: string, aspectRatio: string): Promise<{ base64: string; mimeType: string }> {
  if (!googleAI) throw new Error('GOOGLE_API_KEY não configurada')

  const fullPrompt = `${prompt}, ${aspectRatioHint(aspectRatio)}`

  // Try primary model, fall back to experimental variant
  const models = ['gemini-2.0-flash-exp-image-generation', 'gemini-2.0-flash-thinking-exp']
  let lastErr: unknown
  for (const model of models) {
    try {
      const response = await googleAI.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        config: { responseModalities: ['IMAGE', 'TEXT'] },
      })
      const parts = response.candidates?.[0]?.content?.parts ?? []
      const imagePart = parts.find(
        (p: Record<string, unknown>) => p.inlineData,
      ) as { inlineData: { data: string; mimeType: string } } | undefined
      if (!imagePart?.inlineData?.data) throw new Error('Sem imagem na resposta')
      return { base64: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType ?? 'image/png' }
    } catch (err) {
      console.warn(`[nanobanana] Modelo ${model} falhou:`, String(err).slice(0, 80))
      lastErr = err
    }
  }
  throw lastErr
}

// ── Analyze reference image style with Gemini ──────────────────────────────────
async function analyzeReferenceStyle(imageDataUrl: string): Promise<string> {
  if (!googleAI) return ''
  try {
    const base64Match = imageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/)
    if (!base64Match) return ''
    const [, mimeType, base64Data] = base64Match

    const response = await googleAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: `Analise esta peça publicitária/criativo e descreva o estilo visual em inglês para reprodução por IA generativa de imagem. Foque em:
- Layout e composição (posição dos elementos, hierarquia visual)
- Paleta de cores (cores dominantes, acentos, gradientes)
- Tipografia (estilo, peso, tamanho relativo, cores dos textos)
- Tratamento de imagem de fundo (filtros, overlay, blur, iluminação)
- Elementos gráficos (bordas, ícones, formas, linhas, badges)
- Tom visual geral (luxo, moderno, minimalista, bold, etc.)

Responda APENAS com a descrição de estilo em um parágrafo conciso em inglês, sem explicações extras. Exemplo: "Dark luxury style with navy gradient overlay on aerial property photo, white bold sans-serif headline top-left, gold accent CTA button bottom-center, subtle vignette, minimalist layout with generous whitespace"` },
        ],
      }],
    })
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    console.log(`[style-analysis] ✅ Extracted: "${text.slice(0, 120)}..."`)
    return text.trim()
  } catch (err) {
    console.warn('[style-analysis] Falhou:', String(err).slice(0, 100))
    return ''
  }
}

// ── Generate image with Nanobanana using reference style ────────────────────
async function generateWithNanobananaStyled(
  prompt: string,
  aspectRatio: string,
  referenceDataUrl: string,
  styleDescription: string,
): Promise<{ base64: string; mimeType: string }> {
  if (!googleAI) throw new Error('GOOGLE_API_KEY não configurada')

  const base64Match = referenceDataUrl.match(/^data:(image\/\w+);base64,(.+)$/)
  if (!base64Match) throw new Error('Reference image format invalid')
  const [, refMimeType, refBase64] = base64Match

  const styledPrompt = `Generate an advertisement creative image following this exact visual style: ${styleDescription}.
The image content should be: ${prompt}, ${aspectRatioHint(aspectRatio)}.
IMPORTANT: Reproduce the same layout structure, color palette, typography style, and visual treatment as the reference image, but with new content (different photos, different text content). The final result must look like it belongs to the same campaign as the reference.`

  const models = ['gemini-2.0-flash-exp-image-generation']
  let lastErr: unknown
  for (const model of models) {
    try {
      const response = await googleAI.models.generateContent({
        model,
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { data: refBase64, mimeType: refMimeType } },
            { text: styledPrompt },
          ],
        }],
        config: { responseModalities: ['IMAGE', 'TEXT'] },
      })
      const parts = response.candidates?.[0]?.content?.parts ?? []
      const imagePart = parts.find(
        (p: Record<string, unknown>) => p.inlineData,
      ) as { inlineData: { data: string; mimeType: string } } | undefined
      if (!imagePart?.inlineData?.data) throw new Error('Sem imagem na resposta')
      return { base64: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType ?? 'image/png' }
    } catch (err) {
      console.warn(`[nanobanana-styled] Modelo ${model} falhou:`, String(err).slice(0, 80))
      lastErr = err
    }
  }
  throw lastErr
}

// ── Generate image with Nanobanana (Google Gemini) ────────────────────────────
app.post('/api/ai/generate-imagen', async (req, res) => {
  if (!googleAI) {
    res.status(503).json({ error: 'GOOGLE_API_KEY não configurada no .env' })
    return
  }
  try {
    const { prompt, aspectRatio = '1:1' } = req.body
    const fullPrompt = `${prompt}, high quality real estate photography, professional lighting, architectural photography, no people, no text, no watermarks`
    const { base64, mimeType } = await generateWithNanobanana(fullPrompt, aspectRatio)
    res.json({ imageDataUrl: `data:${mimeType};base64,${base64}` })
  } catch (err) {
    console.error('[nanobanana]', err)
    res.status(500).json({ error: String(err) })
  }
})

// ── Generate image with Flux (Replicate) ─────────────────────────────────────
app.post('/api/ai/generate', async (req, res) => {
  if (!replicate && !FAL_KEY) {
    res.status(503).json({ error: 'REPLICATE_API_TOKEN ou FAL_KEY não configurado no .env' })
    return
  }
  try {
    const { prompt, aspectRatio = '1:1' } = req.body
    const fullPrompt = `${prompt}, high quality real estate photography, professional lighting, architectural photography, no people, no text, no watermarks, no UI elements`

    // Try FAL.AI Flux first if available
    if (FAL_KEY) {
      try {
        const imageDataUrl = await generateWithFalFlux(fullPrompt, aspectRatio)
        res.json({ imageDataUrl, generator: 'fal-flux-schnell' })
        return
      } catch (err) {
        console.warn('[generate] FAL.AI falhou, tentando Replicate...', String(err).slice(0, 80))
      }
    }

    if (!replicate) {
      res.status(503).json({ error: 'Nenhum gerador de imagem disponível' })
      return
    }

    const output = await replicate.run('black-forest-labs/flux-schnell', {
      input: {
        prompt:        fullPrompt,
        aspect_ratio:  aspectRatio,
        output_format: 'jpg',
        output_quality: 85,
        num_outputs:   1,
      },
    })

    const base64 = await replicateOutputToBase64(output)
    res.json({ imageDataUrl: `data:image/jpeg;base64,${base64}`, generator: 'replicate-flux' })
  } catch (err) {
    console.error('[generate]', err)
    res.status(500).json({ error: String(err) })
  }
})

// ── Generate image with FAL.AI (dedicated endpoint) ──────────────────────────
// Supports multiple FLUX model variants
app.post('/api/ai/generate-fal', async (req, res) => {
  if (!FAL_KEY) {
    res.status(503).json({ error: 'FAL_KEY não configurada no .env' })
    return
  }
  try {
    const { prompt, aspectRatio = '1:1', model = 'fal-ai/flux/schnell' } = req.body
    const fullPrompt = `${prompt}, high quality real estate photography, professional lighting, architectural photography, no people, no text, no watermarks`
    const imageDataUrl = await generateWithFalFlux(fullPrompt, aspectRatio, model)
    res.json({ imageDataUrl, generator: model })
  } catch (err) {
    console.error('[generate-fal]', err)
    res.status(500).json({ error: String(err) })
  }
})

// ── Generate video with FAL.AI (dedicated endpoint) ──────────────────────────
// Supports Kling v2.1 text-to-video and image-to-video
app.post('/api/ai/generate-video-fal', async (req, res) => {
  if (!FAL_KEY) {
    res.status(503).json({ error: 'FAL_KEY não configurada no .env' })
    return
  }
  try {
    const {
      prompt,
      durationSeconds = 5,
      tipo = 'narrado',
      presenterImage,
      model = 'fal-ai/kling-video/v2.1/standard/text-to-video',
    } = req.body

    if (tipo === 'apresentadora' && presenterImage) {
      console.log('[fal-kling-img2vid] Gerando vídeo apresentadora...')
      const videoUrl = await generateWithFalKlingImg2Vid(prompt, presenterImage, durationSeconds)
      res.json({ videoUrl, filename: path.basename(videoUrl), generator: 'fal-kling-img2vid' })
      return
    }

    const basePrompt = tipo === 'apresentadora'
      ? `${prompt}, professional presenter speaking to camera, coastal property backdrop, cinematic`
      : `${prompt}, professional real estate cinematic footage, coastal property, natural lighting, luxury architecture, no people, no text`

    console.log(`[fal-kling] Gerando vídeo tipo=${tipo}, modelo=${model}`)
    const videoUrl = await generateWithFalKling(basePrompt, durationSeconds, model)
    res.json({ videoUrl, filename: path.basename(videoUrl), generator: model })
  } catch (err) {
    console.error('[generate-video-fal]', err)
    res.status(500).json({ error: String(err) })
  }
})

// ── Seazone brand context ─────────────────────────────────────────────────────
const SEAZONE_CONTEXT = `
CONTEXTO DA MARCA — SEAZONE
Empresa líder em gestão de imóveis para temporada no Brasil.
Tom de comunicação: profissional, orientado a resultados financeiros, confiável, próximo.
Público-alvo: investidores imobiliários buscando renda passiva e alta ocupação.
Diferenciais: gestão completa 360°, tecnologia proprietária, transparência total, maximização de receita.
Identidade visual: Azul (#0055FF, #1C398E), Verde (#5EA500), tipografia Helvetica, estilo clean e premium.

ELEMENTOS ESTRITAMENTE PROIBIDOS NOS CRIATIVOS:
1. Mencionar distância exata da praia (metros, minutos, tempo de caminhada)
2. Usar termos: "lançamento exclusivo", "acessível", "imperdível", "última chance", "oportunidade única"
3. Efeitos visuais: escurecimento excessivo, bordas/molduras no frame, vinheta, blur nas bordas
4. Mostrar vista para o mar a partir dos quartos das unidades (apenas do rooftop é permitido)
5. Pessoas sem caracterização profissional

ESTRUTURA OBRIGATÓRIA DOS VÍDEOS:
Cena 1: Tomada aérea do imóvel e localização privilegiada
Cena 2: Entrada do apresentador / transição de ambiente
Cena 3: Destaques financeiros (ROI, renda mensal, diferenciais de gestão)
Cena 4: Rooftop com vista + CTA final
`

const FORBIDDEN_ELEMENTS = [
  'distância da praia', 'minutos da praia', 'metros da praia', 'caminhada até',
  'lançamento exclusivo', 'imperdível', 'última chance', 'oportunidade única',
  'acessível', 'vista do mar do quarto', 'vista para o mar da unidade',
]

// ── Validate content against Seazone forbidden elements ───────────────────────
async function validateContent(content: string): Promise<{ valid: boolean; warnings: string[] }> {
  const warnings: string[] = []
  const lower = content.toLowerCase()
  for (const forbidden of FORBIDDEN_ELEMENTS) {
    if (lower.includes(forbidden.toLowerCase())) {
      warnings.push(`Elemento proibido detectado: "${forbidden}"`)
    }
  }
  return { valid: warnings.length === 0, warnings }
}

// ── Campanha: parse briefing (Gemini + financial data extraction) ─────────────
app.post('/api/campanha/parse-briefing', async (req, res) => {
  if (!googleAI) { res.status(503).json({ error: 'GOOGLE_API_KEY não configurada no .env' }); return }
  const { type, url, pdfData, imageData, manual, context } = req.body as { type: string; url?: string; pdfData?: string; imageData?: string; manual?: string; context?: string }

  const contextHint = context ? `\n\nINSTRUÇÕES ADICIONAIS DO USUÁRIO: ${context}\n` : ''

  const JSON_PROMPT = `${SEAZONE_CONTEXT}${contextHint}

Analise o briefing e retorne APENAS um JSON válido (sem markdown) com:
{
  "produto": "nome do empreendimento",
  "publicoAlvo": "perfil do investidor",
  "mensagensPrincipais": ["mensagem1", "mensagem2", "mensagem3", "mensagem4"],
  "tom": "tom de comunicação",
  "diferenciais": ["diferencial1", "diferencial2", "diferencial3", "diferencial4", "diferencial5"],
  "cta": "call to action principal",
  "observacoes": "observações adicionais",
  "valorInvestimento": "valor do investimento ex: R$ 290 mil",
  "rendaMensal": "renda mensal projetada ex: R$ 5.500",
  "roi": "retorno sobre investimento ex: 18% ao ano",
  "taxaOcupacao": "taxa de ocupação projetada ex: 85%",
  "localizacao": "localização do imóvel"
}`

  try {
    let responseText = ''

    if (type === 'pdf' && pdfData) {
      const base64 = pdfData.replace(/^data:[^;]+;base64,/, '')
      const result = await googleAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'application/pdf', data: base64 } },
            { text: `Extraia as informações de briefing deste documento. ${JSON_PROMPT}` },
          ],
        }],
      })
      responseText = result.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    } else if (type === 'url' && url) {
      const pageRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      const pageText = (await pageRes.text()).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 10000)
      const result = await googleAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: `Analise este conteúdo e extraia o briefing. ${JSON_PROMPT}\n\nConteúdo:\n${pageText}` }] }],
      })
      responseText = result.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    } else if (type === 'image' && imageData) {
      const mimeMatch   = (imageData as string).match(/^data:(image\/[a-z+]+);base64,/)
      const mimeType    = mimeMatch?.[1] ?? 'image/jpeg'
      const base64      = (imageData as string).replace(/^data:[^;]+;base64,/, '')
      const result = await googleAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: base64 } },
            { text: `Leia todo o conteúdo visível nesta imagem de briefing e extraia as informações. ${JSON_PROMPT}` },
          ],
        }],
      })
      responseText = result.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    } else if (type === 'manual' && manual) {
      const result = await googleAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: `Analise este briefing. ${JSON_PROMPT}\n\nBriefing:\n${manual}` }] }],
      })
      responseText = result.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    }

    if (!responseText) {
      res.status(422).json({ error: 'A IA não retornou conteúdo. Verifique se o briefing tem informações suficientes.' })
      return
    }

    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      res.status(422).json({ error: `A IA retornou formato inesperado: ${responseText.slice(0, 200)}` })
      return
    }

    try {
      const briefing = JSON.parse(jsonMatch[0])
      res.json({ briefing })
    } catch (parseErr) {
      res.status(422).json({ error: `JSON inválido da IA: ${String(parseErr)}` })
    }
  } catch (err) {
    console.error('[parse-briefing]', err)
    const msg = String(err)
    if (msg.includes('fetch') || msg.includes('ECONNREFUSED')) {
      res.status(502).json({ error: `Não foi possível acessar o link do briefing. Verifique se a URL é pública e acessível.` })
    } else {
      res.status(500).json({ error: msg })
    }
  }
})

// ── Campanha: generate copies (Gemini) ───────────────────────────────────────
app.post('/api/campanha/generate-copies', async (req, res) => {
  if (!googleAI) { res.status(503).json({ error: 'GOOGLE_API_KEY não configurada no .env' }); return }
  const { briefing, variacoesCount, campaignName } = req.body

  try {
    const prompt = `${SEAZONE_CONTEXT}\n\nCrie ${variacoesCount} variações de copy para campanha imobiliária.
Campanha: ${campaignName || briefing?.produto}
Produto: ${briefing?.produto}
Público: ${briefing?.publicoAlvo}
Mensagens: ${(briefing?.mensagensPrincipais ?? []).join(', ')}
Tom: ${briefing?.tom || 'conforme o briefing'}
Diferenciais: ${(briefing?.diferenciais ?? []).join(', ')}
CTA base: ${briefing?.cta ?? 'Saiba mais'}

Retorne APENAS JSON válido (sem markdown) com array "copies": [{variacao, headline (até 8 palavras), body (até 20 palavras), cta (até 4 palavras)}]`

    const result = await googleAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    })
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text ?? '{"copies":[]}'
    const jsonText = responseText.match(/\{[\s\S]*\}/)?.[0] ?? '{"copies":[]}'
    res.json(JSON.parse(jsonText))
  } catch (err) {
    console.error('[generate-copies]', err)
    res.status(500).json({ error: String(err) })
  }
})

// ── Campanha: generate single image (Imagen 3 primary → Flux fallback) ───────
// ── Puppeteer singleton for rendering (lazy-loaded) ──────────────────────────
// Supports both local (puppeteer) and serverless (puppeteer-core + @sparticuz/chromium)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let browserInstance: any = null
// Promise lock: prevents multiple parallel calls from each launching their own Chrome
let browserLaunchPromise: Promise<unknown> | null = null

const IS_SERVERLESS = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT)

async function getBrowser() {
  if (browserInstance) return browserInstance
  if (!browserLaunchPromise) {
    browserLaunchPromise = (async () => {
      if (IS_SERVERLESS) {
        // Serverless: use puppeteer-core + @sparticuz/chromium
        const [pptr, chromium] = await Promise.all([
          import('puppeteer-core'),
          import('@sparticuz/chromium'),
        ])
        console.log('[puppeteer] Iniciando Chrome (serverless)...')
        browserInstance = await pptr.default.launch({
          args: chromium.default.args,
          defaultViewport: chromium.default.defaultViewport,
          executablePath: await chromium.default.executablePath(),
          headless: true,
        })
      } else {
        // Local dev: use bundled puppeteer
        const pptr = await import('puppeteer')
        console.log('[puppeteer] Iniciando Chrome (local)...')
        browserInstance = await pptr.default.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-extensions'],
        })
      }
      console.log('[puppeteer] ✅ Chrome pronto')
      return browserInstance
    })().catch((err) => {
      browserLaunchPromise = null // allow retry on next request
      throw err
    })
  }
  return browserLaunchPromise
}

// ── Template rendering helper ────────────────────────────────────────────────
const TEMPLATES_DIR = path.join(__dirname, 'templates')

function fillTemplate(templateName: string, vars: Record<string, string>): string {
  const tplPath = path.join(TEMPLATES_DIR, templateName)
  let html = fs.readFileSync(tplPath, 'utf-8')
  for (const [key, value] of Object.entries(vars)) {
    html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
  }
  return html
}

async function renderHtmlToImage(html: string, width: number, height: number): Promise<string> {
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    await page.setViewport({ width, height, deviceScaleFactor: 1 })

    // Block external network requests (Google Fonts etc.) so page loads instantly
    await page.setRequestInterception(true)
    page.on('request', (req: { resourceType: () => string; abort: () => void; continue: () => void }) => {
      const type = req.resourceType()
      const url: string = (req as unknown as { url(): string }).url()
      // Block external font/stylesheet requests to avoid networkidle hang
      if ((type === 'stylesheet' || type === 'font') && !url.startsWith('data:')) {
        req.abort()
      } else {
        req.continue()
      }
    })

    // Use 'domcontentloaded' — avoids waiting for blocked network requests
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 })
    // Small delay to let CSS render
    await new Promise((r) => setTimeout(r, 300))

    const buffer = await page.screenshot({ type: 'jpeg', quality: 92, fullPage: false })
    return `data:image/jpeg;base64,${Buffer.from(buffer).toString('base64')}`
  } finally {
    await page.close()
  }
}

// ── Render creative from template ───────────────────────────────────────────
app.post('/api/campanha/render-creative', async (req, res) => {
  try {
    const {
      formato,          // '4:5' | '9:16' | 'carrossel'
      backgroundImage,  // data URL or URL of the background photo
      headline,
      headlineBold,
      headlineNormal,
      body,
      cta,
      location,
      investimento,
      rendaMensal,
      projectName,
      audienceText,
      // Carousel-specific
      slideIndex,
      totalSlides,
      slideLabel,
      ribbonText,
    } = req.body

    // Split headline into bold + normal if not already split
    let boldPart = headlineBold || ''
    let normalPart = headlineNormal || ''
    if (!boldPart && headline) {
      const words = headline.split(' ')
      const mid = Math.ceil(words.length / 2)
      boldPart = words.slice(0, mid).join(' ')
      normalPart = words.slice(mid).join(' ')
    }

    // Parse project name into parts
    const projParts = (projectName || 'Projeto').split(' ')
    const projNameBig = projParts.pop() || projParts[0] || 'SPOT'
    const projNameTop = projParts.join(' ') || ''

    const baseVars: Record<string, string> = {
      BACKGROUND_IMAGE: backgroundImage || '',
      LOCATION: location || '',
      PROJECT_NAME_TOP: projNameTop,
      PROJECT_NAME_BIG: projNameBig,
      PROJECT_NAME_SHORT: projectName || '',
      INVESTIMENTO: investimento || 'Consulte',
      RENDA_MENSAL: rendaMensal || 'Consulte',
      HEADLINE_BOLD: boldPart,
      HEADLINE_NORMAL: normalPart,
      AUDIENCE_TEXT: audienceText || '',
      CTA: cta || 'Verificar disponibilidade',
    }

    let imageDataUrl: string

    if (formato === 'carrossel' || formato === '1:1') {
      // Carousel slide
      const dots = Array.from({ length: totalSlides || 5 }, (_, i) =>
        `<div class="slide-dot${i === (slideIndex ?? 0) ? ' active' : ''}"></div>`
      ).join('')

      const html = fillTemplate('creative-carousel.html', {
        ...baseVars,
        SLIDE_DOTS: dots,
        SLIDE_LABEL: slideLabel || `Slide ${(slideIndex ?? 0) + 1} de ${totalSlides || 5}`,
        RIBBON_TEXT: ribbonText || 'LANÇAMENTO',
        BODY_TEXT: body || '',
      })
      imageDataUrl = await renderHtmlToImage(html, 1080, 1080)
    } else if (formato === '9:16') {
      const html = fillTemplate('creative-story.html', baseVars)
      imageDataUrl = await renderHtmlToImage(html, 1080, 1920)
    } else {
      // Default: Feed 4:5
      const html = fillTemplate('creative-feed.html', baseVars)
      imageDataUrl = await renderHtmlToImage(html, 1080, 1350)
    }

    res.json({ imageDataUrl })
  } catch (err) {
    console.error('[render-creative]', err)
    res.status(500).json({ error: String(err) })
  }
})

// ── Generate background photo (AI) then render with template ────────────────
// ── Helper: generate background image (FAL.AI → Replicate → Mystic) ──────────
// Priority: FAL.AI Flux Dev (quality), then Replicate Flux, then Freepik Mystic
async function generateBackground(prompt: string, formato: string): Promise<string> {
  // 1. FAL.AI Flux Dev — primary, high quality
  if (FAL_KEY) {
    try {
      const result = await generateWithFalFlux(prompt, formato, 'fal-ai/flux/dev')
      console.log('[bg] ✅ FAL.AI Flux Dev OK')
      return result
    } catch (err) {
      console.warn('[bg] FAL.AI Flux Dev falhou:', String(err).slice(0, 100))
    }
  }
  // 2. Replicate Flux Schnell — second option
  if (replicate) {
    try {
      const ar = formato === '9:16' ? '9:16' : formato === '1:1' ? '1:1' : '4:5'
      const output = await replicate.run('black-forest-labs/flux-schnell', {
        input: { prompt, aspect_ratio: ar, output_format: 'jpg', output_quality: 80, num_outputs: 1 },
      })
      console.log('[bg] ✅ Replicate Flux OK')
      return `data:image/jpeg;base64,${await replicateOutputToBase64(output)}`
    } catch (err) {
      console.warn('[bg] Replicate Flux falhou:', String(err).slice(0, 100))
    }
  }
  // 3. Freepik Mystic — fallback
  if (FREEPIK_KEY) {
    try {
      const result = await generateWithMystic(prompt, formato)
      console.log('[bg] ✅ Freepik Mystic OK')
      return result
    } catch (err) {
      console.warn('[bg] Mystic falhou:', String(err).slice(0, 100))
    }
  }
  console.warn('[bg] Nenhum gerador disponível — usando gradiente')
  return ''
}

// ── Helper: build template vars from briefing + copy ─────────────────────────
function buildTemplateVars(briefing: Record<string, string> | null, copy: Record<string, string>, bgDataUrl: string): Record<string, string> {
  const headline = copy?.headline || ''
  const words    = headline.split(' ')
  const mid      = Math.ceil(words.length / 2)

  let projTop = ''
  let projBig = briefing?.produto || 'Projeto'
  if (briefing?.produto) {
    const parts = briefing.produto.split(' ')
    projBig = parts.pop() || parts[0] || 'SPOT'
    projTop = parts.join(' ') || ''
  }

  return {
    BACKGROUND_IMAGE: bgDataUrl,
    LOCATION:         briefing?.localizacao || '',
    PROJECT_NAME_TOP: projTop,
    PROJECT_NAME_BIG: projBig,
    PROJECT_NAME_SHORT: briefing?.produto || '',
    INVESTIMENTO:     briefing?.valorInvestimento || 'Consulte',
    RENDA_MENSAL:     briefing?.rendaMensal || 'Consulte',
    HEADLINE_BOLD:    words.slice(0, mid).join(' '),
    HEADLINE_NORMAL:  words.slice(mid).join(' '),
    AUDIENCE_TEXT:    briefing?.publicoAlvo || '',
    CTA:              copy?.cta || 'Verificar disponibilidade',
  }
}

// Cache analyzed styles to avoid re-analyzing the same reference for every creative
const styleCache = new Map<string, string>()

app.post('/api/campanha/generate-creative', async (req, res) => {
  try {
    const { copy, formato, briefing, referenceImages, assetsContext } = req.body
    const refs: string[] = Array.isArray(referenceImages) ? referenceImages : []
    const hasRef = refs.length > 0

    const contextHint = assetsContext ? `, ${assetsContext}` : ''
    const bgPrompt = `Seazone real estate Brazil, ${copy?.headline || ''}, luxury coastal property aerial drone view, natural sunlight, turquoise ocean${contextHint}, no people, no text overlay, no watermarks`

    console.log(`[creative] Gerando — formato: ${formato}, refs: ${refs.length}, headline: "${copy?.headline?.slice(0,30)}"`)

    let bgDataUrl = ''
    let generator = 'template+gradient'

    if (hasRef) {
      // ── Designer uses reference image directly as background ──────────────────
      // No AI generation — preserves the visual identity of the reference piece.
      // The HTML template overlays new copy/text on top, erasing original text.
      bgDataUrl = refs[0]
      generator = 'template+reference-direct'
      console.log('[creative] ✅ Usando imagem de referência diretamente como fundo')
    } else {
      // No reference provided — generate background with AI
      bgDataUrl = await Promise.race([
        generateBackground(bgPrompt, formato ?? '4:5'),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Background timeout 120s')), 120000)),
      ]).catch((err) => {
        console.warn('[creative] Background falhou, usando gradiente:', String(err).slice(0, 80))
        return ''
      })
      generator = bgDataUrl ? 'template+ai' : 'template+gradient'
    }

    // Render HTML template with new copy on top of background
    const vars = buildTemplateVars(briefing, copy, bgDataUrl)
    let imageDataUrl: string
    if (formato === '9:16') {
      imageDataUrl = await renderHtmlToImage(fillTemplate('creative-story.html', vars), 1080, 1920)
    } else {
      imageDataUrl = await renderHtmlToImage(fillTemplate('creative-feed.html', vars), 1080, 1350)
    }

    console.log(`[creative] ✅ formato: ${formato}, generator: ${generator}`)
    res.json({ imageDataUrl, generator })
  } catch (err) {
    console.error('[generate-creative]', err)
    res.status(500).json({ error: String(err) })
  }
})

// ── Generate carousel slides with template ──────────────────────────────────
app.post('/api/campanha/generate-carrossel-v2', async (req, res) => {
  try {
    const { briefing, estrutura, slides } = req.body
    // slides = [{ headline, headlineBold, headlineNormal, body, slideLabel }]

    if (!slides || !Array.isArray(slides) || slides.length === 0) {
      res.status(400).json({ error: 'Array de slides é obrigatório' })
      return
    }

    // Generate one background image for the whole carousel
    const bgPrompt = `Seazone real estate Brazil, luxury coastal property, aerial drone photo, turquoise ocean, architectural, no people, no text, no watermarks, square 1:1 aspect ratio`
    let bgDataUrl = ''

    bgDataUrl = await generateBackground(bgPrompt, '1:1').catch((err) => {
      console.warn('[carrossel-v2] Background falhou:', String(err).slice(0, 80))
      return ''
    })

    const images: string[] = []
    const totalSlides = slides.length

    for (let i = 0; i < totalSlides; i++) {
      const slide = slides[i]
      const headline = slide.headline || ''
      const words = headline.split(' ')
      const mid = Math.ceil(words.length / 2)

      const dots = Array.from({ length: totalSlides }, (_, j) =>
        `<div class="slide-dot${j === i ? ' active' : ''}"></div>`
      ).join('')

      // Parse project name
      let projTop = ''
      let projBig = briefing?.produto || 'Projeto'
      if (briefing?.produto) {
        const parts = briefing.produto.split(' ')
        projBig = parts.pop() || parts[0] || 'SPOT'
        projTop = parts.join(' ') || ''
      }

      const html = fillTemplate('creative-carousel.html', {
        BACKGROUND_IMAGE: bgDataUrl,
        LOCATION: briefing?.localizacao || '',
        PROJECT_NAME_TOP: projTop,
        PROJECT_NAME_BIG: projBig,
        PROJECT_NAME_SHORT: briefing?.produto || '',
        INVESTIMENTO: briefing?.valorInvestimento || '',
        RENDA_MENSAL: briefing?.rendaMensal || '',
        HEADLINE_BOLD: slide.headlineBold || words.slice(0, mid).join(' '),
        HEADLINE_NORMAL: slide.headlineNormal || words.slice(mid).join(' '),
        AUDIENCE_TEXT: briefing?.publicoAlvo || '',
        CTA: slide.cta || 'Verificar disponibilidade',
        SLIDE_DOTS: dots,
        SLIDE_LABEL: slide.slideLabel || `Slide ${i + 1} de ${totalSlides}`,
        RIBBON_TEXT: i === 0 ? 'LANÇAMENTO' : (estrutura === 1 ? 'RETORNO' : estrutura === 2 ? 'LIFESTYLE' : 'GESTÃO'),
        BODY_TEXT: slide.body || '',
      })

      const imageDataUrl = await renderHtmlToImage(html, 1080, 1080)
      images.push(imageDataUrl)
    }

    res.json({ images })
  } catch (err) {
    console.error('[carrossel-v2]', err)
    res.status(500).json({ error: String(err) })
  }
})

// ── Legacy: Generate plain AI image (no template) ────────────────────────────
app.post('/api/campanha/generate-image', async (req, res) => {
  const { copy, formato } = req.body
  const prompt = `Seazone real estate Brazil, ${copy.headline}, luxury property, natural light, architectural, no people, no text, no watermarks, high quality`

  if (googleAI) {
    try {
      console.log(`[nanobanana] Gerando imagem — formato: ${formato}`)
      const { base64, mimeType } = await generateWithNanobanana(prompt, formato ?? '1:1')
      res.json({ imageDataUrl: `data:${mimeType};base64,${base64}`, generator: 'nanobanana' })
      return
    } catch (err) {
      console.warn('[nanobanana] Falhou, tentando Flux...', String(err))
    }
  }

  if (!replicate) {
    res.status(503).json({ error: 'Nenhum gerador de imagem configurado (GOOGLE_API_KEY ou REPLICATE_API_TOKEN)' })
    return
  }
  try {
    const output = await replicate.run('black-forest-labs/flux-schnell', {
      input: { prompt, aspect_ratio: formato ?? '1:1', output_format: 'jpg', output_quality: 85, num_outputs: 1 },
    })
    const base64 = await replicateOutputToBase64(output)
    res.json({ imageDataUrl: `data:image/jpeg;base64,${base64}`, generator: 'flux' })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// ── Generate video (FAL.AI Kling → Freepik Kling → Veo 3) ────────────────────
app.post('/api/ai/generate-video', async (req, res) => {
  if (!FAL_KEY && !FREEPIK_KEY && !googleAI) {
    res.status(503).json({ error: 'Nenhuma API de vídeo configurada (FAL_KEY, FREEPIK_API_KEY ou GOOGLE_API_KEY)' })
    return
  }

  const { prompt, aspectRatio = '9:16', durationSeconds = 5, tipo = 'narrado', presenterImage, assetsContext } = req.body

  console.log(`[video] tipo=${tipo}, duração=${durationSeconds}s`)

  // ── Apresentadora: Kling image-to-video com imagem de referência ──────────
  if (tipo === 'apresentadora' && presenterImage) {
    // Try FAL.AI Kling img2vid first
    if (FAL_KEY) {
      try {
        console.log('[fal-kling-img2vid] Gerando vídeo apresentadora...')
        const videoUrl = await generateWithFalKlingImg2Vid(prompt, presenterImage, durationSeconds)
        res.json({ videoUrl, generator: 'fal-kling-img2vid' })
        return
      } catch (err) {
        console.warn('[fal-kling-img2vid] Falhou, tentando Freepik...', String(err).slice(0, 80))
      }
    }
    // Fallback: Freepik Kling img2vid
    if (FREEPIK_KEY) {
      try {
        console.log('[kling-img2vid] Gerando vídeo apresentadora com Freepik...')
        const videoUrl = await generateWithKlingImg2Vid(prompt, presenterImage, durationSeconds)
        res.json({ videoUrl, generator: 'kling-img2vid' })
        return
      } catch (err) {
        console.warn('[kling-img2vid] Falhou, tentando text-to-video...', String(err))
      }
    }
  }

  // Narrado / fallback: text-to-video
  const narradoContext = assetsContext ? ` ${assetsContext}` : ''
  const basePromptNarrado = tipo === 'apresentadora'
    ? `${prompt}, professional presenter speaking to camera, Seazone real estate, coastal property backdrop, clear audio narration, cinematic`
    : `${prompt}${narradoContext}, professional real estate cinematic footage, coastal property, natural lighting, luxury architecture, no people, no text`

  // 1. Google Veo — primário
  if (googleAI) {
    try {
      const veoAspect = aspectRatio === '1:1' ? '1:1' : aspectRatio === '4:5' ? '4:5' : '9:16'
      console.log(`[veo] Iniciando geração — aspecto: ${veoAspect}, duração: ${durationSeconds}s`)

      let operation = await googleAI.models.generateVideos({
        model: 'veo-2.0-generate-001',
        prompt: basePromptNarrado,
        config: {
          numberOfVideos: 1,
          durationSeconds: Math.min(Number(durationSeconds), 8),
          aspectRatio: veoAspect,
          personGeneration: tipo === 'apresentadora' ? 'allow_adult' : 'dont_allow',
        },
      })

      const deadline = Date.now() + 6 * 60 * 1000
      while (!operation.done) {
        if (Date.now() > deadline) throw new Error('Timeout: geração de vídeo ultrapassou 6 minutos')
        console.log('[veo] Aguardando...')
        await new Promise((r) => setTimeout(r, 10_000))
        operation = await googleAI.operations.getVideosOperation({ operation })
      }

      const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri
      if (!videoUri) throw new Error('Nenhum vídeo retornado pelo Veo')

      const dlRes = await fetch(`${videoUri}&key=${GOOGLE_KEY}`)
      if (!dlRes.ok) throw new Error(`Falha ao baixar vídeo: ${dlRes.status}`)

      const filename = `veo_${Date.now()}.mp4`
      const filepath = path.join(TEMP_VIDEO_DIR, filename)
      fs.writeFileSync(filepath, Buffer.from(await dlRes.arrayBuffer()))

      console.log(`[veo] ✅ Salvo em ${filepath}`)
      res.json({ videoUrl: `/temp/videos/${filename}`, filename, generator: 'google-veo2' })
      return
    } catch (err) {
      console.warn('[veo] Falhou, tentando FAL.AI Kling...', String(err).slice(0, 100))
    }
  }

  // 2. FAL.AI Kling v2.1 — fallback
  if (FAL_KEY) {
    try {
      console.log(`[fal-kling] Iniciando geração — tipo: ${tipo}, duração: ${durationSeconds}s`)
      const videoUrl = await generateWithFalKling(basePromptNarrado, durationSeconds)
      res.json({ videoUrl, generator: 'fal-kling-v2.1' })
      return
    } catch (err) {
      console.warn('[fal-kling] Falhou:', String(err).slice(0, 80))
    }
  }

  res.status(503).json({ error: 'Nenhuma API de vídeo disponível' })
})

// ── Campanha: validate content ────────────────────────────────────────────────
app.post('/api/campanha/validate', async (req, res) => {
  const { contents } = req.body as { contents: string[] }
  const results = await Promise.all(
    (contents ?? []).map(async (c: string) => validateContent(c))
  )
  const allWarnings = results.flatMap((r) => r.warnings)
  res.json({ valid: allWarnings.length === 0, warnings: allWarnings })
})

// ── Campanha: generate copies 3×5 (Gemini) ───────────────────────────────────
app.post('/api/campanha/generate-copies-full', async (req, res) => {
  if (!googleAI) { res.status(503).json({ error: 'GOOGLE_API_KEY não configurada' }); return }
  const { briefing, campaignName, estruturasCount = 3, variacoesCount = 5 } = req.body
  // Tom comes from the briefing itself — no manual override needed
  const tomFromBriefing = briefing?.tom || 'definido pelo briefing'

  const financialCtx = briefing?.valorInvestimento
    ? `Dados financeiros: Investimento ${briefing.valorInvestimento} | Renda ${briefing.rendaMensal}/mês | ROI ${briefing.roi} | Ocupação ${briefing.taxaOcupacao}`
    : ''

  // Build estrutura descriptions based on count
  const ESTRUTURA_DEFS = [
    'Estrutura 1: Foco em RETORNO FINANCEIRO (ROI, renda mensal, valorização)',
    'Estrutura 2: Foco em LOCALIZAÇÃO E LIFESTYLE (praia, qualidade de vida, status)',
    'Estrutura 3: Foco em GESTÃO PROFISSIONAL (tranquilidade, tecnologia, transparência)',
  ]
  const estruturaLines = ESTRUTURA_DEFS.slice(0, estruturasCount).join('\n- ')

  const longThreshold = Math.ceil(variacoesCount * 0.6)
  const totalCopies   = estruturasCount * variacoesCount

  const prompt = `${SEAZONE_CONTEXT}

Crie copies para uma campanha de marketing imobiliário com ${estruturasCount} ESTRUTURA${estruturasCount > 1 ? 'S' : ''} e ${variacoesCount} VARIAÇÃO${variacoesCount > 1 ? 'ÕES' : ''} cada (${totalCopies} copies no total).

Campanha: ${campaignName || briefing?.produto}
Produto: ${briefing?.produto}
Localização: ${briefing?.localizacao ?? 'não informada'}
Público: ${briefing?.publicoAlvo}
Mensagens: ${(briefing?.mensagensPrincipais ?? []).join(', ')}
Tom: ${tomFromBriefing}
Diferenciais: ${(briefing?.diferenciais ?? []).join(', ')}
CTA base: ${briefing?.cta ?? 'Saiba mais'}
${financialCtx}

ESTRUTURAS (cada uma com ângulo diferente):
- ${estruturaLines}

Para cada estrutura, crie exatamente ${variacoesCount} variação${variacoesCount > 1 ? 'ões' : ''} com abordagens diferentes.
Variações 1-${longThreshold} são versões longas (para vídeos 30-40s e imagens feed).
${longThreshold < variacoesCount ? `Variações ${longThreshold + 1}-${variacoesCount} são versões curtas e impactantes (para vídeos 10-20s e stories).` : ''}

Retorne APENAS JSON válido (sem markdown):
{
  "copies": [
    {
      "estrutura": 1,
      "variacao": 1,
      "headline": "até 8 palavras impactantes",
      "body": "até 25 palavras com dado financeiro específico",
      "cta": "até 4 palavras",
      "videoRoteiro": "sequência de 4 cenas: [aérea] → [apresentador] → [financeiro] → [rooftop+CTA]"
    }
  ]
}`

  try {
    const result = await googleAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    })
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text ?? '{"copies":[]}'
    const jsonText = responseText.match(/\{[\s\S]*\}/)?.[0] ?? '{"copies":[]}'
    res.json(JSON.parse(jsonText))
  } catch (err) {
    console.error('[generate-copies-full]', err)
    res.status(500).json({ error: String(err) })
  }
})

// ── Campanha: generate carousel ───────────────────────────────────────────────
app.post('/api/campanha/generate-carrossel', async (req, res) => {
  if (!googleAI) { res.status(503).json({ error: 'GOOGLE_API_KEY não configurada' }); return }
  const { briefing, estrutura, copy } = req.body

  const CAROUSEL_FRAMES = [
    { slide: 1, desc: 'Vista aérea externa do empreendimento, arquitetura moderna, localização privilegiada' },
    { slide: 2, desc: 'Interior luxuoso, acabamento premium, ambientes iluminados naturalmente' },
    { slide: 3, desc: 'Infográfico de dados financeiros, ROI, renda mensal projetada, gestão profissional' },
    { slide: 4, desc: 'Rooftop com vista panorâmica, área de lazer, piscina, pôr do sol' },
    { slide: 5, desc: 'Imagem de marca Seazone, CTA clean, identidade visual azul' },
  ]

  try {
    const images: string[] = []
    for (const frame of CAROUSEL_FRAMES) {
      const prompt = `${SEAZONE_CONTEXT}
Real estate marketing carousel slide ${frame.slide}/5 for ${briefing?.produto ?? 'luxury property'} in ${briefing?.localizacao ?? 'Brazil'}.
Style: ${frame.desc}
Campaign angle: ${estrutura === 1 ? 'financial return focus' : estrutura === 2 ? 'lifestyle and location focus' : 'professional management focus'}
Copy reference: ${copy?.headline ?? ''}
High quality, professional real estate photography, no text overlay, no watermarks, no people.`

      try {
        const { base64, mimeType } = await generateWithNanobanana(prompt, '4:5')
        images.push(`data:${mimeType};base64,${base64}`)
      } catch {
        images.push('') // skip failed slide
      }
    }
    res.json({ images })
  } catch (err) {
    console.error('[generate-carrossel]', err)
    res.status(500).json({ error: String(err) })
  }
})

// ── Delete generated video file ───────────────────────────────────────────────
app.delete('/api/ai/video/:filename', (req, res) => {
  const { filename } = req.params
  // Safety: only allow simple filenames (no path traversal)
  if (!filename || /[/\\]/.test(filename)) {
    res.status(400).json({ error: 'Nome de arquivo inválido' })
    return
  }
  const filepath = path.join(TEMP_VIDEO_DIR, filename)
  if (!fs.existsSync(filepath)) {
    res.status(404).json({ error: 'Arquivo não encontrado' })
    return
  }
  try {
    fs.unlinkSync(filepath)
    console.log(`[video] Arquivo removido: ${filename}`)
    res.json({ ok: true })
  } catch (err) {
    console.error('[video delete]', err)
    res.status(500).json({ error: String(err) })
  }
})

// ── Serve frontend in production (local/Railway only — Vercel serves static separately) ──
if (!process.env.VERCEL) {
  const DIST_DIR = path.join(__dirname, '..', 'dist')
  if (fs.existsSync(DIST_DIR)) {
    app.use(express.static(DIST_DIR))
    app.get('*', (_req, res) => {
      res.sendFile(path.join(DIST_DIR, 'index.html'))
    })
  }
}

// ── Export for Vercel serverless ──────────────────────────────────────────────
export default app

// ── Start (local dev / Railway / Render) ─────────────────────────────────────
if (!process.env.VERCEL) {
  const PORT = Number(process.env.PORT ?? process.env.AI_SERVER_PORT ?? 3001)
  app.listen(PORT, () => {
    console.log(`\n🤖  AI proxy  →  http://localhost:${PORT}`)
    console.log(`    Gemini 2.5 (briefing/copies): ${googleAI    ? '✅' : '❌  GOOGLE_API_KEY ausente'}`)
    console.log(`    FAL.AI (imagens/vídeos):      ${FAL_KEY     ? '✅' : '⚠️  opcional'}`)
    console.log(`    ElevenLabs (TTS locução):     ${ELEVENLABS_KEY ? '✅' : '⚠️  opcional'}`)
    console.log(`    Freepik Mystic (imagens):     ${FREEPIK_KEY  ? '✅' : '⚠️  opcional'}`)
    console.log(`    Freepik Kling (vídeos):       ${FREEPIK_KEY  ? '✅' : '⚠️  opcional'}`)
    console.log(`    Flux (fallback img):          ${replicate   ? '✅' : '⚠️  opcional'}`)
    console.log(`    Claude (visão WhatsApp):      ${anthropic   ? '✅' : '⚠️  opcional'}\n`)
  })
}
