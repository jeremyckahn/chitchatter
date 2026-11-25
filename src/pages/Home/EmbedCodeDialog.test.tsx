import { PrismAsyncLight } from 'react-syntax-highlighter'

import { embedCodeLanguage } from './EmbedCodeDialog'

// The library populates this static from its table of async language loaders
// but its type definitions omit it, so it is read and narrowed at runtime.
const getLoadableLanguages = (): readonly string[] => {
  const languages: unknown = Reflect.get(PrismAsyncLight, 'supportedLanguages')

  if (
    !Array.isArray(languages) ||
    !languages.every(language => typeof language === 'string')
  ) {
    throw new Error('PrismAsyncLight.supportedLanguages is not a string[]')
  }

  return languages
}

describe('EmbedCodeDialog', () => {
  // Regression test: PrismAsyncLight only loads languages by their canonical
  // Prism name. An alias such as "html" has no loader, so in a production
  // build (where nothing else has registered markup) the snippets rendered as
  // plain, unhighlighted text.
  test('uses a language that PrismAsyncLight can load on demand', () => {
    expect(getLoadableLanguages()).toContain(embedCodeLanguage)
  })

  test('the "html" alias is not loadable, which is why it is avoided', () => {
    expect(getLoadableLanguages()).not.toContain('html')
  })
})
