import { create } from 'zustand'
import { supabase } from './supabase.ts'
import type { Timeline, TimelineVisit } from './types.ts'

export type Status = 'idle' | 'loading' | 'error' | 'ready'

export type NewTimeline = {
  name: string
  color: string
  visits: TimelineVisit[]
}

export type TimelineChanges = {
  name: string
  visits: TimelineVisit[]
}

type Store = {
  timelines: Timeline[]
  timelinesStatus: Status
  loadTimelines: () => Promise<void>
  addTimeline: (timeline: NewTimeline) => Promise<string | null>
  updateTimeline: (id: string, changes: TimelineChanges) => Promise<string | null>
  deleteTimeline: (id: string) => Promise<string | null>
  clear: () => void
}

export const useStore = create<Store>((set) => ({
  timelines: [],
  timelinesStatus: 'idle',

  loadTimelines: async () => {
    set({ timelinesStatus: 'loading' })
    const result = await supabase.from('timelines').select().order('created_at')
    if (result.error) set({ timelinesStatus: 'error' })
    else set({ timelines: result.data, timelinesStatus: 'ready' })
  },

  addTimeline: async (timeline) => {
    const result = await supabase.from('timelines').insert(timeline).select().single()
    if (result.error) return result.error.message
    set((state) => ({ timelines: [...state.timelines, result.data] }))
    return null
  },

  updateTimeline: async (id, changes) => {
    const result = await supabase.from('timelines').update(changes).eq('id', id).select().single()
    if (result.error) return result.error.message
    set((state) => ({
      timelines: state.timelines.map((timeline) => (timeline.id === id ? result.data : timeline)),
    }))
    return null
  },

  deleteTimeline: async (id) => {
    const result = await supabase.from('timelines').delete().eq('id', id)
    if (result.error) return result.error.message
    set((state) => ({ timelines: state.timelines.filter((timeline) => timeline.id !== id) }))
    return null
  },

  clear: () => set({ timelines: [], timelinesStatus: 'idle' }),
}))
