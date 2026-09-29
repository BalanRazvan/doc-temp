import type { NewSavedArticle } from './types.ts'

export type SearchResults = {
  total: number
  articles: NewSavedArticle[]
}

export function searchUrl(query: string): string {
  const params = new URLSearchParams({ query, format: 'json', resultType: 'core', pageSize: '25' })
  return `https://www.ebi.ac.uk/europepmc/webservices/rest/search?${params}`
}

function field(value: unknown, key: string): unknown {
  if (typeof value !== 'object' || value === null) return undefined
  return (value as { [key: string]: unknown })[key]
}

function text(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() === '') return null
  return value.trim()
}

export function readSearch(body: unknown): SearchResults | null {
  const total = field(body, 'hitCount')
  const records = field(field(body, 'resultList'), 'result')
  if (typeof total !== 'number' || !Array.isArray(records)) return null

  const articles: NewSavedArticle[] = []
  for (const record of records) {
    const source = text(field(record, 'source'))
    const id = text(field(record, 'id'))
    const title = text(field(record, 'title'))
    if (!source || !id || !title) continue
    const year = text(field(record, 'pubYear'))
    articles.push({
      external_id: `${source}:${id}`,
      title: title.replaceAll('&lt;', '<').replaceAll('&gt;', '>'),
      authors: text(field(record, 'authorString')),
      journal:
        text(field(field(field(record, 'journalInfo'), 'journal'), 'title')) ??
        text(field(field(record, 'bookOrReportDetails'), 'publisher')),
      year: year !== null && /^\d{4}$/.test(year) ? Number(year) : null,
      abstract: text(field(record, 'abstractText')),
      url: `https://europepmc.org/article/${source}/${id}`,
    })
  }
  return { total, articles }
}
