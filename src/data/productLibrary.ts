/**
 * Biblioteca de produtos Seazone — contexto visual e assets por empreendimento.
 * Injetado automaticamente no agente Designer quando o produto do briefing faz match.
 */

export interface ProductAsset {
  /** Caminhos relativos a /public/assets/products/{slug}/ */
  fotoAerea?: string
  rooftop?: string
  fachada?: string
  logo?: string
  logoSpot?: string
}

export interface ProductConfig {
  /** Termos que devem estar no nome do produto para ativar este contexto (case-insensitive) */
  triggers: string[]
  slug: string
  nome: string
  assets: ProductAsset
  /** Contexto visual rico para o agente Designer */
  designerContext: string
  /** URL do projeto Figma de referência (sobrescreve o padrão) */
  figmaUrl?: string
}

export const PRODUCT_LIBRARY: ProductConfig[] = [
  {
    triggers: ['novo campeche ii', 'novo campeche spot ii'],
    slug: 'novo-campeche-spot-ii',
    nome: 'Novo Campeche Spot II',
    figmaUrl: 'https://www.figma.com/design/TuwWtcUvNB5uwi4v03qvAK/Criativos---Est%C3%A1ticos---Bonito-II---SZI',
    assets: {
      fotoAerea: '/assets/products/novo-campeche-spot-ii/foto-aerea.jpg',
      rooftop: '/assets/products/novo-campeche-spot-ii/rooftop.jpg',
      fachada: '/assets/products/novo-campeche-spot-ii/fachada.jpg',
      logo: '/assets/products/novo-campeche-spot-ii/logo.png',
      logoSpot: '/assets/products/novo-campeche-spot-ii/logo-spot.png',
    },
    designerContext: `
PRODUTO ATIVO: NOVO CAMPECHE SPOT II — Seazone

IDENTIDADE VISUAL DO PRODUTO:
- Nome: "NOVO CAMPECHE II" com submarca "SPOT" em destaque
- Logo principal: ícone de casa estilizado em coral (#FC6058) com círculo interno, seguido de texto branco bold
- Logo secundário: círculo coral sólido (o "O" do SPOT) — elemento icônico do produto
- Tipografia do produto: caixa alta, bold, espaçamento amplo
- Paleta extra (além da Seazone padrão): coral predominante do SPOT logo, concreto cinza, madeira ripada natural

ARQUITETURA E ESTÉTICA DO EMPREENDIMENTO:
- Edifício contemporâneo com fachada em concreto aparente + ripas de madeira vertical aquecendo a textura
- Rooftop com piscina de borda infinita e vista para a vegetação e oceano
- Cobertura verde (greenery) abundante na fachada e terraços
- Branding "seazone" em letras grandes no terraço superior
- Térreo com elementos de mármore/porcelanato claro, vidro do piso ao teto
- Tom arquitetônico: industrial sofisticado + tropical — muito característico do Campeche

LOCALIZAÇÃO PRIVILEGIADA:
- Bairro: Novo Campeche, Florianópolis/SC
- Acesso direto à praia do Campeche (a pé) — marcado com ponto coral no mapa aéreo
- Vista aérea mostra edifício cercado de vegetação tropical com o oceano Atlântico ao fundo
- Região premium com imóveis de alto padrão ao redor

FOTOS DE REFERÊNCIA DISPONÍVEIS:
1. Foto aérea: mostra a localização exata do edifício com marcação "Acesso à praia" e overlay do logo SPOT
2. Rooftop ao pôr do sol: piscina de borda infinita com céu em tons laranja/rosa, vegetação e oceano ao fundo
3. Render da fachada: visão frontal completa com branding seazone no topo, ripas de madeira, greenery

DIRETRIZES CRIATIVAS PARA ESTE PRODUTO:
- Usar a foto aérea como background principal para peças de localização (Estrutura 2)
- Usar o rooftop ao pôr do sol para peças de lifestyle e ROI (Estruturas 1 e 3)
- Sempre incluir o logo "NOVO CAMPECHE II SPOT" na composição
- O coral do SPOT logo deve complementar o coral Seazone #FC6058
- Enfatizar: praia a pé, rooftop, gestão Seazone, renda de temporada
- Tom visual: premium, contemporâneo, tropical — não praieiro genérico
`,
  },
]

/**
 * Detecta qual produto do briefing faz match na biblioteca.
 * Retorna null se nenhum produto for reconhecido.
 */
export function detectProduct(nomeProduto: string): ProductConfig | null {
  if (!nomeProduto) return null
  const lower = nomeProduto.toLowerCase()
  return PRODUCT_LIBRARY.find(p => p.triggers.some(t => lower.includes(t))) ?? null
}
