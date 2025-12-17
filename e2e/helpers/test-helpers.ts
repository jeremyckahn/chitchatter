import { Page, expect, Browser, chromium } from '@playwright/test'

/**
 * Helper function to send a message in a room
 */
export const sendMessage = async (
  page: Page,
  message: string
): Promise<void> => {
  const chatInput = page.getByPlaceholder('Your message')
  await chatInput.fill(message)
  await chatInput.press('Enter')
  await expect(page.getByText(message)).toBeVisible()
}

export const createBrowserContext = async (browser?: Browser) => {
  const newBrowser = browser || (await chromium.launch())
  const context = await newBrowser.newContext()
  const page = await context.newPage()

  return {
    browser: newBrowser,
    context,
    page,
  }
}

export const waitFor = async (
  predicate: () => boolean | Promise<boolean>,
  timeout = 5000
) => {
  const start = Date.now()

  while (Date.now() - start < timeout) {
    if (await predicate()) {
      return
    }

    await new Promise(resolve => setTimeout(resolve, 100))
  }

  throw new Error('waitFor timed out')
}

export const getDropAndDragTransfer = (page: Page, file: string) => {
  return page.evaluateHandle(
    async ([file]) => {
      const dataTransfer = new DataTransfer()
      const blob = await fetch(file).then(res => res.blob())
      const fileHandle = new File([blob], 'chitchatter.png', {
        type: 'image/png',
      })
      dataTransfer.items.add(fileHandle)
      return dataTransfer
    },
    [file]
  )
}
