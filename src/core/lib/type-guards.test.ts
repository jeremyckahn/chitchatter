import { describe, expect, test } from 'vitest'

import { isBoolean, isString } from './type-guards'

describe('isString', () => {
  test.each(['', 'text'])('is true for %j', value => {
    expect(isString(value)).toBe(true)
  })

  test.each([0, true, null, undefined, {}, [], Object('boxed')])(
    'is false for %j',
    value => {
      expect(isString(value)).toBe(false)
    }
  )
})

describe('isBoolean', () => {
  test.each([true, false])('is true for %j', value => {
    expect(isBoolean(value)).toBe(true)
  })

  test.each([0, 1, 'true', null, undefined, {}, Object(true)])(
    'is false for %j',
    value => {
      expect(isBoolean(value)).toBe(false)
    }
  )
})
