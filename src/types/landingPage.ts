export interface TextBlock {
  id: string
  type: 'text'
  content: string
  fontSize: number
  fontWeight: 'normal' | 'bold' | '500'
  color: string
  align: 'left' | 'center' | 'right'
  maxWidth?: number
}

export interface ImageBlock {
  id: string
  type: 'image'
  src: string
  alt: string
  width: number
  height: number
  maxWidth?: number
}

export interface CTABlock {
  id: string
  type: 'cta'
  text: string
  url: string
  buttonColor: string
  textColor: string
  size: 'sm' | 'md' | 'lg'
}

export interface Block {
  id: string
  order: number
  type: 'text' | 'image' | 'cta' | 'spacer'
  data: TextBlock | ImageBlock | CTABlock | { type: 'spacer'; height: number }
  paddingTop: number
  paddingBottom: number
  backgroundColor?: string
}

export interface LandingPage {
  id: string
  name: string
  productName: string
  description: string
  blocks: Block[]
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  createdAt: string
  updatedAt: string
  thumbnail?: string
  published: boolean
}

export interface LandingPageState {
  pages: LandingPage[]
  currentPageId: string | null
  addPage: (page: LandingPage) => void
  updatePage: (id: string, page: Partial<LandingPage>) => void
  deletePage: (id: string) => void
  setCurrentPage: (id: string) => void
  duplicatePage: (id: string) => void
  addBlock: (pageId: string, block: Block) => void
  updateBlock: (pageId: string, blockId: string, block: Partial<Block>) => void
  deleteBlock: (pageId: string, blockId: string) => void
  reorderBlocks: (pageId: string, blocks: Block[]) => void
}
