// Vercel serverless handler — self-contained Express app (no Puppeteer)
// Template rendering (Puppeteer) is not available in serverless mode.
// All AI generation endpoints (FAL.AI, ElevenLabs, Gemini, etc.) work normally.

import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'
import Replicate from 'replicate'
import { GoogleGenAI } from '@google/genai'
import { fal } from '@fal-ai/client'
import * as dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

dotenv.config()

// ── Temp dir ──────────────────────────────────────────────────────────────────
const TEMP_VIDEO_DIR = '/tmp/videos'
try { fs.mkdirSync(TEMP_VIDEO_DIR, { recursive: true }) } catch { /* ok */ }

// ── API keys ──────────────────────────────────────────────────────────────────
function sanitizeKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  const key = raw.trim()
  for (let i = 0; i < key.length; i++) {
    if (key.charCodeAt(i) > 127) return undefined
  }
  return key || undefined
}

const ANTHROPIC_KEY  = sanitizeKey(process.env.ANTHROPIC_API_KEY)
const REPLICATE_KEY  = sanitizeKey(process.env.REPLICATE_API_TOKEN)
const GOOGLE_KEY     = sanitizeKey(process.env.GOOGLE_API_KEY)
const FREEPIK_KEY    = sanitizeKey(process.env.FREEPIK_API_KEY)
const FAL_KEY        = sanitizeKey(process.env.FAL_KEY)
const ELEVENLABS_KEY = sanitizeKey(process.env.ELEVENLABS_API_KEY)

const anthropic = ANTHROPIC_KEY ? new Anthropic({ apiKey: ANTHROPIC_KEY }) : null
const replicate = REPLICATE_KEY ? new Replicate({ auth: REPLICATE_KEY })   : null
const googleAI  = GOOGLE_KEY    ? new GoogleGenAI({ apiKey: GOOGLE_KEY })  : null
if (FAL_KEY) fal.config({ credentials: FAL_KEY })

// ── Freepik helpers ───────────────────────────────────────────────────────────
const FREEPIK_BASE = 'https://api.freepik.com/v1'
const freepikHdr = () => ({
  'x-freepik-api-key': FREEPIK_KEY!,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
})
function freepikAR(fmt: string) {
  const m: Record<string, string> = {
    '1:1': 'square_1_1', '4:5': 'social_post_4_5', '9:16': 'social_story_9_16', '16:9': 'widescreen_16_9',
  }
  return m[fmt] ?? 'square_1_1'
}
async function pollMystic(taskId: string): Promise<string> {
  for (let i = 0; i < 18; i++) {
    await new Promise(r => setTimeout(r, 3000))
    const r = await fetch(`${FREEPIK_BASE}/ai/mystic/${taskId}`, { headers: freepikHdr(), signal: AbortSignal.timeout(10000) })
    const j = await r.json() as { data?: { status?: string; generated?: unknown[] } }
    const st = j.data?.status ?? ''
    const gen = j.data?.generated ?? []
    if (gen.length > 0) {
      const url = typeof gen[0] === 'string' ? gen[0] : (gen[0] as { url?: string })?.url
      if (url) {
        const ir = await fetch(url, { signal: AbortSignal.timeout(20000) })
        const buf = await ir.arrayBuffer()
        return `data:image/jpeg;base64,${Buffer.from(buf).toString('base64')}`
      }
    }
    if (st === 'FAILED' || st === 'failed') throw new Error('Mystic task falhou')
  }
  throw new Error('Mystic timeout')
}
async function generateWithMystic(prompt: string, formato: string): Promise<string> {
  if (!FREEPIK_KEY) throw new Error('FREEPIK_API_KEY não configurada')
  const r = await fetch(`${FREEPIK_BASE}/ai/mystic`, {
    method: 'POST', headers: freepikHdr(), signal: AbortSignal.timeout(15000),
    body: JSON.stringify({ prompt, resolution: '1k', aspect_ratio: freepikAR(formato), model: 'realism', creative_detailing: 65, num_images: 1 }),
  })
  const j = await r.json() as { data?: { task_id?: string } }
  if (!r.ok) throw new Error(`Mystic ${r.status}: ${JSON.stringify(j)}`)
  const taskId = j.data?.task_id
  if (!taskId) throw new Error('Mystic sem task_id')
  return await pollMystic(taskId)
}
async function generateWithKling(prompt: string, duration: number): Promise<string> {
  if (!FREEPIK_KEY) throw new Error('FREEPIK_API_KEY não configurada')
  const r = await fetch(`${FREEPIK_BASE}/ai/video/kling-v3-omni`, {
    method: 'POST', headers: freepikHdr(),
    body: JSON.stringify({ prompt, duration: duration <= 5 ? 5 : duration <= 10 ? 10 : 15, aspect_ratio: '9:16', negative_prompt: 'people, text, watermarks, low quality' }),
  })
  const d = await r.json() as { task_id?: string }
  if (!r.ok) throw new Error(`Kling ${r.status}`)
  if (!d.task_id) throw new Error('Kling sem task_id')
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000))
    const p = await fetch(`${FREEPIK_BASE}/ai/video/kling-v3-omni/${d.task_id}`, { headers: freepikHdr() })
    const pd = await p.json() as { status?: string; data?: { url?: string } }
    if (pd.status === 'completed' && pd.data?.url) return pd.data.url
    if (pd.status === 'failed') throw new Error('Kling falhou')
  }
  throw new Error('Kling timeout')
}

// ── FAL.AI helpers ────────────────────────────────────────────────────────────
function falSize(fmt: string): string | { width: number; height: number } {
  const m: Record<string, string | { width: number; height: number }> = {
    '1:1': 'square_hd', '4:5': { width: 864, height: 1080 }, '9:16': { width: 576, height: 1024 }, '16:9': 'landscape_16_9',
  }
  return m[fmt] ?? 'square_hd'
}
async function generateWithFalFlux(prompt: string, formato: string, model = 'fal-ai/flux/schnell'): Promise<string> {
  if (!FAL_KEY) throw new Error('FAL_KEY não configurada')
  // Race against a 45s timeout to avoid Vercel function timeout (60s limit)
  const result = await Promise.race([
    fal.subscribe(model, {
      input: { prompt, image_size: falSize(formato), num_images: 1, output_format: 'jpeg', num_inference_steps: model.includes('schnell') ? 4 : 28 },
    }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('FAL.AI timeout 45s')), 45000)),
  ]) as { data: { images: Array<{ url: string }> } }
  const imageUrl = result.data?.images?.[0]?.url
  if (!imageUrl) throw new Error('FAL.AI sem imagem')
  const ir = await fetch(imageUrl, { signal: AbortSignal.timeout(20000) })
  const buf = await ir.arrayBuffer()
  return `data:image/jpeg;base64,${Buffer.from(buf).toString('base64')}`
}
async function generateWithFalKling(prompt: string, duration: number, model = 'fal-ai/kling-video/v2.1/standard/text-to-video'): Promise<string> {
  if (!FAL_KEY) throw new Error('FAL_KEY não configurada')
  const result = await fal.subscribe(model, {
    input: { prompt, duration: String(duration <= 5 ? 5 : 10), aspect_ratio: '9:16', negative_prompt: 'people, text, watermarks, low quality' },
  }) as { data: { video: { url: string } } }
  const videoUrl = result.data?.video?.url
  if (!videoUrl) throw new Error('FAL.AI Kling sem vídeo')
  const dlRes = await fetch(videoUrl, { signal: AbortSignal.timeout(60000) })
  const buf = await dlRes.arrayBuffer()
  const filename = `fal_${Date.now()}.mp4`
  fs.writeFileSync(path.join(TEMP_VIDEO_DIR, filename), Buffer.from(buf))
  return `/temp/videos/${filename}`
}

// ── Google Gemini image helper ────────────────────────────────────────────────
function aspectHint(r: string) {
  const m: Record<string, string> = { '1:1': 'square 1:1', '9:16': 'vertical portrait 9:16', '4:5': 'vertical 4:5', '16:9': 'landscape 16:9' }
  return m[r] ?? 'square 1:1'
}
async function generateWithGemini(prompt: string, aspectRatio: string): Promise<{ base64: string; mimeType: string }> {
  if (!googleAI) throw new Error('GOOGLE_API_KEY não configurada')
  const fullPrompt = `${prompt}, ${aspectHint(aspectRatio)}`
  for (const model of ['gemini-2.5-flash-exp-image-generation', 'gemini-2.5-flash-thinking-exp']) {
    try {
      const response = await googleAI.models.generateContent({
        model, contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        config: { responseModalities: ['IMAGE', 'TEXT'] },
      })
      const parts = response.candidates?.[0]?.content?.parts ?? []
      const imagePart = parts.find((p: Record<string, unknown>) => p.inlineData) as { inlineData: { data: string; mimeType: string } } | undefined
      if (!imagePart?.inlineData?.data) throw new Error('Sem imagem')
      return { base64: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType ?? 'image/png' }
    } catch { /* try next model */ }
  }
  throw new Error('Gemini image generation falhou')
}

// ── Reference style analysis (Gemini) ────────────────────────────────────────
async function analyzeReferenceStyle(imageDataUrl: string): Promise<string> {
  if (!googleAI) return ''
  try {
    const base64Match = imageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/)
    if (!base64Match) return ''
    const [, mimeType, base64Data] = base64Match
    const response = await googleAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [
        { inlineData: { data: base64Data, mimeType } },
        { text: `Analise esta peça publicitária e descreva o estilo visual em inglês para reprodução por IA generativa. Foque em: layout/composição, paleta de cores, tipografia, tratamento de imagem de fundo, elementos gráficos, tom visual. Responda APENAS com a descrição em um parágrafo conciso em inglês.` },
      ] }],
    })
    return (response.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim()
  } catch (err) {
    console.warn('[style-analysis] Falhou:', String(err).slice(0, 100))
    return ''
  }
}

// Styled generation via FAL.AI with enriched prompt from style analysis
async function generateWithFalStyled(prompt: string, formato: string, styleDesc: string): Promise<string> {
  if (!FAL_KEY) throw new Error('FAL_KEY não configurada')
  const styledPrompt = `${prompt}, ${styleDesc}, ${aspectHint(formato)}, professional advertisement photography, luxury real estate`
  return await generateWithFalFlux(styledPrompt, formato, 'fal-ai/flux/schnell')
}

// ── Replicate helper ──────────────────────────────────────────────────────────
async function replicateToBase64(output: unknown): Promise<string> {
  const item = Array.isArray(output) ? output[0] : output
  if (item && typeof (item as Record<string, unknown>).arrayBuffer === 'function') {
    const buf = await (item as { arrayBuffer(): Promise<ArrayBuffer> }).arrayBuffer()
    return Buffer.from(buf).toString('base64')
  }
  const urlStr = String(item)
  if (urlStr.startsWith('http')) {
    const r = await fetch(urlStr)
    return Buffer.from(await r.arrayBuffer()).toString('base64')
  }
  throw new Error('Formato Replicate desconhecido')
}

// ── Background image generator — FAL.AI primary (Gemini image gen removed) ───
async function generateBackground(prompt: string, formato: string): Promise<string> {
  // 1. FAL.AI Flux Schnell — primary (fast, reliable)
  if (FAL_KEY) {
    try {
      console.log(`[bg] FAL.AI Flux Schnell — formato: ${formato}`)
      const img = await generateWithFalFlux(prompt, formato, 'fal-ai/flux/schnell')
      console.log('[bg] ✅ FAL.AI OK')
      return img
    } catch (err) {
      console.warn('[bg] FAL.AI Flux Schnell falhou, tentando Flux Dev...', String(err).slice(0, 100))
    }
    // 2. FAL.AI Flux Dev — slightly slower but higher quality fallback
    try {
      const img = await generateWithFalFlux(prompt, formato, 'fal-ai/flux/dev')
      console.log('[bg] ✅ FAL.AI Flux Dev OK')
      return img
    } catch (err) {
      console.warn('[bg] FAL.AI Flux Dev falhou:', String(err).slice(0, 100))
    }
  }
  // 3. Freepik Mystic — if key available
  if (FREEPIK_KEY) {
    try { return await generateWithMystic(prompt, formato) } catch { /* fallthrough */ }
  }
  // 4. Replicate Flux — if key available
  if (replicate) {
    try {
      const output = await replicate.run('black-forest-labs/flux-schnell', {
        input: { prompt, aspect_ratio: formato === '9:16' ? '9:16' : formato === '1:1' ? '1:1' : '4:5', output_format: 'jpg', output_quality: 80, num_outputs: 1 },
      })
      return `data:image/jpeg;base64,${await replicateToBase64(output)}`
    } catch { /* fallthrough */ }
  }
  console.error('[bg] ❌ Nenhum gerador disponível — FAL_KEY configurado?', !!FAL_KEY)
  return ''
}

// ── ElevenLabs helper ─────────────────────────────────────────────────────────
const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1'
const ELEVENLABS_DEFAULT_VOICE = '21m00Tcm4TlvDq8ikWAM'
async function generateWithElevenLabs(text: string, voiceId = ELEVENLABS_DEFAULT_VOICE, modelId = 'eleven_multilingual_v2'): Promise<string> {
  if (!ELEVENLABS_KEY) throw new Error('ELEVENLABS_API_KEY não configurada')
  const r = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': ELEVENLABS_KEY, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: modelId, voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true } }),
    signal: AbortSignal.timeout(30000),
  })
  if (!r.ok) { const e = await r.text(); throw new Error(`ElevenLabs ${r.status}: ${e}`) }
  const buf = await r.arrayBuffer()
  const filename = `tts_${Date.now()}.mp3`
  fs.writeFileSync(path.join(TEMP_VIDEO_DIR, filename), Buffer.from(buf))
  return `/temp/videos/${filename}`
}

// ── Seazone context & forbidden elements ─────────────────────────────────────
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
const FORBIDDEN = ['distância da praia','minutos da praia','metros da praia','caminhada até','lançamento exclusivo','imperdível','última chance','oportunidade única','acessível','vista do mar do quarto','vista para o mar da unidade']

// ── Express app ───────────────────────────────────────────────────────────────
const app = express()
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use('/temp', express.static(TEMP_VIDEO_DIR))

// Status
app.get('/api/ai/status', (_req, res) => {
  res.json({
    vision: !!anthropic || !!googleAI,
    generation: !!FAL_KEY || !!FREEPIK_KEY || !!replicate || !!googleAI,
    imagen: !!FAL_KEY || !!FREEPIK_KEY || !!googleAI,
    video: !!FAL_KEY || !!FREEPIK_KEY || !!googleAI,
    freepik: !!FREEPIK_KEY,
    fal: !!FAL_KEY,
    elevenlabs: !!ELEVENLABS_KEY,
    ready: !!googleAI || !!FAL_KEY || !!FREEPIK_KEY,
  })
})

// Claude image analysis
app.post('/api/ai/analyze', async (req, res) => {
  if (!anthropic) { res.status(503).json({ error: 'ANTHROPIC_API_KEY não configurada' }); return }
  try {
    const { imageBase64, context = 'arte para WhatsApp de imóvel' } = req.body
    const base64Data = (imageBase64 as string).replace(/^data:image\/[a-z+]+;base64,/, '')
    const mediaTypeMatch = (imageBase64 as string).match(/^data:(image\/[a-z+]+);base64,/)
    const mediaType = (mediaTypeMatch?.[1] ?? 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5', max_tokens: 1024,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
        { type: 'text', text: `Você é especialista em design visual para marketing imobiliário. Analise esta imagem de referência para uma ${context}.\nRetorne APENAS JSON válido:\n{"prompt":"detailed English prompt 150-200 words: photography style, lighting, architecture, atmosphere, colors, composition — real estate background, no people, no text, no UI","description":"2 frases em português descrevendo o estilo visual","mood":"uma palavra em português para o clima/atmosfera"}` },
      ]}],
    })
    const raw = message.content[0].type === 'text' ? message.content[0].text : '{}'
    res.json(JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim()))
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

// Image generation (FAL.AI → Replicate fallback)
app.post('/api/ai/generate', async (req, res) => {
  const { prompt, aspectRatio = '1:1' } = req.body
  const fullPrompt = `${prompt}, high quality real estate photography, professional lighting, no people, no text, no watermarks`
  if (FAL_KEY) {
    try { const img = await generateWithFalFlux(fullPrompt, aspectRatio); res.json({ imageDataUrl: img, generator: 'fal-flux' }); return } catch { /* fallthrough */ }
  }
  if (!replicate) { res.status(503).json({ error: 'Nenhum gerador disponível' }); return }
  try {
    const output = await replicate.run('black-forest-labs/flux-schnell', { input: { prompt: fullPrompt, aspect_ratio: aspectRatio, output_format: 'jpg', output_quality: 85, num_outputs: 1 } })
    res.json({ imageDataUrl: `data:image/jpeg;base64,${await replicateToBase64(output)}`, generator: 'replicate-flux' })
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

// FAL.AI image dedicated endpoint
app.post('/api/ai/generate-fal', async (req, res) => {
  if (!FAL_KEY) { res.status(503).json({ error: 'FAL_KEY não configurada' }); return }
  try {
    const { prompt, aspectRatio = '1:1', model = 'fal-ai/flux/schnell' } = req.body
    const img = await generateWithFalFlux(`${prompt}, high quality real estate photography, no people, no text`, aspectRatio, model)
    res.json({ imageDataUrl: img, generator: model })
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

// Google Gemini image
app.post('/api/ai/generate-imagen', async (req, res) => {
  if (!googleAI) { res.status(503).json({ error: 'GOOGLE_API_KEY não configurada' }); return }
  try {
    const { prompt, aspectRatio = '1:1' } = req.body
    const { base64, mimeType } = await generateWithGemini(`${prompt}, high quality real estate photography, no people, no text`, aspectRatio)
    res.json({ imageDataUrl: `data:${mimeType};base64,${base64}` })
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

// Video generation (FAL.AI → Freepik)
app.post('/api/ai/generate-video', async (req, res) => {
  if (!FAL_KEY && !FREEPIK_KEY) { res.status(503).json({ error: 'Nenhuma API de vídeo configurada' }); return }
  const { prompt, durationSeconds = 5, tipo = 'narrado', assetsContext } = req.body
  const narradoContext = assetsContext ? ` ${assetsContext}` : ''
  const basePrompt = tipo === 'apresentadora'
    ? `${prompt}, professional presenter speaking to camera, Seazone real estate, coastal property backdrop, cinematic`
    : `${prompt}${narradoContext}, professional real estate cinematic footage, coastal property, natural lighting, no people, no text`
  if (FAL_KEY) {
    try { const v = await generateWithFalKling(basePrompt, durationSeconds); res.json({ videoUrl: v, generator: 'fal-kling-v2.1' }); return } catch { /* fallthrough */ }
  }
  if (FREEPIK_KEY) {
    try { const v = await generateWithKling(basePrompt, durationSeconds); res.json({ videoUrl: v, generator: 'kling' }); return } catch { /* fallthrough */ }
  }
  res.status(500).json({ error: 'Todas as APIs de vídeo falharam' })
})

// FAL.AI video dedicated endpoint
app.post('/api/ai/generate-video-fal', async (req, res) => {
  if (!FAL_KEY) { res.status(503).json({ error: 'FAL_KEY não configurada' }); return }
  try {
    const { prompt, durationSeconds = 5, model = 'fal-ai/kling-video/v2.1/standard/text-to-video' } = req.body
    const v = await generateWithFalKling(prompt, durationSeconds, model)
    res.json({ videoUrl: v, filename: v.split('/').pop(), generator: model })
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

// ElevenLabs TTS
app.post('/api/ai/tts', async (req, res) => {
  if (!ELEVENLABS_KEY) { res.status(503).json({ error: 'ELEVENLABS_API_KEY não configurada' }); return }
  try {
    const { text, voiceId, modelId } = req.body
    if (!text) { res.status(400).json({ error: 'Campo "text" obrigatório' }); return }
    const audioUrl = await generateWithElevenLabs(String(text).trim(), voiceId, modelId)
    res.json({ audioUrl, filename: audioUrl.split('/').pop(), generator: 'elevenlabs' })
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

app.get('/api/ai/tts/voices', async (_req, res) => {
  if (!ELEVENLABS_KEY) { res.status(503).json({ error: 'ELEVENLABS_API_KEY não configurada' }); return }
  try {
    const r = await fetch(`${ELEVENLABS_BASE}/voices`, { headers: { 'xi-api-key': ELEVENLABS_KEY }, signal: AbortSignal.timeout(10000) })
    const d = await r.json() as { voices: unknown[] }
    res.json({ voices: d.voices ?? [] })
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

// Delete video
app.delete('/api/ai/video/:filename', (req, res) => {
  try {
    const fp = path.join(TEMP_VIDEO_DIR, path.basename(req.params.filename))
    if (fs.existsSync(fp)) fs.unlinkSync(fp)
    res.json({ ok: true })
  } catch { res.json({ ok: true }) }
})

// Parse briefing (Gemini)
app.post('/api/campanha/parse-briefing', async (req, res) => {
  if (!googleAI) { res.status(503).json({ error: 'GOOGLE_API_KEY não configurada' }); return }
  const { type, url, pdfData, imageData, manual, context } = req.body as { type: string; url?: string; pdfData?: string; imageData?: string; manual?: string; context?: string }
  const contextHint = context ? `\n\nINSTRUÇÕES ADICIONAIS DO USUÁRIO: ${context}\n` : ''
  const JSON_PROMPT = `${SEAZONE_CONTEXT}${contextHint}\n\nAnalise o briefing e retorne APENAS um JSON válido (sem markdown) com:\n{"produto":"...","publicoAlvo":"...","mensagensPrincipais":["..."],"tom":"...","diferenciais":["..."],"cta":"...","observacoes":"...","valorInvestimento":"...","rendaMensal":"...","roi":"...","taxaOcupacao":"...","localizacao":"..."}`
  try {
    let responseText = ''
    if (type === 'url' && url) {
      const r = await googleAI.models.generateContent({ model: 'gemini-2.5-flash', contents: [{ role: 'user', parts: [{ text: `${JSON_PROMPT}\n\nURL do briefing: ${url}` }] }] })
      responseText = r.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    } else if ((type === 'pdf' && pdfData) || (type === 'image' && imageData)) {
      const data = (pdfData || imageData)!
      const b64 = data.replace(/^data:[^;]+;base64,/, '')
      const mime = data.match(/^data:([^;]+);/)?.[1] ?? (type === 'pdf' ? 'application/pdf' : 'image/jpeg')
      const r = await googleAI.models.generateContent({ model: 'gemini-2.5-flash', contents: [{ role: 'user', parts: [{ inlineData: { mimeType: mime, data: b64 } }, { text: JSON_PROMPT }] }] })
      responseText = r.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    } else if (type === 'manual' && manual) {
      const r = await googleAI.models.generateContent({ model: 'gemini-2.5-flash', contents: [{ role: 'user', parts: [{ text: `${JSON_PROMPT}\n\nBriefing manual:\n${manual}` }] }] })
      responseText = r.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    } else {
      res.status(400).json({ error: 'Tipo de briefing inválido' }); return
    }
    const cleaned = responseText.replace(/```json\n?|\n?```/g, '').trim()
    res.json({ briefing: JSON.parse(cleaned) })
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

// Validate content
app.post('/api/campanha/validate', (req, res) => {
  const { contents } = req.body as { contents: string[] }
  const allWarnings: string[] = []
  for (const c of (contents ?? [])) {
    const lower = c.toLowerCase()
    for (const f of FORBIDDEN) {
      if (lower.includes(f.toLowerCase())) allWarnings.push(`Elemento proibido: "${f}"`)
    }
  }
  res.json({ valid: allWarnings.length === 0, warnings: allWarnings })
})

// Generate copies (Gemini)
app.post('/api/campanha/generate-copies-full', async (req, res) => {
  if (!googleAI) { res.status(503).json({ error: 'GOOGLE_API_KEY não configurada' }); return }
  const { briefing, campaignName, estruturasCount = 3, variacoesCount = 5 } = req.body
  const financialCtx = briefing?.valorInvestimento ? `Dados financeiros: Investimento ${briefing.valorInvestimento} | Renda ${briefing.rendaMensal}/mês | ROI ${briefing.roi} | Ocupação ${briefing.taxaOcupacao}` : ''
  const ESTRUTURA_DEFS = ['Estrutura 1: Foco em RETORNO FINANCEIRO (ROI, renda mensal, valorização)', 'Estrutura 2: Foco em LOCALIZAÇÃO E LIFESTYLE (praia, qualidade de vida, status)', 'Estrutura 3: Foco em GESTÃO PROFISSIONAL (tranquilidade, tecnologia, transparência)']
  const estruturaLines = ESTRUTURA_DEFS.slice(0, estruturasCount).join('\n- ')
  const totalCopies = estruturasCount * variacoesCount
  const prompt = `${SEAZONE_CONTEXT}\n\nCrie copies para uma campanha de marketing imobiliário com ${estruturasCount} ESTRUTURA${estruturasCount > 1 ? 'S' : ''} e ${variacoesCount} VARIAÇÃO${variacoesCount > 1 ? 'ÕES' : ''} cada (${totalCopies} copies no total).\n\nCampanha: ${campaignName || briefing?.produto}\nProduto: ${briefing?.produto}\nLocalização: ${briefing?.localizacao ?? 'não informada'}\nPúblico: ${briefing?.publicoAlvo}\nMensagens: ${(briefing?.mensagensPrincipais ?? []).join(', ')}\nTom: ${briefing?.tom || 'profissional'}\nDiferenciais: ${(briefing?.diferenciais ?? []).join(', ')}\nCTA base: ${briefing?.cta ?? 'Saiba mais'}\n${financialCtx}\n\nESTRUTURAS:\n- ${estruturaLines}\n\nRetorne APENAS JSON válido (sem markdown):\n{"copies":[{"estrutura":1,"variacao":1,"headline":"...","body":"...","cta":"...","videoRoteiro":"roteiro de 30-40 segundos para vídeo narrado"}]}`
  try {
    const r = await googleAI.models.generateContent({ model: 'gemini-2.5-flash', contents: [{ role: 'user', parts: [{ text: prompt }] }] })
    const raw = r.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
    res.json(JSON.parse(cleaned))
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

// Style analysis cache
const styleCache = new Map<string, string>()

// Generate creative (with optional reference-based style matching)
app.post('/api/campanha/generate-creative', async (req, res) => {
  try {
    const { copy, formato, referenceImages, assetsContext } = req.body
    const refs: string[] = Array.isArray(referenceImages) ? referenceImages : []
    const hasRef = refs.length > 0
    const contextHint = assetsContext ? `, ${assetsContext}` : ''
    const bgPrompt = `Seazone real estate Brazil, ${copy?.headline || ''}, luxury coastal property aerial drone view, natural sunlight, turquoise ocean${contextHint}, no people, no text overlay, no watermarks`

    let bgDataUrl = ''

    // Try reference-based styled generation first (FAL.AI + Gemini style analysis)
    if (hasRef && FAL_KEY) {
      const refKey = refs[0].slice(0, 60)
      let styleDesc = styleCache.get(refKey)
      if (!styleDesc && googleAI) {
        styleDesc = await analyzeReferenceStyle(refs[0])
        if (styleDesc) styleCache.set(refKey, styleDesc)
      }
      if (styleDesc) {
        try {
          bgDataUrl = await generateWithFalStyled(bgPrompt, formato ?? '4:5', styleDesc)
        } catch { /* fallback below */ }
      }
    }

    // Fallback to standard generation
    if (!bgDataUrl) {
      bgDataUrl = await generateBackground(bgPrompt, formato ?? '4:5').catch(() => '')
    }

    res.json({ imageDataUrl: bgDataUrl, generator: bgDataUrl ? (hasRef ? 'styled-ai' : 'ai-direct') : 'none' })
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

// Generate carousel (no template on Vercel — returns raw AI images)
app.post('/api/campanha/generate-carrossel-v2', async (req, res) => {
  try {
    const { slides } = req.body
    if (!slides?.length) { res.status(400).json({ error: 'slides obrigatório' }); return }
    const bgPrompt = 'Seazone real estate Brazil, luxury coastal property, aerial drone photo, turquoise ocean, no people, no text, no watermarks, square 1:1 aspect ratio'
    const bgDataUrl = await generateBackground(bgPrompt, '1:1').catch(() => '')
    const images = slides.map(() => bgDataUrl)
    res.json({ images })
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

// Generate image for campaign
app.post('/api/campanha/generate-image', async (req, res) => {
  const { copy, formato } = req.body
  const prompt = `Seazone real estate Brazil, ${copy.headline}, luxury property, natural light, architectural, no people, no text, no watermarks`
  try {
    const bgDataUrl = await generateBackground(prompt, formato ?? '1:1')
    res.json({ imageDataUrl: bgDataUrl, generator: 'ai-direct' })
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

// Copies (legacy endpoint)
app.post('/api/campanha/generate-copies', async (req, res) => {
  if (!googleAI) { res.status(503).json({ error: 'GOOGLE_API_KEY não configurada' }); return }
  const { briefing } = req.body
  try {
    const r = await googleAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: `${SEAZONE_CONTEXT}\n\nGere 3 variações de copy para:\nProduto: ${briefing?.produto}\nTom: ${briefing?.tom}\nCTA: ${briefing?.cta}\n\nRetorne JSON: {"copies":[{"headline":"...","body":"...","cta":"..."}]}` }] }],
    })
    const raw = r.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    res.json(JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim()))
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

// ── v2: Atendimento ───────────────────────────────────────────────────────────
app.post('/api/v2/atendimento', async (req, res) => {
  const { urls = [], text = '', referenceImages = [] } = req.body as { urls: string[]; text: string; referenceImages: string[] }
  if (!googleAI && !anthropic) { res.status(503).json({ error: 'Nenhuma API de IA configurada' }); return }

  const sourceList = [...urls.map((u: string) => `URL: ${u}`), text ? `Texto manual: ${text.slice(0, 2000)}` : ''].filter(Boolean).join('\n')
  const prompt = `${SEAZONE_CONTEXT}

Você é o Agente de Atendimento de uma agência de publicidade imobiliária.
Analise todas as fontes do briefing abaixo e organize as informações para a equipe criativa.

FONTES DO BRIEFING:
${sourceList}

Retorne APENAS JSON válido (sem markdown):
{
  "produto": "nome do empreendimento/produto",
  "publicoAlvo": "descrição do público",
  "mensagensPrincipais": ["mensagem 1", "mensagem 2", "mensagem 3"],
  "tom": "profissional|amigavel|urgente|luxo",
  "diferenciais": ["diferencial 1", "diferencial 2"],
  "cta": "chamada para ação principal",
  "observacoes": "observações e restrições importantes",
  "valorInvestimento": "valor ex: R$ 500.000",
  "rendaMensal": "valor ex: R$ 3.500/mês",
  "roi": "percentual ex: 8% ao ano",
  "taxaOcupacao": "percentual ex: 85%",
  "localizacao": "cidade/estado/bairro",
  "paginasLidas": ["url ou fonte 1", "url ou fonte 2"],
  "resumoExecutivo": "2-3 parágrafos resumindo tudo que foi lido e as principais diretrizes criativas"
}`

  try {
    let responseText = ''
    if (googleAI) {
      const parts: unknown[] = [{ text: prompt }]
      // Add reference image for visual style analysis
      if (referenceImages.length > 0) {
        const b64match = (referenceImages[0] as string).match(/^data:(image\/\w+);base64,(.+)$/)
        if (b64match) parts.unshift({ inlineData: { mimeType: b64match[1], data: b64match[2] } })
      }
      const r = await googleAI.models.generateContent({ model: 'gemini-2.5-flash', contents: [{ role: 'user', parts }] })
      responseText = r.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    } else if (anthropic) {
      const msg = await anthropic.messages.create({
        model: 'claude-opus-4-5', max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      })
      responseText = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
    }
    const cleaned = responseText.replace(/```json\n?|\n?```/g, '').trim()
    const briefing = JSON.parse(cleaned)
    briefing.paginasLidas = briefing.paginasLidas ?? urls
    res.json({ briefing })
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

// ── v2: Redator ───────────────────────────────────────────────────────────────
app.post('/api/v2/redator', async (req, res) => {
  const { briefing, estruturasCount = 3, variacoesCount = 3, incluirNarrado, incluirApresentadora, previousFeedback = [], campaignName } = req.body
  if (!googleAI && !anthropic) { res.status(503).json({ error: 'Nenhuma API de IA configurada' }); return }

  const feedbackSection = previousFeedback.length > 0
    ? `\n\nOBSERVAÇÕES DA REVISÃO ANTERIOR (evite repetir):\n${previousFeedback.map((f: string) => `- ${f}`).join('\n')}`
    : ''

  const totalCopies = estruturasCount * variacoesCount
  const ESTRUTURA_DEFS = [
    'Estrutura 1: Foco em RETORNO FINANCEIRO (ROI, renda mensal, valorização)',
    'Estrutura 2: Foco em LOCALIZAÇÃO E LIFESTYLE (praia, qualidade de vida, status)',
    'Estrutura 3: Foco em GESTÃO PROFISSIONAL (tranquilidade, tecnologia, transparência)',
  ]
  const estruturaLines = ESTRUTURA_DEFS.slice(0, estruturasCount).join('\n')
  const financialCtx = briefing?.valorInvestimento ? `\nDados financeiros: Investimento ${briefing.valorInvestimento} | Renda ${briefing.rendaMensal}/mês | ROI ${briefing.roi} | Ocupação ${briefing.taxaOcupacao}` : ''

  const roteiroSection = (incluirNarrado || incluirApresentadora) ? `
"roteirosNarrado": [
  {"estrutura": 1, "titulo": "...", "roteiro": "roteiro completo de 30-35s para narração", "duracao": "30-35s", "legenda": "legenda para redes sociais com emojis e hashtags"}
],
"roteirosApresentadora": [
  {"estrutura": 1, "titulo": "...", "roteiro": "roteiro completo de 20-25s para apresentadora falar olhando para câmera", "duracao": "20-25s", "legenda": "legenda para redes sociais"}
]` : '"roteirosNarrado": [], "roteirosApresentadora": []'

  const prompt = `${SEAZONE_CONTEXT}${feedbackSection}

Você é o Redator de uma agência de publicidade imobiliária.
Crie copies e roteiros para a campanha abaixo.

Campanha: ${campaignName || briefing?.produto}
Produto: ${briefing?.produto}
Localização: ${briefing?.localizacao}
Público: ${briefing?.publicoAlvo}
Mensagens: ${(briefing?.mensagensPrincipais ?? []).join(', ')}
Tom: ${briefing?.tom}
Diferenciais: ${(briefing?.diferenciais ?? []).join(', ')}
CTA base: ${briefing?.cta}${financialCtx}

ESTRUTURAS:
${estruturaLines}

Crie ${totalCopies} copies (${estruturasCount} estruturas × ${variacoesCount} variações) — headlines curtas e impactantes, corpo máx 2 linhas, CTA direto.
${incluirNarrado ? `Crie ${estruturasCount} roteiro(s) narrado com voz em off — descreva cenas e locução.` : ''}
${incluirApresentadora ? `Crie ${estruturasCount} roteiro(s) para apresentadora falar diretamente para a câmera.` : ''}
Crie 1 legenda por estrutura para publicação nas redes.

Retorne APENAS JSON válido (sem markdown):
{
  "copies": [{"estrutura": 1, "variacao": 1, "headline": "...", "body": "...", "cta": "..."}],
  ${roteiroSection},
  "legendas": ["legenda estrutura 1 completa com hashtags"]
}`

  try {
    let responseText = ''
    if (googleAI) {
      const r = await googleAI.models.generateContent({ model: 'gemini-2.5-flash', contents: [{ role: 'user', parts: [{ text: prompt }] }] })
      responseText = r.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    } else if (anthropic) {
      const msg = await anthropic.messages.create({
        model: 'claude-opus-4-5', max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      })
      responseText = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
    }
    const cleaned = responseText.replace(/```json\n?|\n?```/g, '').trim()
    res.json(JSON.parse(cleaned))
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

// ── v2: Diretor de Arte ────────────────────────────────────────────────────────
app.post('/api/v2/diretor', async (req, res) => {
  const { briefing, copies = [], creativesCount = 0, videosCount = 0, incluirImagens, incluirNarrado, incluirApresentadora } = req.body
  if (!googleAI && !anthropic) { res.status(503).json({ error: 'Nenhuma API de IA configurada' }); return }

  const expectedImagens = incluirImagens ? 'Imagens Feed+Story' : 'Imagens desativadas'
  const expectedVideo = incluirNarrado ? 'Vídeos narrados' : 'Vídeo narrado desativado'
  const expectedApres = incluirApresentadora ? 'Vídeos apresentadora' : 'Vídeo apresentadora desativado'

  const headlineSample = copies.slice(0, 3).map((c: { headline: string; body: string; cta: string }, i: number) => `${i + 1}. "${c.headline}" / "${c.body}" / CTA: "${c.cta}"`).join('\n')

  const prompt = `${SEAZONE_CONTEXT}

Você é o Diretor de Arte de uma agência de publicidade imobiliária.
Revise os materiais criados e avalie se estão alinhados com o briefing.

BRIEFING:
Produto: ${briefing?.produto}
Público: ${briefing?.publicoAlvo}
Mensagens: ${(briefing?.mensagensPrincipais ?? []).join(', ')}
Tom: ${briefing?.tom}
Diferenciais: ${(briefing?.diferenciais ?? []).join(', ')}
CTA: ${briefing?.cta}
Observações/Restrições: ${briefing?.observacoes}

MATERIAIS ENTREGUES:
- Imagens geradas: ${creativesCount} (esperado: ${expectedImagens})
- Vídeos gerados: ${videosCount} (esperado: ${expectedVideo} + ${expectedApres})
- Copies criadas: ${copies.length}

AMOSTRA DE COPIES:
${headlineSample}

Avalie se os materiais estão alinhados ao briefing, seguem as diretrizes da marca Seazone e nenhum elemento proibido foi usado.

Retorne APENAS JSON válido:
{
  "aprovado": true ou false,
  "score": 0-100,
  "pontos": ["ponto positivo 1", "ponto positivo 2"],
  "problemas": ["problema 1 se houver"],
  "sugestoes": ["sugestão de melhoria"],
  "relatorio": "parágrafo com avaliação geral da campanha"
}`

  try {
    let responseText = ''
    if (googleAI) {
      const r = await googleAI.models.generateContent({ model: 'gemini-2.5-flash', contents: [{ role: 'user', parts: [{ text: prompt }] }] })
      responseText = r.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    } else if (anthropic) {
      const msg = await anthropic.messages.create({
        model: 'claude-opus-4-5', max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      })
      responseText = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
    }
    const cleaned = responseText.replace(/```json\n?|\n?```/g, '').trim()
    res.json({ review: JSON.parse(cleaned) })
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

export default app
