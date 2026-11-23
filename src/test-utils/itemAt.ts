/**
 * Reads `items[index]` for a test and throws if there is no item there, so the
 * test fails at the read with a message that names the index.
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
