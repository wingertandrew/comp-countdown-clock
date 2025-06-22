import { describe, it, expect } from 'vitest'
import { reducer } from './use-toast'

describe('use-toast reducer', () => {
  it('adds a toast', () => {
    const state = { toasts: [] }
    const toast = { id: '1', open: true }
    const next = reducer(state, { type: 'ADD_TOAST', toast } as any)
    expect(next.toasts.length).toBe(1)
    expect(next.toasts[0].id).toBe('1')
  })
})
