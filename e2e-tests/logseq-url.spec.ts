import { expect } from '@playwright/test'
import { test } from './fixtures'
import { createRandomPage, lastBlock, IsMac, IsLinux } from './utils'

test(
  "Logseq URLs (same graph)",
  async ({ page, block }) => {
    let paste_key = IsMac ? 'Meta+v' : 'Control+v'
    // create a page with identify block
    let identify_text = "URL redirect target"
    let page_title = await createRandomPage(page)
    await block.mustFill(identify_text)

    // paste current page's URL to another page, then redirect throught the URL
    await page.click('.ui__dropdown-trigger [data-dropdown-name="page-menu"]')
    await page.locator("text=Copy page URL").click()
    await createRandomPage(page)
    await block.mustFill("") // to enter editing mode
    await page.keyboard.press(paste_key)
    let cursor_locator = page.locator('textarea >> nth=0')
    expect(await cursor_locator.inputValue()).toContain("page=" + page_title)
    await cursor_locator.press("Enter")
    if (!IsLinux) { // FIXME: support Logseq URL on Linux (XDG)
        await page.locator('a.external-link >> nth=0').click()
        // Wait for it to navigate to the referenced page
        await page.waitForURL(new RegExp(`${page_title}`, 'ig'))
        await page.waitForTimeout(500)
        await page.waitForTimeout(100)
        cursor_locator = await lastBlock(page)
        expect(await cursor_locator.inputValue()).toBe(identify_text)
    }

    // paste the identify block's URL to another page, then redirect throught the URL
    await page.click('span.bullet >> nth=0', { button: "right" })
    await page.locator("text=Copy block URL").click()
    await createRandomPage(page)
    await block.mustFill("") // to enter editing mode
    await page.keyboard.press(paste_key)
    cursor_locator = page.locator('textarea >> nth=0')
    expect(await cursor_locator.inputValue()).toContain("block-id=")
    await cursor_locator.press("Enter")
    if (!IsLinux) { // FIXME: support Logseq URL on Linux (XDG)
        await page.locator('a.external-link >> nth=0').click()
        // Wait for it to navigate to the ref page
        await page.waitForURL(new RegExp(`[a-f0-9]{8}(\-[a-f0-9]{4}){3}\-[a-f0-9]{12}`, 'ig'))
        cursor_locator = await lastBlock(page)
        expect(await cursor_locator.inputValue()).toBe(identify_text)
    }
})
