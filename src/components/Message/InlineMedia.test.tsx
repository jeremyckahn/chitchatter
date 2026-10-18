import {
  render,
  screen,
  waitForElementToBeRemoved,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { InlineFile } from './InlineMedia'

type InlineFileSource = Parameters<typeof InlineFile>[0]['file']

type AppendToCallback = (err: Error | undefined, element: HTMLElement) => void

const blobUrl = 'blob:http://localhost/photo'

// Mimics render-media: the file's <img> is created outside of React, appended
// to the container, and handed to the callback once its blob URL is set.
const imageFileStub = (name: string): InlineFileSource => ({
  name,
  appendTo: (
    container: HTMLElement | string,
    optionsOrCallback?: unknown,
    callback?: unknown
  ) => {
    if (!(container instanceof HTMLElement)) return

    const onAppended = [optionsOrCallback, callback].find(
      (arg): arg is AppendToCallback => typeof arg === 'function'
    )
    const image = document.createElement('img')

    image.src = blobUrl
    image.alt = name
    container.appendChild(image)
    onAppended?.(undefined, image)
  },
})

const audioFileStub = (name: string): InlineFileSource => ({
  name,
  appendTo: (container: HTMLElement | string) => {
    if (!(container instanceof HTMLElement)) return

    container.appendChild(document.createElement('audio'))
  },
})

const getThumbnail = () => screen.getByRole('button', { name: /photo\.png/ })

describe('InlineFile image preview', () => {
  test('renders the image as a keyboard-focusable thumbnail button', () => {
    render(<InlineFile file={imageFileStub('photo.png')} />)

    expect(getThumbnail()).toHaveAttribute('tabindex', '0')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('opens the full-size image when the thumbnail is clicked', async () => {
    render(<InlineFile file={imageFileStub('photo.png')} />)

    await userEvent.click(getThumbnail())

    const dialog = screen.getByRole('dialog')

    expect(within(dialog).getByRole('img')).toHaveAttribute('src', blobUrl)
  })

  test.each(['{Enter}', ' '])(
    'opens the full-size image when the thumbnail is activated with %j',
    async key => {
      render(<InlineFile file={imageFileStub('photo.png')} />)

      getThumbnail().focus()
      await userEvent.keyboard(key)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    }
  )

  test('closes the full-size image with the close button', async () => {
    render(<InlineFile file={imageFileStub('photo.png')} />)

    await userEvent.click(getThumbnail())
    await userEvent.click(screen.getByRole('button', { name: /close/i }))

    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'))
  })

  test('closes the full-size image with the Escape key', async () => {
    render(<InlineFile file={imageFileStub('photo.png')} />)

    await userEvent.click(getThumbnail())
    await userEvent.keyboard('{Escape}')

    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'))
  })

  test('does not open a preview for audio files', async () => {
    const { container } = render(
      <InlineFile file={audioFileStub('clip.ogg')} />
    )

    const audio = container.querySelector('audio')

    if (!audio) throw new Error('The audio element was not rendered')

    await userEvent.click(audio)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('shows a message for unsupported file types', () => {
    render(<InlineFile file={imageFileStub('notes.txt')} />)

    screen.getByText('Media preview not supported')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
