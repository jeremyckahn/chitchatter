/**
 * Reads `items[index]` for a test, throwing instead of returning `undefined`
 * so a missing item fails at the read with a clear message, not later as a
 * confusing assertion on `undefined`.
 */
export const itemAt = <T>(items: ArrayLike<T>, index: number): T => {
  const item = items[index]

  if (item === undefined) {
    throw new Error(
      `Expected an item at index ${index}, but there are ${items.length}`
    )
  }

  return item
}
