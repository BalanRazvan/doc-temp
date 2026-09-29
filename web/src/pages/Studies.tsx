import { useEffect, useRef, useState } from 'react'
import type { SubmitEvent } from 'react'
import Markup from '../components/Markup.tsx'
import { readSearch, searchUrl } from '../lib/europepmc.ts'
import type { SearchResults } from '../lib/europepmc.ts'
import { useStore } from '../lib/store.ts'
import type { Status } from '../lib/store.ts'
import type { NewSavedArticle, SavedArticle } from '../lib/types.ts'
import { buttonClass, inputClass, labelClass, secondaryButtonClass } from '../lib/ui.ts'

const searchDelay = 400

const searchTimeout = 20000

const cardClass = 'space-y-2 rounded-xl border border-slate-200 p-5 break-words shadow-sm'

const linkClass = 'text-sm font-medium text-slate-900 underline'

type Found = {
  terms: string
  total: number
  articles: NewSavedArticle[]
}

async function fetchResults(terms: string): Promise<SearchResults | string> {
  try {
    const response = await fetch(searchUrl(terms), { signal: AbortSignal.timeout(searchTimeout) })
    if (!response.ok) return `Europe PMC answered with an error (HTTP ${response.status}). Search again in a moment.`
    return readSearch(await response.json()) ?? "Europe PMC's answer couldn't be read."
  } catch (error) {
    if (error instanceof SyntaxError) return "Europe PMC's answer couldn't be read."
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      return `Europe PMC didn't answer within ${searchTimeout / 1000} seconds. Search again, or try later.`
    }
    return "Couldn't reach Europe PMC. Check the connection, then search again."
  }
}

function resultsLine(found: Found): string {
  if (found.articles.length === 0) return `No articles found for "${found.terms}".`
  const count = `${found.total.toLocaleString('en-GB')} ${found.total === 1 ? 'result' : 'results'} for "${found.terms}"`
  if (found.total > found.articles.length) return `${count} · showing the first ${found.articles.length}`
  return count
}

export default function Studies() {
  const savedArticles = useStore((state) => state.savedArticles)
  const savedArticlesStatus = useStore((state) => state.savedArticlesStatus)
  const loadSavedArticles = useStore((state) => state.loadSavedArticles)
  const addSavedArticle = useStore((state) => state.addSavedArticle)
  const updateSavedArticle = useStore((state) => state.updateSavedArticle)
  const deleteSavedArticle = useStore((state) => state.deleteSavedArticle)

  const [query, setQuery] = useState('')
  const [searchStatus, setSearchStatus] = useState<Status>('idle')
  const [searchError, setSearchError] = useState('')
  const [found, setFound] = useState<Found | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<{ id: string; message: string } | null>(null)
  const [listError, setListError] = useState('')
  const [noteId, setNoteId] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [noteError, setNoteError] = useState('')
  const timer = useRef(0)
  const latestSearch = useRef(0)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function search(text: string) {
    const terms = text.trim()
    if (!terms) return
    latestSearch.current += 1
    const thisSearch = latestSearch.current
    setSearchStatus('loading')
    const outcome = await fetchResults(terms)
    if (thisSearch !== latestSearch.current) return
    if (typeof outcome === 'string') {
      setSearchError(outcome)
      setSearchStatus('error')
      return
    }
    setFound({ terms, total: outcome.total, articles: outcome.articles })
    setSaveError(null)
    setSearchStatus('ready')
  }

  function handleQueryChange(text: string) {
    setQuery(text)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => search(text), searchDelay)
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    window.clearTimeout(timer.current)
    search(query)
  }

  async function handleSave(article: NewSavedArticle) {
    setSavingId(article.external_id)
    setSaveError(null)
    const message = await addSavedArticle(article)
    setSavingId(null)
    if (message) setSaveError({ id: article.external_id, message })
  }

  function openNote(article: SavedArticle) {
    setNoteId(article.id)
    setNoteDraft(article.note ?? '')
    setNoteError('')
  }

  function closeNote() {
    setNoteId(null)
    setNoteError('')
  }

  async function handleSaveNote(event: SubmitEvent<HTMLFormElement>, article: SavedArticle) {
    event.preventDefault()
    setSavingNote(true)
    setNoteError('')
    const message = await updateSavedArticle(article.id, { note: noteDraft.trim() || null })
    setSavingNote(false)
    if (message) setNoteError(message)
    else closeNote()
  }

  async function handleDelete(article: SavedArticle) {
    if (!window.confirm('Delete this saved article? It can be saved again from a search.')) return
    setListError('')
    const message = await deleteSavedArticle(article.id)
    if (message) setListError(message)
    else if (noteId === article.id) closeNote()
  }

  return (
    <div className="grid items-start gap-6 p-6 lg:grid-cols-2">
      <div className="min-w-0 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Search Europe PMC</h2>
          <div className="flex gap-2">
            <input
              type="search"
              className={`${inputClass} min-w-0 flex-1`}
              required
              aria-label="Words to search for"
              placeholder="heart failure remote monitoring"
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
            />
            <button className={`${buttonClass} shrink-0`}>Search</button>
          </div>
        </form>

        {searchStatus === 'idle' && (
          <p className="text-sm text-slate-500">
            The search runs when you stop typing, or at once on Enter. The first 25 results are shown.
          </p>
        )}
        {searchStatus === 'loading' && <p className="text-sm text-slate-500">Searching Europe PMC…</p>}
        {searchStatus === 'error' && <p className="text-sm text-red-600">{searchError}</p>}
        {found && savedArticlesStatus !== 'ready' && (
          <p className="text-sm text-slate-500">Save is off until your saved articles have loaded.</p>
        )}
        {found && <p className="text-sm font-medium text-slate-600">{resultsLine(found)}</p>}
        {found?.articles.map((article) => (
          <article key={article.external_id} className={cardClass}>
            <h3 className="font-semibold"><Markup html={article.title} /></h3>
            {article.authors && <p className="line-clamp-2 text-sm text-slate-600">{article.authors}</p>}
            {(article.journal !== null || article.year !== null) && (
              <p className="text-sm text-slate-500">
                {[article.journal, article.year].filter((part) => part !== null).join(' · ')}
              </p>
            )}
            {article.abstract ? (
              <details>
                <summary className="cursor-pointer text-sm font-medium text-slate-700">Abstract</summary>
                <div className="mt-2 text-sm leading-relaxed text-slate-700"><Markup html={article.abstract} /></div>
              </details>
            ) : (
              <p className="text-sm text-slate-500">No abstract.</p>
            )}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a href={article.url} target="_blank" rel="noreferrer" className={linkClass}>
                Open on Europe PMC
              </a>
              {savedArticlesStatus === 'ready' &&
              savedArticles.some((saved) => saved.external_id === article.external_id) ? (
                <span className="ml-auto text-sm text-slate-500">Saved</span>
              ) : (
                <button
                  onClick={() => handleSave(article)}
                  disabled={savedArticlesStatus !== 'ready' || savingId !== null}
                  className={`ml-auto ${secondaryButtonClass}`}
                >
                  {savingId === article.external_id ? 'Saving…' : 'Save'}
                </button>
              )}
            </div>
            {saveError?.id === article.external_id && <p className="text-sm text-red-600">{saveError.message}</p>}
          </article>
        ))}
      </div>

      <section className="min-w-0 space-y-4">
        <h2 className="text-lg font-semibold">Saved articles</h2>
        {(savedArticlesStatus === 'idle' || savedArticlesStatus === 'loading') && (
          <p className="text-sm text-slate-500">Loading your saved articles…</p>
        )}
        {savedArticlesStatus === 'error' && (
          <div className="space-y-3 rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-red-600">Couldn't load your saved articles.</p>
            <button onClick={loadSavedArticles} className={secondaryButtonClass}>
              Try again
            </button>
          </div>
        )}
        {savedArticlesStatus === 'ready' && savedArticles.length === 0 && (
          <p className="text-sm text-slate-500">Nothing saved yet. The articles you save from a search appear here.</p>
        )}
        {listError && <p className="text-sm text-red-600">{listError}</p>}
        {savedArticlesStatus === 'ready' &&
          savedArticles.map((article) => (
            <article
              key={article.id}
              className={`${cardClass} ${noteId === article.id ? 'ring-2 ring-slate-400' : ''}`}
            >
              <h3 className="font-semibold"><Markup html={article.title} /></h3>
              {article.authors && <p className="line-clamp-2 text-sm text-slate-600">{article.authors}</p>}
              {(article.journal !== null || article.year !== null) && (
                <p className="text-sm text-slate-500">
                  {[article.journal, article.year].filter((part) => part !== null).join(' · ')}
                </p>
              )}
              {article.abstract ? (
                <details>
                  <summary className="cursor-pointer text-sm font-medium text-slate-700">Abstract</summary>
                  <div className="mt-2 text-sm leading-relaxed text-slate-700"><Markup html={article.abstract} /></div>
                </details>
              ) : (
                <p className="text-sm text-slate-500">No abstract.</p>
              )}
              {noteId === article.id ? (
                <form
                  onSubmit={(event) => handleSaveNote(event, article)}
                  className="space-y-2 rounded-lg bg-slate-50 p-3"
                >
                  <label className="block space-y-1">
                    <span className={labelClass}>Note</span>
                    <textarea
                      className={`${inputClass} resize-y`}
                      rows={3}
                      value={noteDraft}
                      onChange={(event) => setNoteDraft(event.target.value)}
                    />
                  </label>
                  {noteError && <p className="text-sm text-red-600">{noteError}</p>}
                  <button className={secondaryButtonClass} disabled={savingNote}>
                    {savingNote ? 'Saving…' : 'Save note'}
                  </button>
                </form>
              ) : (
                article.note && (
                  <p className="text-sm whitespace-pre-line text-slate-700">
                    <span className="font-medium">Note:</span> {article.note}
                  </p>
                )
              )}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {article.url && (
                  <a href={article.url} target="_blank" rel="noreferrer" className={linkClass}>
                    Open on Europe PMC
                  </a>
                )}
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={() => (noteId === article.id ? closeNote() : openNote(article))}
                    className={secondaryButtonClass}
                  >
                    {noteId === article.id ? 'Close' : article.note ? 'Edit note' : 'Add note'}
                  </button>
                  <button onClick={() => handleDelete(article)} className={secondaryButtonClass}>
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
      </section>
    </div>
  )
}
