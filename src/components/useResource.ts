import { useCallback, useEffect, useState } from 'react'
import { useUi } from './ui'

interface ResourceApi<T> {
  list: () => Promise<T[]>
  create: (row: Partial<T>) => Promise<T>
  update: (id: string, patch: Partial<T>) => Promise<T | null>
  remove: (id: string) => Promise<void>
}

export function useResource<T extends { id: string }>(
  api: ResourceApi<T>,
  label: string,
  logEntity?: string,
) {
  const { toast } = useUi()
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.list()
      setItems(data)
    } catch (e: any) {
      setError(e.message || `Failed to load ${label}`)
    } finally {
      setLoading(false)
    }
  }, [api, label])

  useEffect(() => { load() }, [load])

  const create = useCallback(async (row: Partial<T>) => {
    try {
      const created = await api.create(row)
      setItems((prev) => [...prev, created])
      toast(`${label} created`, 'ok')
      return created
    } catch (e: any) {
      toast(`Failed: ${e.message}`, 'err')
      throw e
    }
  }, [api, label, toast])

  const update = useCallback(async (id: string, patch: Partial<T>) => {
    try {
      const updated = await api.update(id, patch)
      setItems((prev) => prev.map((x) => (x.id === id ? (updated as T) ?? { ...x, ...patch } : x)))
      toast(`${label} updated`, 'ok')
      return updated
    } catch (e: any) {
      toast(`Failed: ${e.message}`, 'err')
      throw e
    }
  }, [api, label, toast])

  const remove = useCallback(async (id: string) => {
    try {
      await api.remove(id)
      setItems((prev) => prev.filter((x) => x.id !== id))
      toast(`${label} deleted`, 'ok')
    } catch (e: any) {
      toast(`Failed: ${e.message}`, 'err')
      throw e
    }
  }, [api, label, toast])

  return { items, loading, error, reload: load, create, update, remove }
}
