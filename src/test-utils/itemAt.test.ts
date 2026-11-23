import { describe, expect, it } from 'vitest'

import { itemAt } from './itemAt'

describe('itemAt', () => {
  it('returns the item at the index', () => {
    expect(itemAt(['a', 'b'], 1)).toBe('b')
  })

  it('returns falsy items rather than treating them as missing', () => {
    expect(itemAt([0, null, ''], 0)).toBe(0)
    expect(itemAt([0, null, ''], 1)).toBeNull()
    expect(itemAt([0, null, ''], 2)).toBe('')
  })

  it('reads array-likes such as typed arrays', () => {
    expect(itemAt(new Uint8Array([7, 8]), 1)).toBe(8)
  })

  it('throws when there is no item at the index', () => {
    expect(() => itemAt(['a'], 1)).toThrow(
      'Expected an item at index 1, but there are 1'
    )
    expect(() => itemAt([], 0)).toThrow(
      'Expected an item at index 0, but there are 0'
    )
  })
})
