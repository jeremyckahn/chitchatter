import {
  render,
  screen,
  waitForElementToBeRemoved,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { InlineFile } from './InlineMedia'

type InlineFileSource = Parameters<typeof InlineFile>[0]['file']

const blobUrl = 'blob:http://localhost/photo'

const revokeObjectURL = vi.fn()

// jsdom does not implement revokeObjectURL, which the component calls when it
// is done with a blob URL.
beforeAll(() => {
  URL.revokeObjectURL = revokeObjectURL
})

beforeEach(() => {
  revokeObjectURL.mockClear()
})

// Mimics WebTorrent: the blob URL is built asynchronously.
const fileStub = (name: string): InlineFileSource => ({
  name,
  getBlobURL: vi.fn(callback => {
    queueMicrotask(() => callback(undefined, blobUrl))
  }),
})

const failingFileStub = (name: string): InlineFileSource => ({
  name,
  getBlobURL: vi.fn(callback => {
    queueMicrotask(() => callback(new Error('Could not read the file')))
  }),
})

const findThumbnail = () => screen.findByRole('button', { name: /photo\.png/ })

describe('InlineFile image preview', () => {
  test('renders the image as a thumbnail button', async () => {
    render(<InlineFile file={fileStub('photo.png')} />)

    const thumbnail = await findThumbnail()

    expect(within(thumbnail).getByRole('img')).toHaveAttribute('src', blobUrl)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('opens the full-size image when the thumbnail is clicked', async () => {
    render(<InlineFile file={fileStub('photo.png')} />)

    await userEvent.click(await findThumbnail())

    const dialog = screen.getByRole('dialog', { name: 'photo.png preview' })

    expect(within(dialog).getByRole('img')).toHaveAttribute('src', blobUrl)
  })

  test.each(['{Enter}', ' '])(
    'opens the full-size image when the thumbnail is activated with %j',
    async key => {
      render(<InlineFile file={fileStub('photo.png')} />)

      const thumbnail = await findThumbnail()

      thumbnail.focus()
      await userEvent.keyboard(key)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    }
  )

  test('closes the full-size image with the close button', async () => {
    render(<InlineFile file={fileStub('photo.png')} />)

    await userEvent.click(await findThumbnail())
    await userEvent.click(screen.getByRole('button', { name: /close/i }))

    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'))
  })

  test('closes the full-size image with the Escape key', async () => {
    render(<InlineFile file={fileStub('photo.png')} />)

    await userEvent.click(await findThumbnail())
    await userEvent.keyboard('{Escape}')

    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'))
  })

  test('keeps the dialog open when the full-size image is clicked', async () => {
    render(<InlineFile file={fileStub('photo.png')} />)

    await userEvent.click(await findThumbnail())

    const dialog = screen.getByRole('dialog')

    await userEvent.click(within(dialog).getByRole('img'))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('InlineFile audio', () => {
  test('renders audio with controls and no image preview', async () => {
    const { container } = render(<InlineFile file={fileStub('clip.ogg')} />)

    await vi.waitFor(() => {
      expect(container.querySelector('audio')).not.toBeNull()
    })

    const audio = container.querySelector('audio')

    expect(audio).toHaveAttribute('src', blobUrl)
    expect(audio).toHaveAttribute('controls')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('InlineFile unsupported and failing files', () => {
  test('shows a message and does not read unsupported file types', () => {
    const file = fileStub('notes.txt')

    render(<InlineFile file={file} />)

    screen.getByText('Media preview not supported')
    expect(file.getBlobURL).not.toHaveBeenCalled()
  })

  test('shows a message when the file cannot be read', async () => {
    render(<InlineFile file={failingFileStub('photo.png')} />)

    await screen.findByText('Media failed to render')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('InlineFile blob URL cleanup', () => {
  test('revokes the blob URL when unmounted', async () => {
    const { unmount } = render(<InlineFile file={fileStub('photo.png')} />)

    await findThumbnail()
    unmount()

    expect(revokeObjectURL).toHaveBeenCalledWith(blobUrl)
  })

  test('revokes a blob URL that arrives after unmount', async () => {
    const file = fileStub('photo.png')
    const { unmount } = render(<InlineFile file={file} />)

    unmount()
    await vi.waitFor(() => {
      expect(revokeObjectURL).toHaveBeenCalledWith(blobUrl)
    })
  })
})
