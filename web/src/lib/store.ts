import { create } from 'zustand'
import { supabase } from './supabase.ts'
import type { Patient, Procedure, Timeline, TimelineVisit, Visit } from './types.ts'

export type Status = 'idle' | 'loading' | 'error' | 'ready'

export type NewTimeline = {
  name: string
  color: string
  visits: TimelineVisit[]
  procedures: Procedure[]
}

export type TimelineChanges = {
  name: string
  visits: TimelineVisit[]
  procedures: Procedure[]
}

export type NewPatient = {
  name: string
  anchor_date: string
  source_timeline_id: string
  visits: Visit[]
  procedures: Procedure[]
}

export type PatientChanges = {
  name?: string
  note?: string | null
  anchor_date?: string
  source_timeline_id?: string
  visits?: Visit[]
  procedures?: Procedure[]
}

type Store = {
  timelines: Timeline[]
  timelinesStatus: Status
  loadTimelines: () => Promise<void>
  addTimeline: (timeline: NewTimeline) => Promise<string | null>
  updateTimeline: (id: string, changes: TimelineChanges) => Promise<string | null>
  deleteTimeline: (id: string) => Promise<string | null>
  patients: Patient[]
  patientsStatus: Status
  loadPatients: () => Promise<void>
  addPatient: (patient: NewPatient) => Promise<string | null>
  updatePatient: (id: string, changes: PatientChanges) => Promise<string | null>
  deletePatient: (id: string) => Promise<string | null>
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
    set((state) => ({
      timelines: state.timelines.filter((timeline) => timeline.id !== id),
      patients: state.patients.map((patient) =>
        patient.source_timeline_id === id ? { ...patient, source_timeline_id: null } : patient,
      ),
    }))
    return null
  },

  patients: [],
  patientsStatus: 'idle',

  loadPatients: async () => {
    set({ patientsStatus: 'loading' })
    const result = await supabase.from('patients').select().order('created_at')
    if (result.error) set({ patientsStatus: 'error' })
    else set({ patients: result.data, patientsStatus: 'ready' })
  },

  addPatient: async (patient) => {
    const result = await supabase.from('patients').insert(patient).select().single()
    if (result.error) return result.error.message
    set((state) => ({ patients: [...state.patients, result.data] }))
    return null
  },

  updatePatient: async (id, changes) => {
    const result = await supabase.from('patients').update(changes).eq('id', id).select().single()
    if (result.error) return result.error.message
    set((state) => ({
      patients: state.patients.map((patient) => (patient.id === id ? result.data : patient)),
    }))
    return null
  },

  deletePatient: async (id) => {
    const result = await supabase.from('patients').delete().eq('id', id)
    if (result.error) return result.error.message
    set((state) => ({ patients: state.patients.filter((patient) => patient.id !== id) }))
    return null
  },

  clear: () => set({ timelines: [], timelinesStatus: 'idle', patients: [], patientsStatus: 'idle' }),
}))
