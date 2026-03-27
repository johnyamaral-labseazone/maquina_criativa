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
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

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
const FIGMA_TOKEN    = sanitizeKey(process.env.FIGMA_TOKEN)

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
    '1:1': 'square_hd', '4:5': { width: 1080, height: 1350 }, '9:16': { width: 1080, height: 1920 }, '16:9': 'landscape_16_9',
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
// Image-to-image: generates a new image influenced by the reference image style
async function generateWithFalImg2Img(prompt: string, formato: string, referenceDataUrl: string, strength = 0.75): Promise<string> {
  if (!FAL_KEY) throw new Error('FAL_KEY não configurada')
  const result = await Promise.race([
    fal.subscribe('fal-ai/flux-general/image-to-image', {
      input: {
        image_url: referenceDataUrl,
        prompt,
        strength,
        image_size: falSize(formato),
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
        output_format: 'jpeg',
      },
    }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('FAL.AI img2img timeout')), 50000)),
  ]) as { data: { images: Array<{ url: string }> } }
  const imageUrl = result.data?.images?.[0]?.url
  if (!imageUrl) throw new Error('FAL.AI img2img sem imagem')
  const ir = await fetch(imageUrl, { signal: AbortSignal.timeout(20000) })
  return `data:image/jpeg;base64,${Buffer.from(await ir.arrayBuffer()).toString('base64')}`
}

async function generateWithFalKling(prompt: string, duration: number, model = 'fal-ai/kling-video/v2.1/standard/text-to-video'): Promise<string> {
  if (!FAL_KEY) throw new Error('FAL_KEY não configurada')
  const result = await fal.subscribe(model, {
    input: { prompt, duration: String(duration <= 5 ? 5 : 10), aspect_ratio: '9:16', negative_prompt: 'people, text, watermarks, low quality' },
  }) as { data: { video: { url: string } } }
  const videoUrl = result.data?.video?.url
  if (!videoUrl) throw new Error('FAL.AI Kling sem vídeo')
  // Return CDN URL directly — avoids /tmp persistence issues on serverless
  return videoUrl
}

// ── Google Veo video helper ───────────────────────────────────────────────────
async function generateWithVeo(prompt: string, durationSeconds: number): Promise<string> {
  if (!googleAI || !GOOGLE_KEY) throw new Error('GOOGLE_API_KEY não configurada')
  const TIMEOUT_MS = 55000
  let operation = await (googleAI as unknown as {
    models: { generateVideos(p: object): Promise<{ done?: boolean; name?: string; response?: { generatedVideos?: Array<{ video?: { uri?: string; videoBytes?: string; mimeType?: string } }> }; error?: { message?: string } }> }
    operations: { getVideosOperation(p: object): Promise<typeof operation> }
  }).models.generateVideos({
    model: 'veo-2.0-generate-001',
    source: { prompt: `${prompt}, 9:16 vertical format` },
    config: { numberOfVideos: 1, durationSeconds: durationSeconds <= 5 ? 5 : 8, aspectRatio: '9:16' },
  })
  const deadline = Date.now() + TIMEOUT_MS
  while (!operation.done) {
    if (Date.now() > deadline) throw new Error('Veo timeout 55s')
    await new Promise(r => setTimeout(r, 8000))
    operation = await (googleAI as unknown as {
      operations: { getVideosOperation(p: object): Promise<typeof operation> }
    }).operations.getVideosOperation({ operation })
  }
  if (operation.error?.message) throw new Error(`Veo: ${operation.error.message}`)
  const vid = operation.response?.generatedVideos?.[0]?.video
  if (!vid) throw new Error('Veo sem vídeo na resposta')
  // Prefer raw bytes if available
  if (vid.videoBytes) {
    const filename = `veo_${Date.now()}.mp4`
    fs.writeFileSync(path.join(TEMP_VIDEO_DIR, filename), Buffer.from(vid.videoBytes, 'base64'))
    return `/temp/videos/${filename}`
  }
  if (vid.uri) {
    // Download from Google AI file URI using API key
    const r = await fetch(`${vid.uri}?key=${GOOGLE_KEY}&alt=media`, { signal: AbortSignal.timeout(20000) })
    if (!r.ok) throw new Error(`Veo download ${r.status}`)
    const filename = `veo_${Date.now()}.mp4`
    fs.writeFileSync(path.join(TEMP_VIDEO_DIR, filename), Buffer.from(await r.arrayBuffer()))
    return `/temp/videos/${filename}`
  }
  throw new Error('Veo sem URI e sem bytes')
}

// ── Google image helpers ──────────────────────────────────────────────────────
function aspectHint(r: string) {
  const m: Record<string, string> = { '1:1': 'square 1:1', '9:16': 'vertical portrait 9:16', '4:5': 'vertical 4:5', '16:9': 'landscape 16:9' }
  return m[r] ?? 'square 1:1'
}
// Map our format strings to Imagen-compatible aspect ratios
function imagenAR(fmt: string): string {
  const m: Record<string, string> = { '1:1': '1:1', '9:16': '9:16', '16:9': '16:9', '4:5': '4:5', '3:4': '3:4', '4:3': '4:3' }
  return m[fmt] ?? '1:1'
}
type GenerateImagesResponse = { generatedImages?: Array<{ image?: { imageBytes?: string; mimeType?: string } }> }
async function generateWithGemini(prompt: string, aspectRatio: string): Promise<{ base64: string; mimeType: string }> {
  if (!googleAI) throw new Error('GOOGLE_API_KEY não configurada')
  // 1. Imagen 4 via generateImages API (best quality)
  for (const model of ['imagen-4.0-generate-001', 'imagen-3.0-generate-001', 'imagen-3.0-fast-generate-001']) {
    try {
      const resp = await (googleAI.models.generateImages as (p: object) => Promise<GenerateImagesResponse>)({
        model,
        prompt: `${prompt}, ${aspectHint(aspectRatio)}`,
        config: { numberOfImages: 1, aspectRatio: imagenAR(aspectRatio), outputMimeType: 'image/jpeg' },
      })
      const bytes = resp.generatedImages?.[0]?.image?.imageBytes
      if (!bytes) throw new Error('Sem bytes')
      return { base64: bytes, mimeType: 'image/jpeg' }
    } catch (err) {
      console.warn(`[gemini] ${model} falhou:`, String(err).slice(0, 80))
    }
  }
  // 2. Gemini 2.0 Flash multimodal image output (fallback)
  for (const model of ['gemini-2.0-flash-exp-image-generation', 'gemini-2.0-flash-preview-image-generation']) {
    try {
      const response = await googleAI.models.generateContent({
        model, contents: [{ role: 'user', parts: [{ text: `${prompt}, ${aspectHint(aspectRatio)}` }] }],
        config: { responseModalities: ['IMAGE', 'TEXT'] },
      })
      const parts = response.candidates?.[0]?.content?.parts ?? []
      const imagePart = parts.find((p: Record<string, unknown>) => p.inlineData) as { inlineData: { data: string; mimeType: string } } | undefined
      if (!imagePart?.inlineData?.data) throw new Error('Sem imagem')
      return { base64: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType ?? 'image/png' }
    } catch (err) {
      console.warn(`[gemini] ${model} falhou:`, String(err).slice(0, 80))
    }
  }
  throw new Error('Gemini image generation falhou em todos os modelos')
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
        { text: `Analyze this real estate advertisement image. Describe the visual style for AI image generation in English: background photo style (aerial/ground/interior, lighting, colors, composition), color palette, overall mood. Focus ONLY on the background photography style, not text overlays. One concise paragraph in English.` },
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

// ── SVG gradient fallback (always works, Seazone branded) ─────────────────────
function generateSvgFallback(prompt: string, formato: string): string {
  const isStory = formato === '9:16'
  const w = 1080, h = isStory ? 1920 : 1350
  const seed = prompt.length % 3
  const colors = [
    ['#00143D', '#002a7a', '#0055FF'],
    ['#00143D', '#001a50', '#0055FF'],
    ['#00143D', '#001530', '#0055FF'],
  ][seed]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${colors[0]}"/><stop offset="50%" stop-color="${colors[1]}"/><stop offset="100%" stop-color="${colors[2]}" stop-opacity="0.8"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/></svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

// ── Background image generator — FAL.AI primary ───────────────────────────────
// Priority: FAL.AI Flux Dev → Replicate → Freepik Mystic
async function generateBackground(prompt: string, formato: string): Promise<string> {
  // 1. FAL.AI Flux Dev — primary, high quality
  if (FAL_KEY) {
    try {
      console.log(`[bg] FAL.AI Flux Dev — formato: ${formato}`)
      const img = await generateWithFalFlux(prompt, formato, 'fal-ai/flux/dev')
      console.log('[bg] ✅ FAL.AI Flux Dev OK')
      return img
    } catch (err) {
      console.warn('[bg] FAL.AI falhou:', String(err).slice(0, 120))
    }
  }
  // 2. Replicate Flux Schnell
  if (replicate) {
    try {
      console.log(`[bg] Replicate Flux — formato: ${formato}`)
      const output = await replicate.run('black-forest-labs/flux-schnell', {
        input: { prompt, aspect_ratio: formato === '9:16' ? '9:16' : formato === '1:1' ? '1:1' : '4:5', output_format: 'jpg', output_quality: 80, num_outputs: 1 },
      })
      console.log('[bg] ✅ Replicate OK')
      return `data:image/jpeg;base64,${await replicateToBase64(output)}`
    } catch (err) {
      console.warn('[bg] Replicate falhou:', String(err).slice(0, 120))
    }
  }
  // 3. Freepik Mystic — fallback
  if (FREEPIK_KEY) {
    try {
      console.log('[bg] Freepik Mystic...')
      const img = await generateWithMystic(prompt, formato)
      console.log('[bg] ✅ Freepik OK')
      return img
    } catch (err) {
      console.warn('[bg] Freepik falhou:', String(err).slice(0, 120))
    }
  }
  // 4. SVG gradient fallback — always returns something
  console.warn('[bg] ⚠️ Todos os geradores falharam — usando fallback SVG')
  return generateSvgFallback(prompt, formato)
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
IDENTIDADE VISUAL SEAZONE (aplicar em todos os criativos):
- Cores: Azul #0055FF (caixa ROI, destaques, elementos interativos), Navy #00143D (fundo do painel), Coral #FC6058 (pin de localização, highlight "retorno líquido", barra de assinatura)
- Tipografia: Helvetica — pesos Thin, Light, Medium, Bold. Nunca usar outras fontes.
- Layout padrão: foto aérea do imóvel na metade superior → painel navy escuro (#00143D) na metade inferior
- Hierarquia do painel (cima→baixo): pílula branca com localização (ponto coral + texto navy) + logo "seazone" → badge CTA (borda branca translúcida) + copy body → caixa ROI azul (#0055FF) com % grande + "de retorno líquido" (highlight coral) + período → disclaimer legal
- Assinatura de marca: barra coral #FC6058 de 3px na base de toda peça
- Pílulas e badges: fundo branco + texto navy (localização) ou fundo translúcido + texto branco (status/CTA)

REFERÊNCIA DE DESIGN — ESTA APLICAÇÃO:
O agente designer deve usar como referência a própria identidade visual desta plataforma de automação Seazone. A interface usa: fundo escuro navy (#00143D), cards com borda sutil (rgba branco 8%), azul #0055FF nos CTAs principais, coral #FC6058 em badges de destaque e ícones de ação, tipografia Helvetica/Inter sem serifa, espaçamentos generosos, bordas arredondadas (border-radius 12-20px), hierarquia clara com títulos em branco e textos secundários em branco 60%. Todo criativo gerado deve respeitar essa linguagem visual — sóbria, premium, orientada a dados, sem excessos decorativos.

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

// ── Biblioteca de produtos — contexto visual específico por empreendimento ────
interface ProductEntry {
  triggers: string[]
  figmaUrl: string
  designerContext: string
  assetsFolder?: string  // subfolder in public/assets/products/
}

// Reads reference images from public/assets/products/<folder>/ (PNG + JPG)
// Returns array of base64 data URLs. Tries referenciavisual first, then other images.
function loadProductAssets(folder: string): string[] {
  const assetsDir = path.resolve(__dirname, '..', 'public', 'assets', 'products', folder)
  if (!fs.existsSync(assetsDir)) return []
  const PRIORITY = ['referenciavisual.jpg', 'referenciavisual.png', 'fachada.png', 'fachada.jpg', 'foto-aerea.png', 'foto-aerea.jpg', 'rooftop.png', 'rooftop.jpg']
  const found: string[] = []
  for (const name of PRIORITY) {
    const fp = path.join(assetsDir, name)
    if (!fs.existsSync(fp)) continue
    const ext = path.extname(name).toLowerCase()
    const mime = ext === '.png' ? 'image/png' : 'image/jpeg'
    try {
      const b64 = fs.readFileSync(fp).toString('base64')
      found.push(`data:${mime};base64,${b64}`)
      if (found.length >= 3) break
    } catch { /* skip unreadable file */ }
  }
  return found
}

const PRODUCT_LIBRARY: ProductEntry[] = [
  {
    triggers: ['novo campeche ii', 'novo campeche spot ii'],
    assetsFolder: 'novo-campeche-spot-ii',
    figmaUrl: 'https://www.figma.com/design/TuwWtcUvNB5uwi4v03qvAK/Criativos---Est%C3%A1ticos---Bonito-II---SZI',
    designerContext: `
PRODUTO ATIVO: NOVO CAMPECHE SPOT II — Seazone

IDENTIDADE VISUAL DO PRODUTO:
- Nome: "NOVO CAMPECHE II" com submarca "SPOT" em destaque
- Logo principal: ícone de casa estilizado em coral (#FC6058) com círculo interno, seguido de texto branco bold em caixa alta
- Logo secundário: círculo coral sólido (o "O" do SPOT) — elemento icônico e minimalista do produto
- Tipografia do produto: caixa alta, bold, espaçamento amplo
- Paleta extra (além da Seazone padrão): coral predominante do SPOT logo (#FC6058), concreto cinza-médio, madeira ripada natural tom cobre/mel

ARQUITETURA DO EMPREENDIMENTO:
- Fachada em concreto aparente com ripas verticais de madeira cobre/mel aquecendo a textura
- Rooftop com piscina de borda infinita e vista aberta para a vegetação e oceano ao fundo
- Cobertura verde (greenery) abundante na fachada e terraços — vegetação tropical exuberante
- Branding "seazone" em letras grandes em relevo no terraço superior
- Térreo com vidro do piso ao teto, porcelanato claro, ambiente de recepção sofisticado
- Tom arquitetônico: industrial sofisticado + tropical — muito característico do Campeche

FOTOS DO IMÓVEL (usar como backgrounds):
1. FOTO AÉREA: vista drone do terreno no Novo Campeche com marcação "Acesso à praia" em balão branco, ponto coral indicando o imóvel e a praia ao fundo. SPOT logo como overlay inferior direito. Mar turquesa do Atlântico visível. Vegetação tropical ao redor.
2. ROOFTOP: piscina de borda infinita com dois espreguiçadeiras, céu dramático em tons laranja/rosa/roxo do pôr do sol. Vegetação e edifícios ao fundo com mar ao horizonte. Luz quente e atmosfera premium.
3. FACHADA: render arquitetônico frontal completo. Fachada de concreto + ripas de madeira cobre. Logo seazone no topo. Planta tropical na entrada. Iluminação interna aquecida visível. Bicicletário e calçamento articulado no térreo.

LOCALIZAÇÃO:
- Bairro: Novo Campeche, Florianópolis/SC
- Acesso a pé à Praia do Campeche (marcado no mapa aéreo com trajetória pontilhada)
- Vista aérea: edificio centralizado entre vegetação, com o oceano Atlântico ao fundo
- Região premium com imóveis de alto padrão ao redor

DIRETRIZES CRIATIVAS ESPECÍFICAS:
- Usar foto aérea para peças de localização (Estrutura 2 — Localização e Lifestyle)
- Usar rooftop para peças de ROI e retorno financeiro (Estrutura 1)
- Usar fachada para peças de gestão e confiança (Estrutura 3)
- Sempre incluir o logo "NOVO CAMPECHE II SPOT" na composição quando possível
- Coral do SPOT logo é idêntico ao coral Seazone #FC6058 — reforçar esta cor
- Enfatizar: acesso à praia a pé, rooftop com piscina, gestão completa Seazone, renda de temporada
`,
  },
]

function detectProductContext(nomeProduto: string): ProductEntry | null {
  if (!nomeProduto) return null
  const lower = nomeProduto.toLowerCase()
  return PRODUCT_LIBRARY.find(p => p.triggers.some(t => lower.includes(t))) ?? null
}

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

// Video generation (FAL.AI → Freepik → Google Veo)
app.post('/api/ai/generate-video', async (req, res) => {
  if (!FAL_KEY && !FREEPIK_KEY && !googleAI) { res.status(503).json({ error: 'Nenhuma API de vídeo configurada' }); return }
  const { prompt, durationSeconds = 5, tipo = 'narrado', assetsContext } = req.body
  const narradoContext = assetsContext ? ` ${assetsContext}` : ''
  const basePrompt = tipo === 'apresentadora'
    ? `${prompt}, professional presenter speaking to camera, Seazone real estate, coastal property backdrop, cinematic`
    : `${prompt}${narradoContext}, professional real estate cinematic footage, coastal property, natural lighting, no people, no text`
  if (FAL_KEY) {
    try {
      console.log('[video] FAL.AI Kling...')
      const v = await generateWithFalKling(basePrompt, durationSeconds)
      console.log('[video] ✅ FAL.AI OK')
      res.json({ videoUrl: v, generator: 'fal-kling-v2.1' }); return
    } catch (err) { console.warn('[video] FAL.AI falhou:', String(err).slice(0, 120)) }
  }
  if (FREEPIK_KEY) {
    try {
      console.log('[video] Freepik Kling...')
      const v = await generateWithKling(basePrompt, durationSeconds)
      console.log('[video] ✅ Freepik OK')
      res.json({ videoUrl: v, generator: 'kling' }); return
    } catch (err) { console.warn('[video] Freepik falhou:', String(err).slice(0, 120)) }
  }
  if (googleAI) {
    try {
      console.log('[video] Google Veo 2...')
      const v = await generateWithVeo(basePrompt, durationSeconds)
      console.log('[video] ✅ Veo OK')
      res.json({ videoUrl: v, generator: 'google-veo2' }); return
    } catch (err) { console.warn('[video] Veo falhou:', String(err).slice(0, 120)) }
  }
  res.status(500).json({ error: 'Todas as APIs de vídeo falharam (FAL.AI, Freepik, Google Veo)' })
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

// ── Async video: start job (returns requestId immediately, no timeout risk) ───
const VIDEO_MODEL = 'fal-ai/kling-video/v2.1/standard/text-to-video'
app.post('/api/ai/start-video', async (req, res) => {
  if (!FAL_KEY) { res.status(503).json({ error: 'FAL_KEY não configurada' }); return }
  const { prompt, durationSeconds = 5, tipo = 'narrado', assetsContext } = req.body
  const narradoContext = assetsContext ? ` ${assetsContext}` : ''
  const basePrompt = tipo === 'apresentadora'
    ? `${prompt}, professional presenter speaking to camera, Seazone real estate, coastal property backdrop, cinematic, no text overlay`
    : `${prompt}${narradoContext}, professional real estate cinematic footage, coastal property, natural lighting, no people, no text overlay`
  try {
    const { request_id } = await fal.queue.submit(VIDEO_MODEL, {
      input: { prompt: basePrompt, duration: String(durationSeconds <= 5 ? 5 : 10), aspect_ratio: '9:16', negative_prompt: 'people, text, watermarks, low quality' },
    }) as { request_id: string }
    console.log(`[video-async] job iniciado: ${request_id}`)
    res.json({ requestId: request_id, model: VIDEO_MODEL })
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

// ── Async video: poll job status / retrieve result ────────────────────────────
app.post('/api/ai/poll-video', async (req, res) => {
  if (!FAL_KEY) { res.status(503).json({ error: 'FAL_KEY não configurada' }); return }
  const { requestId, model = VIDEO_MODEL } = req.body
  if (!requestId) { res.status(400).json({ error: 'requestId obrigatório' }); return }
  try {
    const status = await fal.queue.status(model, { requestId, logs: false }) as { status: string }
    console.log(`[video-async] ${requestId} → ${status.status}`)
    if (status.status === 'COMPLETED') {
      const result = await fal.queue.result(model, { requestId }) as { data: { video: { url: string } } }
      const videoUrl = result.data?.video?.url
      if (!videoUrl) { res.status(500).json({ error: 'FAL sem URL no resultado' }); return }
      res.json({ status: 'done', videoUrl })
    } else if (status.status === 'FAILED') {
      res.json({ status: 'error', error: 'FAL.AI job falhou' })
    } else {
      // IN_QUEUE or IN_PROGRESS
      res.json({ status: 'processing' })
    }
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

// ── Google Drive image fetcher ────────────────────────────────────────────────
function extractDriveFolderId(url: string): string | null {
  const m = url.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  return m?.[1] ?? null
}

// List images in a public Drive folder (returns proxy URLs to keep API key server-side)
app.post('/api/campanha/fetch-drive-images', async (req, res) => {
  if (!GOOGLE_KEY) { res.status(503).json({ error: 'GOOGLE_API_KEY não configurada' }); return }
  const { driveUrl } = req.body as { driveUrl?: string }
  const folderId = extractDriveFolderId(driveUrl ?? '')
  if (!folderId) { res.status(400).json({ error: 'URL do Google Drive inválida — use uma pasta pública' }); return }
  try {
    const q = encodeURIComponent(`'${folderId}' in parents and mimeType contains 'image/' and trashed=false`)
    const listUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType)&pageSize=20&key=${GOOGLE_KEY}`
    const r = await fetch(listUrl, { signal: AbortSignal.timeout(10000) })
    const d = await r.json() as { files?: Array<{ id: string; name: string; mimeType: string }>; error?: { message?: string } }
    if (!r.ok) throw new Error(d.error?.message ?? `Drive API ${r.status}`)
    const files = (d.files ?? []).filter(f => f.mimeType.startsWith('image/'))
    const imageUrls = files.slice(0, 10).map(f => `/api/campanha/drive-image/${f.id}`)
    console.log(`[drive] ${imageUrls.length} imagem(ns) na pasta ${folderId}`)
    res.json({ imageUrls, count: imageUrls.length })
  } catch (err) {
    console.error('[drive] fetch-drive-images falhou:', String(err))
    res.status(500).json({ error: String(err) })
  }
})

// Proxy Drive file download — keeps GOOGLE_KEY server-side, adds CORS headers
app.get('/api/campanha/drive-image/:fileId', async (req, res) => {
  if (!GOOGLE_KEY) { res.status(503).send('GOOGLE_API_KEY não configurada'); return }
  try {
    const { fileId } = req.params
    const r = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&key=${GOOGLE_KEY}`, {
      signal: AbortSignal.timeout(25000),
    })
    if (!r.ok) { res.status(r.status).send(`Drive download ${r.status}`); return }
    res.setHeader('Content-Type', r.headers.get('content-type') ?? 'image/jpeg')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.send(Buffer.from(await r.arrayBuffer()))
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

// ── Figma integration ─────────────────────────────────────────────────────────
// Extracts file key from any Figma URL (file, design, prototype)
function parseFigmaUrl(url: string): { fileKey: string; nodeId: string | null } | null {
  const m = url.match(/figma\.com\/(?:file|design|proto)\/([a-zA-Z0-9]+)/)
  if (!m) return null
  const fileKey = m[1]
  let nodeId: string | null = null
  try {
    const raw = new URL(url).searchParams.get('node-id')
    if (raw) nodeId = raw.replace(/-/g, ':')   // "123-456" → "123:456" (Figma API format)
  } catch { /* ok */ }
  return { fileKey, nodeId }
}

// Fetch frames from a Figma file and return as base64 images
app.post('/api/campanha/fetch-figma-assets', async (req, res) => {
  if (!FIGMA_TOKEN) { res.status(503).json({ error: 'FIGMA_TOKEN não configurado — adicione a variável de ambiente' }); return }
  const { figmaUrl } = req.body as { figmaUrl?: string }
  if (!figmaUrl) { res.status(400).json({ error: 'figmaUrl obrigatório' }); return }

  const parsed = parseFigmaUrl(figmaUrl)
  if (!parsed) { res.status(400).json({ error: 'URL do Figma inválida. Use a URL do arquivo ou de um frame específico.' }); return }
  const { fileKey, nodeId } = parsed

  const headers = { 'X-Figma-Token': FIGMA_TOKEN }

  try {
    let nodeIds: string[] = []

    if (nodeId) {
      // Specific frame/component requested
      nodeIds = [nodeId]
    } else {
      // Fetch file structure and get top-level frames from first page
      const fileResp = await fetch(`https://api.figma.com/v1/files/${fileKey}?depth=2`, {
        headers, signal: AbortSignal.timeout(20000),
      })
      if (!fileResp.ok) {
        const err = await fileResp.json() as { message?: string }
        throw new Error(err.message ?? `Figma API ${fileResp.status}`)
      }
      const fileData = await fileResp.json() as { document?: { children?: Array<{ children?: Array<{ id: string; type: string; name: string }> }> } }
      const firstPage = fileData.document?.children?.[0]
      const frames = (firstPage?.children ?? [])
        .filter(n => ['FRAME', 'COMPONENT', 'COMPONENT_SET', 'SECTION'].includes(n.type))
        .slice(0, 12)
      nodeIds = frames.map(n => n.id)
    }

    if (!nodeIds.length) {
      res.status(404).json({ error: 'Nenhum frame encontrado no arquivo Figma. Verifique se o arquivo tem frames na primeira página.' })
      return
    }

    // Export frames as PNG images
    const exportUrl = `https://api.figma.com/v1/images/${fileKey}?ids=${encodeURIComponent(nodeIds.join(','))}&format=png&scale=1.5`
    const exportResp = await fetch(exportUrl, { headers, signal: AbortSignal.timeout(20000) })
    if (!exportResp.ok) {
      const err = await exportResp.json() as { message?: string }
      throw new Error(err.message ?? `Figma export ${exportResp.status}`)
    }
    const exportData = await exportResp.json() as { images?: Record<string, string | null>; err?: string }
    if (exportData.err) throw new Error(`Figma: ${exportData.err}`)

    const imageUrls = Object.values(exportData.images ?? {}).filter((u): u is string => !!u)
    if (!imageUrls.length) {
      res.status(404).json({ error: 'Figma não conseguiu exportar os frames. Tente com um arquivo menor.' })
      return
    }

    // Download images from Figma's S3 URLs and convert to base64 (URLs expire)
    const base64Images = (
      await Promise.all(
        imageUrls.slice(0, 8).map(async (url) => {
          try {
            const r = await fetch(url, { signal: AbortSignal.timeout(15000) })
            if (!r.ok) return null
            const buf = await r.arrayBuffer()
            return `data:image/png;base64,${Buffer.from(buf).toString('base64')}`
          } catch { return null }
        })
      )
    ).filter((b): b is string => !!b)

    console.log(`[figma] ${base64Images.length} frame(s) exportado(s) de ${fileKey}`)
    res.json({ images: base64Images, count: base64Images.length })
  } catch (err) {
    console.error('[figma] fetch-figma-assets falhou:', String(err))
    res.status(500).json({ error: String(err) })
  }
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
    const { copy, formato, referenceImages, assetsContext, produto } = req.body

    // 1. User-provided references (uploaded in Assets tab)
    const userRefs: string[] = Array.isArray(referenceImages) ? referenceImages : []

    // 2. Detect product and load product assets from disk
    const productEntry = detectProductContext(produto ?? copy?.headline ?? '')
    const productAssets: string[] = productEntry?.assetsFolder
      ? loadProductAssets(productEntry.assetsFolder)
      : []

    // Priority: user refs → product assets from disk → text-only
    const allRefs = userRefs.length > 0 ? userRefs : productAssets
    const hasRef  = allRefs.length > 0

    const contextHint = assetsContext ? `, ${assetsContext}` : ''
    const bgPrompt = `Seazone luxury real estate Florianópolis Brazil, ${copy?.headline || ''}, aerial drone photography of coastal residential property, rooftop pool or beach access, turquoise Atlantic ocean, lush tropical vegetation, modern architecture, golden hour warm natural lighting${contextHint}, professional advertisement photography, ultra high quality, no people, no text, no watermarks, no UI elements`

    let bgDataUrl = ''
    let generator  = 'ai-direct'

    // ── Strategy A: FAL.AI image-to-image with reference ──────────────────────
    if (hasRef && FAL_KEY) {
      const refImage = allRefs[0]  // referenciavisual.jpg is first in priority
      try {
        console.log('[creative] FAL.AI img2img with reference', userRefs.length > 0 ? '(user upload)' : '(product asset)')
        bgDataUrl = await generateWithFalImg2Img(bgPrompt, formato ?? '4:5', refImage, 0.72)
        generator = userRefs.length > 0 ? 'img2img-user-ref' : 'img2img-product-asset'
        console.log('[creative] ✅ img2img OK')
      } catch (err) {
        console.warn('[creative] img2img falhou, tentando styled prompt:', String(err).slice(0, 100))
      }
    }

    // ── Strategy B: FAL.AI text prompt enriched with Gemini style analysis ────
    if (!bgDataUrl && hasRef && googleAI) {
      const refKey = allRefs[0].slice(0, 60)
      let styleDesc = styleCache.get(refKey)
      if (!styleDesc) {
        styleDesc = await analyzeReferenceStyle(allRefs[0])
        if (styleDesc) styleCache.set(refKey, styleDesc)
      }
      if (styleDesc && FAL_KEY) {
        try {
          bgDataUrl = await generateWithFalStyled(bgPrompt, formato ?? '4:5', styleDesc)
          generator = 'styled-prompt'
        } catch { /* fallback below */ }
      }
    }

    // ── Strategy C: standard generation with product context in prompt ─────────
    if (!bgDataUrl) {
      const productHint = productEntry ? `. Visual style: ${productEntry.designerContext.slice(0, 300)}` : ''
      bgDataUrl = await generateBackground(`${bgPrompt}${productHint}`, formato ?? '4:5').catch(() => '')
      generator = 'ai-direct'
    }

    res.json({
      imageDataUrl: bgDataUrl,
      generator: bgDataUrl ? generator : 'none',
      product: productEntry?.triggers[0] ?? null,
      usedProductAssets: productAssets.length > 0,
    })
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
  const { briefing, estruturasCount = 3, variacoesCount = 3, narradoCount = 1, apresentadoraCount = 1, incluirNarrado, incluirApresentadora, previousFeedback = [], campaignName } = req.body
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

  const totalNarrado = incluirNarrado ? estruturasCount * narradoCount : 0
  const totalApres = incluirApresentadora ? estruturasCount * apresentadoraCount : 0
  const roteiroSection = (incluirNarrado || incluirApresentadora) ? `
"roteirosNarrado": ${incluirNarrado ? `[${Array.from({ length: totalNarrado }, (_, i) => `{"estrutura": ${Math.floor(i / narradoCount) + 1}, "titulo": "...", "roteiro": "roteiro completo de 30-35s para narração voz em off — descreva cenas e texto da locução", "duracao": "30-35s", "legenda": "legenda para redes sociais com emojis e hashtags"}`).join(', ')}]` : '[]'},
"roteirosApresentadora": ${incluirApresentadora ? `[${Array.from({ length: totalApres }, (_, i) => `{"estrutura": ${Math.floor(i / apresentadoraCount) + 1}, "titulo": "...", "roteiro": "roteiro completo de 20-25s para apresentadora falar direto para câmera de forma natural e envolvente", "duracao": "20-25s", "legenda": "legenda para redes sociais"}`).join(', ')}]` : '[]'}` : '"roteirosNarrado": [], "roteirosApresentadora": []'

  const productEntry = detectProductContext(briefing?.produto ?? '')
  const productCtx = productEntry ? `\n\nCONTEXTO ESPECÍFICO DO PRODUTO:${productEntry.designerContext}` : ''

  const prompt = `${SEAZONE_CONTEXT}${productCtx}${feedbackSection}

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
