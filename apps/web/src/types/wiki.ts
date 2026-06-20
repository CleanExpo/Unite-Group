export interface WikiPage {
  id: string
  title: string
  content: string
  tags: string[]
  word_count: number
  updated_at: string
}

export interface WikiPageSummary {
  id: string
  title: string
  tags: string[]
  word_count: number
  updated_at: string
}
