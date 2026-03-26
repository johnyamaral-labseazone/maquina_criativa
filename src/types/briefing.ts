export interface Variacao {
  id: string
  fraseDestaque: string
  textosFixos: string[]
  backgroundImageIndex: number
}

export interface Estrutura {
  id: string
  nome: string
  pontosFortes: string[]
  variacoes: Variacao[]
}

export interface Briefing {
  estruturas: Estrutura[]
  driveLink: string
  referenceImage: string | null
  backgroundImages: string[]
  logoImage: string | null
  accentColor: string
}

export type FormatoExport = '4:5' | '9:16' | '1:1'

export interface SafeZone {
  top: number
  bottom: number
  left: number
  right: number
}

export function createVariacao(_index: number): Variacao {
  return {
    id: crypto.randomUUID(),
    fraseDestaque: '',
    textosFixos: [''],
    backgroundImageIndex: 0,
  }
}

export function createEstrutura(_index: number): Estrutura {
  return {
    id: crypto.randomUUID(),
    nome: '',
    pontosFortes: [],
    variacoes: Array.from({ length: 5 }, (_, i) => createVariacao(i)),
  }
}

export function createBriefing(): Briefing {
  return {
    estruturas: Array.from({ length: 3 }, (_, i) => createEstrutura(i)),
    driveLink: '',
    referenceImage: null,
    backgroundImages: [],
    logoImage: null,
    accentColor: '#F1605D',
  }
}
