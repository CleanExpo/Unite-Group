'use client'

import { useEffect, useId, useRef, useState } from 'react'
import styles from './founder-desk.module.css'

type Repository = { fullName: string; private: boolean; archived: boolean }
type Catalogue = {
  repositories: Repository[]
  status: 'complete' | 'partial' | 'not_connected' | 'auth_error' | 'rate_limited' | 'unavailable'
  message: string
  nextCursor: string | null
  observedAt: string
  coverage: string
  incomplete: boolean
  retryAfterSeconds?: number
}

export function RepositorySelector({ value, onChange, projects, disabled }: {
  value: string
  onChange: (value: string) => void
  projects: Array<{ name: string }>
  disabled: boolean
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null)
  const [loading, setLoading] = useState(false)
  const [incomplete, setIncomplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionFailure, setConnectionFailure] = useState<'auth_error' | 'not_connected' | null>(null)
  const [retryCursor, setRetryCursor] = useState<string | null>(null)
  const sequence = useRef(0)
  const trigger = useRef<HTMLButtonElement>(null)
  useEffect(() => () => { sequence.current += 1 }, [])

  async function load(cursor: string | null = null) {
    const request = ++sequence.current
    setLoading(true)
    setError(null)
    setConnectionFailure(null)
    setRetryCursor(cursor)
    try {
      const response = await fetch(`/api/command-centre/missions/repositories${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`)
      const data = await response.json() as Catalogue & { error?: string }
      if (request !== sequence.current) return
      if (data.status === 'auth_error' || data.status === 'not_connected') setConnectionFailure(data.status)
      const retryHint = typeof data.retryAfterSeconds === 'number' && Number.isFinite(data.retryAfterSeconds) && data.retryAfterSeconds > 0
        ? ` Wait ${Math.ceil(data.retryAfterSeconds)} seconds before retrying.` : ''
      if (!response.ok || !Array.isArray(data.repositories)) throw new Error((data.message || data.error || 'GitHub repositories could not be loaded.') + retryHint)
      if (data.status !== 'complete' && data.status !== 'partial') throw new Error((data.message || 'GitHub repositories are currently unavailable.') + retryHint)
      setCatalogue(data)
      setIncomplete(previous => (cursor ? previous : false) || data.incomplete)
      setRepositories(previous => [...new Map([...(cursor ? previous : []), ...data.repositories].map(repo => [repo.fullName, repo])).values()])
    } catch (cause) {
      if (request === sequence.current) setError(cause instanceof Error ? cause.message : 'GitHub repositories could not be loaded.')
    } finally {
      if (request === sequence.current) setLoading(false)
    }
  }

  function choose(next: string) {
    onChange(next)
    setOpen(false)
    trigger.current?.focus()
  }

  const matches = repositories.filter(repo => repo.fullName.toLowerCase().includes(search.trim().toLowerCase()))
  const complete = catalogue?.status === 'complete' && !error && !incomplete

  return <div className={styles.projectField}>
    <label id={`${id}-label`} htmlFor={`${id}-trigger`}>Business or project <span>(optional)</span></label>
    <button ref={trigger} id={`${id}-trigger`} type="button" className={styles.repositoryTrigger} aria-labelledby={`${id}-label ${id}-value`} aria-expanded={open} aria-controls={`${id}-panel`} disabled={disabled} onClick={() => {
      setOpen(current => !current)
      if (!open && !catalogue && !loading) void load()
    }}><span id={`${id}-value`}>{value || 'Let Margot help me place it'}</span><span aria-hidden="true">{open ? '−' : '+'}</span></button>
    {!open && <p className={styles.repositoryHint}>Choose any repository visible to the connected GitHub account.</p>}
    {open && <div id={`${id}-panel`} className={styles.repositoryPanel} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus() } }}>
      <button type="button" className={styles.textButton} disabled={disabled} onClick={() => choose('')}>Let Margot help me place it</button>
      <label htmlFor={`${id}-search`}>Search loaded GitHub repositories</label>
      <input id={`${id}-search`} type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search owner or repository name" disabled={disabled} />
      <p className={styles.repositoryHint} role="status">{loading ? 'Loading GitHub repositories…' : `${repositories.length} repositories loaded${complete ? ' · connected account list complete' : ' · list may be incomplete'}`}{search.trim() ? ` · ${matches.length} matching` : ''}</p>
      {error && <div className={styles.repositoryError} role="alert"><p>{error}</p>{connectionFailure && <p>The Mission Control GitHub connection needs attention from your system operator.</p>}<p>{projects.length > 0 ? 'You can still prepare your idea. Choose a registered business below, or let Margot help you place it.' : 'You can still prepare your idea. Let Margot help you place it without choosing a repository.'}</p><button type="button" className={styles.secondaryButton} disabled={loading || disabled} onClick={() => void load(retryCursor)}>Retry repositories</button></div>}
      {catalogue?.coverage && <p className={styles.repositoryHint}>{catalogue.coverage}</p>}
      {incomplete && <p className={styles.repositoryHint}>Some repositories could not be included. This list is incomplete.</p>}
      {catalogue?.status === 'partial' && catalogue.message && <p className={styles.repositoryHint}>{catalogue.message}</p>}
      {matches.length > 0 && <ul className={styles.repositoryList} aria-label="GitHub repositories">{matches.map(repo => <li key={repo.fullName}><button type="button" disabled={disabled} aria-pressed={value === repo.fullName} onClick={() => choose(repo.fullName)}><span>{repo.fullName}</span>{' '}<small>{repo.private ? 'Private' : 'Public'}{repo.archived ? ' · Archived' : ''}</small></button></li>)}</ul>}
      {!loading && !error && matches.length === 0 && <p className={styles.repositoryHint}>{search.trim() ? 'No loaded repositories match your search.' : 'No repositories have been returned.'}{!complete && ' More repositories may be available.'}</p>}
      {catalogue?.nextCursor && <button type="button" className={styles.secondaryButton} disabled={loading || disabled} onClick={() => void load(catalogue.nextCursor)}>Load more repositories</button>}
      {catalogue && !error && <button type="button" className={styles.secondaryButton} disabled={loading || disabled} onClick={() => void load()}>Refresh repository list</button>}
      {projects.length > 0 && <div className={styles.registeredProjects}><label htmlFor={`${id}-business`}>Or choose a registered business</label><select id={`${id}-business`} value={projects.some(project => project.name === value) ? value : ''} disabled={disabled} onChange={event => choose(event.target.value)}><option value="">Select a registered business</option>{projects.map(project => <option key={project.name} value={project.name}>{project.name}</option>)}</select></div>}
    </div>}
  </div>
}
