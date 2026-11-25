import {
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  InlineFile,
  InlineMediaView,
  getInlineMediaMimeType,
  inlineMediaMimeTypes,
} from './InlineMedia'
import { InlineMediaDownloadState } from './useInlineMediaDownload'

type InlineFileSource = Parameters<typeof InlineFile>[0]['file']

// Matches render-media's MAX_BLOB_LENGTH
const maxInlineMediaBytes = 200 * 1000 * 1000

const blobsByUrl = new Map<string, Blob>()
let createObjectURL = vi.fn<(obj: Blob | MediaSource) => string>()
let revokeObjectURL = vi.fn<(url: string) => void>()

// jsdom does not implement createObjectURL or revokeObjectURL, so stand in with
// an in-memory registry of created blobs and their active URLs.
beforeEach(() => {
  let nextId = 0

  blobsByUrl.clear()
  createObjectURL = vi.fn((obj: Blob | MediaSource) => {
    const url = `blob:http://localhost/${nextId++}`

    if (obj instanceof Blob) {
      blobsByUrl.set(url, obj)
    }

    return url
  })
  revokeObjectURL = vi.fn((url: string) => {
    blobsByUrl.delete(url)
  })
  URL.createObjectURL = createObjectURL
  URL.revokeObjectURL = revokeObjectURL
})

// Mimics WebTorrent: reads the file into a Blob asynchronously, with whatever
// filename-derived MIME type WebTorrent chose unless overridden cleanly.
const fileStub = (
  name: string,
  length = 1024,
  rawBlobType = 'application/octet-stream'
): InlineFileSource => ({
  name,
  length,
  getBlob: vi.fn(callback => {
    queueMicrotask(() =>
      callback(undefined, new Blob(['fake-media-bytes'], { type: rawBlobType }))
    )
  }),
})

const failingFileStub = (name: string): InlineFileSource => ({
  name,
  length: 1024,
  getBlob: vi.fn(callback => {
    queueMicrotask(() => callback(new Error('Could not read the file')))
  }),
})

const findThumbnail = () => screen.findByRole('button', { name: /photo\.png/ })

describe('InlineFile image preview', () => {
  test('renders the image as a thumbnail button', async () => {
    render(<InlineFile file={fileStub('photo.png')} />)

    const thumbnail = await findThumbnail()
    const createdUrl = createObjectURL.mock.results[0]?.value as string

    expect(within(thumbnail).getByRole('img')).toHaveAttribute(
      'src',
      createdUrl
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('opens the full-size image when the thumbnail is clicked', async () => {
    render(<InlineFile file={fileStub('photo.png')} />)

    await userEvent.click(await findThumbnail())

    const dialog = screen.getByRole('dialog', { name: 'photo.png preview' })
    const createdUrl = createObjectURL.mock.results[0]?.value as string

    expect(within(dialog).getByRole('img')).toHaveAttribute('src', createdUrl)
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
    const createdUrl = createObjectURL.mock.results[0]?.value as string

    expect(audio).toHaveAttribute('src', createdUrl)
    expect(audio).toHaveAttribute('controls')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('InlineFile fixed MIME types', () => {
  test('never maps any extension to an active MIME type', () => {
    const activeMimeTypes = new Set([
      'image/svg+xml',
      'text/html',
      'application/xhtml+xml',
      'text/xml',
      'application/xml',
      'application/pdf',
      'text/javascript',
      'application/javascript',
    ])

    for (const [ext, mimeType] of Object.entries(inlineMediaMimeTypes)) {
      expect(activeMimeTypes.has(mimeType.toLowerCase())).toBe(false)
      expect(mimeType).toMatch(/^(image|audio)\//)
      expect(getInlineMediaMimeType(`file${ext}`)).toBe(mimeType)
    }
  })

  test.each([
    ['photo.png', 'image/png'],
    ['photo.PNG', 'image/png'],
    ['my.vacation.photo.Png', 'image/png'],
    ['evil.svg.PNG', 'image/png'],
    ['frame.Jpg', 'image/jpeg'],
    ['frame.a.JPEG', 'image/jpeg'],
    ['anim.Gif', 'image/gif'],
    ['bitmap.BMP', 'image/bmp'],
    ['clip.OGG', 'audio/ogg'],
    ['voice.v2.Oga', 'audio/ogg'],
    ['track.AAC', 'audio/aac'],
    ['song.mix.Wav', 'audio/wav'],
    ['master.Flac', 'audio/flac'],
  ])(
    'creates a Blob with fixed type %s -> %s regardless of raw blob type, casing, or extra dots',
    async (fileName, expectedMimeType) => {
      const stub = fileStub(fileName, 1024, 'image/svg+xml')

      render(<InlineFile file={stub} />)

      await vi.waitFor(() => {
        expect(createObjectURL).toHaveBeenCalledOnce()
      })

      const createdBlob = createObjectURL.mock.calls[0]?.[0]

      expect(createdBlob).toBeInstanceOf(Blob)
      expect((createdBlob as Blob).type).toBe(expectedMimeType)
      expect((createdBlob as Blob).size).toBe('fake-media-bytes'.length)
    }
  )
})

describe('InlineFile unsupported and failing files', () => {
  test.each(['notes.txt', 'png', 'photo.png.', '.png'])(
    'shows a message and does not read unsupported filename %s',
    fileName => {
      const file = fileStub(fileName)

      render(<InlineFile file={file} />)

      screen.getByText('Media preview not supported')
      expect(file.getBlob).not.toHaveBeenCalled()
      expect(createObjectURL).not.toHaveBeenCalled()
    }
  )

  // Regression test: a peer-supplied SVG rendered from a same-origin blob: URL
  // runs script when opened in its own tab (stored XSS). Active-content
  // formats must never get a blob URL, regardless of extension casing.
  test.each([
    'poc.svg',
    'poc.SVG',
    'poc.Svg',
    'poc.html',
    'poc.xml',
    'photo.png.svg',
  ])('does not render or read %s because it can carry script', file => {
    const stub = fileStub(file)
    const { container } = render(<InlineFile file={stub} />)

    screen.getByText('Media preview not supported')
    expect(container.querySelector('img')).toBeNull()
    expect(stub.getBlob).not.toHaveBeenCalled()
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  test('shows a message and does not read files over the size limit', () => {
    const file = fileStub('photo.png', maxInlineMediaBytes + 1)

    render(<InlineFile file={file} />)

    screen.getByText('Media preview not supported')
    expect(file.getBlob).not.toHaveBeenCalled()
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  test('still previews a file exactly at the size limit', async () => {
    render(<InlineFile file={fileStub('photo.png', maxInlineMediaBytes)} />)

    await findThumbnail()
  })

  test('shows a message when the file cannot be read', async () => {
    render(<InlineFile file={failingFileStub('photo.png')} />)

    await screen.findByText('Media failed to render')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(createObjectURL).not.toHaveBeenCalled()
  })
})

describe('InlineFile blob URL cleanup', () => {
  test('revokes the blob URL when unmounted', async () => {
    const { unmount } = render(<InlineFile file={fileStub('photo.png')} />)

    await findThumbnail()

    const createdUrl = createObjectURL.mock.results[0]?.value as string

    unmount()

    expect(revokeObjectURL).toHaveBeenCalledWith(createdUrl)
    expect(blobsByUrl.size).toBe(0)
  })

  test('does not create or leak a blob URL if unmounted before the blob arrives', async () => {
    const file = fileStub('photo.png')
    const { unmount } = render(<InlineFile file={file} />)

    unmount()

    await vi.waitFor(() => {
      expect(file.getBlob).toHaveBeenCalledOnce()
    })

    expect(createObjectURL).not.toHaveBeenCalled()
    expect(blobsByUrl.size).toBe(0)
  })
})

describe('InlineMediaView', () => {
  test('shows a spinner while the media downloads', () => {
    render(
      <InlineMediaView download={{ state: InlineMediaDownloadState.LOADING }} />
    )

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  // Regression: a download that failed (a key that does not decrypt the file,
  // say) left the spinner up forever instead of saying so.
  test('says the media failed instead of spinning forever', () => {
    render(
      <InlineMediaView download={{ state: InlineMediaDownloadState.FAILED }} />
    )

    screen.getByText('Media failed to load')
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  test('renders every file of a share that holds two with the same name', async () => {
    render(
      <InlineMediaView
        download={{
          state: InlineMediaDownloadState.READY,
          files: [fileStub('photo.png'), fileStub('photo.png')],
        }}
      />
    )

    await waitFor(() =>
      expect(
        screen.getAllByRole('button', { name: /photo\.png/ })
      ).toHaveLength(2)
    )
    // React reports a key collision as an error rather than throwing
    expect(console.error).not.toHaveBeenCalledWith(
      expect.stringContaining('same key'),
      expect.anything(),
      expect.anything()
    )
  })

  test('renders each downloaded file once it is ready', async () => {
    render(
      <InlineMediaView
        download={{
          state: InlineMediaDownloadState.READY,
          files: [fileStub('photo.png')],
        }}
      />
    )

    await findThumbnail()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })
})
