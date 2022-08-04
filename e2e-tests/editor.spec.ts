import { expect } from '@playwright/test'
import { test } from './fixtures'
import { createRandomPage, enterNextBlock, systemModifier, IsMac } from './utils'
import { dispatch_kb_events } from './util/keyboard-events'
import * as kb_events from './util/keyboard-events'

test('hashtag and quare brackets in same line #4178', async ({ page }) => {
  await createRandomPage(page)

  await page.type('textarea >> nth=0', '#foo bar')
  await enterNextBlock(page)
  await page.type('textarea >> nth=0', 'bar [[blah]]', { delay: 100 })

  for (let i = 0; i < 12; i++) {
    await page.press('textarea >> nth=0', 'ArrowLeft')
  }
  await page.type('textarea >> nth=0', ' ')
  await page.press('textarea >> nth=0', 'ArrowLeft')

  await page.type('textarea >> nth=0', '#')
  await page.waitForSelector('text="Search for a page"', { state: 'visible' })

  await page.type('textarea >> nth=0', 'fo')

  await page.click('.absolute >> text=' + 'foo')

  expect(await page.inputValue('textarea >> nth=0')).toBe(
    '#foo bar [[blah]]'
  )
})

test('disappeared children #4814', async ({ page, block }) => {
  await createRandomPage(page)

  await block.mustType('parent')
  await block.enterNext()
  expect(await block.indent()).toBe(true)

  for (let i = 0; i < 5; i++) {
    await block.mustType(i.toString())
    await block.enterNext()
  }

  // collapse
  await page.click('.block-control >> nth=0')

  // expand
  await page.click('.block-control >> nth=0')

  await block.waitForBlocks(7) // 1 + 5 + 1 empty

  // Ensures there's no active editor
  await expect(page.locator('.editor-inner')).toHaveCount(0, { timeout: 500 })
})

test('create new page from bracketing text #4971', async ({ page, block }) => {
  let title = 'Page not Exists yet'
  await createRandomPage(page)

  await block.mustType(`[[${title}]]`)

  await page.keyboard.press(systemModifier('Control+o'))

  // Check page title equals to `title`
  await page.waitForTimeout(100)
  expect(await page.locator('h1.title').innerText()).toContain(title)

  // Check there're linked references
  await page.waitForSelector(`.references .ls-block >> nth=1`, { state: 'detached', timeout: 100 })
})

test.skip('backspace and cursor position #4897', async ({ page, block }) => {
  await createRandomPage(page)

  // Delete to previous block, and check cursor postion, with markup
  await block.mustFill('`012345`')
  await block.enterNext()
  await block.mustType('`abcdef', { toBe: '`abcdef`' }) // "`" auto-completes

  expect(await block.selectionStart()).toBe(7)
  expect(await block.selectionEnd()).toBe(7)
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press('ArrowLeft')
  }
  expect(await block.selectionStart()).toBe(0)

  await page.keyboard.press('Backspace')
  await block.waitForBlocks(1) // wait for delete and re-render
  expect(await block.selectionStart()).toBe(8)
})

test.skip('next block and cursor position', async ({ page, block }) => {
  await createRandomPage(page)

  // Press Enter and check cursor postion, with markup
  await block.mustType('abcde`12345', { toBe: 'abcde`12345`' }) // "`" auto-completes
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press('ArrowLeft')
  }
  expect(await block.selectionStart()).toBe(5) // after letter 'e'

  await block.enterNext()
  expect(await block.selectionStart()).toBe(0) // should at the beginning of the next block

  const locator = page.locator('textarea >> nth=0')
  await expect(locator).toHaveText('`12345`', { timeout: 1000 })
})

test(
  "Press CJK Left Black Lenticular Bracket `【` by 2 times #3251 should trigger [[]], " +
  "but dont trigger RIME #3440 ",
  // cases should trigger [[]] #3251
  async ({ page, block }) => {
    for (let [idx, events] of [
      kb_events.win10_pinyin_left_full_square_bracket,
      kb_events.macos_pinyin_left_full_square_bracket
      // TODO: support #3741
      // kb_events.win10_legacy_pinyin_left_full_square_bracket,
    ].entries()) {
      await createRandomPage(page)
      let check_text = "#3251 test " + idx
      await block.mustFill(check_text + "【")
      await dispatch_kb_events(page, ':nth-match(textarea, 1)', events)
      expect(await page.inputValue(':nth-match(textarea, 1)')).toBe(check_text + '【')
      await block.mustFill(check_text + "【【")
      await dispatch_kb_events(page, ':nth-match(textarea, 1)', events)
      expect(await page.inputValue(':nth-match(textarea, 1)')).toBe(check_text + '[[]]')
    };

    // dont trigger RIME #3440
    for (let [idx, events] of [
      kb_events.macos_pinyin_selecting_candidate_double_left_square_bracket,
      kb_events.win10_RIME_selecting_candidate_double_left_square_bracket
    ].entries()) {
      await createRandomPage(page)
      let check_text = "#3440 test " + idx
      await block.mustFill(check_text)
      await dispatch_kb_events(page, ':nth-match(textarea, 1)', events)
      expect(await page.inputValue(':nth-match(textarea, 1)')).toBe(check_text)
      await dispatch_kb_events(page, ':nth-match(textarea, 1)', events)
      expect(await page.inputValue(':nth-match(textarea, 1)')).toBe(check_text)
    }
  })

test('copy & paste block ref and replace its content', async ({ page, block }) => {
    await createRandomPage(page)

    await block.mustFill('Some random text')
    // FIXME: copy instantly will make content disappear
    await page.waitForTimeout(1000)
    if (IsMac) {
        await page.keyboard.press('Meta+c')
    } else {
        await page.keyboard.press('Control+c')
    }

    await page.press('textarea >> nth=0', 'Enter')
    if (IsMac) {
        await page.keyboard.press('Meta+v')
    } else {
        await page.keyboard.press('Control+v')
    }
    await page.keyboard.press('Enter')

    const blockRef = page.locator('.block-ref >> text="Some random text"');

    // Check if the newly created block-ref has the same referenced content
    await expect(blockRef).toHaveCount(1);

    // Move cursor into the block ref
    for (let i = 0; i < 4; i++) {
        await page.press('textarea >> nth=0', 'ArrowLeft')
}

    // Trigger replace-block-reference-with-content-at-point
    if (IsMac) {
        await page.keyboard.press('Meta+Shift+r')
    } else {
        await page.keyboard.press('Control+Shift+v')
    }
})

test('copy and paste block after editing new block', async ({ page, block }) => {
  await createRandomPage(page)

  // Create a block and copy it in block-select mode
  await block.mustFill('Block being copied')
  await page.waitForTimeout(100)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(100)
  if (IsMac) {
    await page.keyboard.press('Meta+c')
  } else {
    await page.keyboard.press('Control+c')
  }
  // await page.waitForTimeout(100)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(100)
  await page.keyboard.press('Enter')
  
  await page.waitForTimeout(100)
  // Create a new block with some text
  await page.keyboard.insertText("Typed block")

  // Quickly paste the copied block
  if (IsMac) {
      await page.keyboard.press('Meta+v')
  } else {
      await page.keyboard.press('Control+v')
  }

  await expect(page.locator('text="Typed block"')).toHaveCount(1);
})

// Type text1, wait, then text2 [[]], then undo, then redo. Should show text2, maybe also [[]]
test('undo and redo after starting an action', async ({ page, block }) => {
  await createRandomPage(page)

  // Get one piece of undo state onto the stack
  await block.mustFill('text1 ')
  await page.waitForTimeout(550) // Wait for 500ms autosave period to expire
  
  // Then type more, start an action prompt, and undo
  await page.keyboard.type('text2 [[')
  if (IsMac) {
    await page.keyboard.press('Meta+z')
  } else {
    await page.keyboard.press('Control+z')
  }
  await page.waitForTimeout(100)

  // Should close the action menu when we undo the action prompt
  await expect(page.locator('text="Search for a page"')).toHaveCount(0)

  // It should undo to the last saved state, and not erase the previous undo action too
  await expect(page.locator('text="text1"')).toHaveCount(1)

  // And it should keep what was undone as a redo action
  if (IsMac) {
    await page.keyboard.press('Meta+Shift+z')
  } else {
    await page.keyboard.press('Control+Shift+z')
  }
  await expect(page.locator('text="text2"')).toHaveCount(1)
})

// Type text1 /today<enter>, then undo. Should show text1. Should close the action menu.
test('undo after starting an action should close the action menu', async ({ page, block }) => {
  for (const [commandTrigger, modalName] of [['/', 'commands'], ['[[', 'page-search']]) {
    await createRandomPage(page)

    // Open the action modal
    await block.mustType('text1 ')
    await page.waitForTimeout(550)
    for (const char of commandTrigger) {
      await page.keyboard.type(char) // Type it one character at a time, because too quickly can fail to trigger it sometimes
    }
    await expect(page.locator(`[data-modal-name="${modalName}"]`)).toBeVisible()

    // Undo, removing "/today", and closing the action modal
    if (IsMac) {
      await page.keyboard.press('Meta+z')
    } else {
      await page.keyboard.press('Control+z')
    }
    await page.waitForTimeout(100)
    await expect(page.locator('text="/today"')).toHaveCount(0)
    await expect(page.locator(`[data-modal-name="${modalName}"]`)).not.toBeVisible()
  }
})

test('moving cursor outside of brackets should close action menu', async ({ page, block }) => {
  for (const [commandTrigger, modalName] of [['[[', 'page-search'], ['((', 'block-search']]) {
    // First, left arrow
    await createRandomPage(page)

    await block.mustFill('')
    await page.waitForTimeout(550)
    for (const char of commandTrigger) {
      await page.keyboard.type(char)
    }
    await expect(page.locator(`[data-modal-name="${modalName}"]`)).toBeVisible()
    
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(100)
    await expect(page.locator(`[data-modal-name="${modalName}"]`)).not.toBeVisible()

    // Then, right arrow
    await createRandomPage(page)

    await block.mustFill('text ')
    await page.waitForTimeout(550)
    for (const char of commandTrigger) {
      await page.keyboard.type(char)
    }
    await expect(page.locator(`[data-modal-name="${modalName}"]`)).toBeVisible()
    
    await page.waitForTimeout(100)
    // Move cursor outside of the space strictly between the double brackets
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(100)
    await expect(page.locator(`[data-modal-name="${modalName}"]`)).not.toBeVisible()
  }
})

test('pressing up and down should NOT close action menu', async ({ page, block }) => {
  for (const [commandTrigger, modalName] of [['[[', 'page-search'], ['((', 'block-search']]) {
    await createRandomPage(page)

    // Open the action modal
    await block.mustFill('text ')
    await page.waitForTimeout(550)
    for (const char of commandTrigger) {
      await page.keyboard.type(char)
    }
    await expect(page.locator(`[data-modal-name="${modalName}"]`)).toBeVisible()
    
    await page.keyboard.press('ArrowUp')
    await page.waitForTimeout(100)
    await expect(page.locator(`[data-modal-name="${modalName}"]`)).toBeVisible()
    
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(100)
    await expect(page.locator(`[data-modal-name="${modalName}"]`)).toBeVisible()
  }
})

test('moving cursor inside of brackets should NOT close action menu', async ({ page, block }) => {
  for (const [commandTrigger, modalName] of [['[[', 'page-search'], ['((', 'block-search']]) {
    await createRandomPage(page)

    // Open the action modal
    await block.mustFill('text ')
    await page.waitForTimeout(550)
    for (const char of commandTrigger) {
      await page.keyboard.type(char)
    }
    await page.waitForTimeout(100)
    await expect(page.locator(`[data-modal-name="${modalName}"]`)).toBeVisible()
    
    await page.keyboard.type("search")
    await page.waitForTimeout(100)
    await expect(page.locator(`[data-modal-name="${modalName}"]`)).toBeVisible()
    
    // Move cursor outside of the space strictly between the double brackets
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(100)
    await expect(page.locator(`[data-modal-name="${modalName}"]`)).toBeVisible()
  }
})

test('selecting text inside of brackets should NOT close action menu', async ({ page, block }) => {
  for (const [commandTrigger, modalName] of [['[[', 'page-search'], ['((', 'block-search']]) {
    await createRandomPage(page)

    // Open the action modal
    await block.mustFill('text ')
    await page.waitForTimeout(550)
    for (const char of commandTrigger) {
      await page.keyboard.type(char)
    }
    await page.waitForTimeout(100)
    await expect(page.locator(`[data-modal-name="${modalName}"]`)).toBeVisible()
    
    await page.keyboard.type("some page search text")
    await page.waitForTimeout(100)
    await expect(page.locator(`[data-modal-name="${modalName}"]`)).toBeVisible()
    
    // Move cursor outside of the space strictly between the double brackets
    await page.keyboard.press('Shift+ArrowLeft')
    await page.waitForTimeout(100)
    await expect(page.locator(`[data-modal-name="${modalName}"]`)).toBeVisible()
  }
})

test('pressing backspace and remaining inside of brackets should NOT close action menu', async ({ page, block }) => {
  for (const [commandTrigger, modalName] of [['[[', 'page-search'], ['((', 'block-search']]) {
    await createRandomPage(page)

    // Open the action modal
    await block.mustFill('text ')
    await page.waitForTimeout(550)
    for (const char of commandTrigger) {
      await page.keyboard.type(char)
    }
    await page.waitForTimeout(100)
    await expect(page.locator(`[data-modal-name="${modalName}"]`)).toBeVisible()
    
    await page.keyboard.type("some page search text")
    await page.waitForTimeout(100)
    await expect(page.locator(`[data-modal-name="${modalName}"]`)).toBeVisible()
    
    // Move cursor outside of the space strictly between the double brackets
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(100)
    await expect(page.locator(`[data-modal-name="${modalName}"]`)).toBeVisible()
  }
})

// type [[]], press escape, should exit action menu without exiting edit mode
test('press escape when action menu is open, should close action menu only', async ({ page, block }) => {
  for (const [commandTrigger, modalName] of [['[[', 'page-search']]) {
    await createRandomPage(page)

    // Open the action modal
    await block.mustFill('text ')
    await page.waitForTimeout(550)
    for (const char of commandTrigger) {
      await page.keyboard.type(char)
    }
    await page.waitForTimeout(100)
    await expect(page.locator(`[data-modal-name="${modalName}"]`)).toBeVisible()
    await page.waitForTimeout(100)
    
    // Press escape; should close action modal instead of exiting edit mode
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    await expect(page.locator(`[data-modal-name="${modalName}"]`)).not.toBeVisible()
    await page.waitForTimeout(1000)
    expect(await block.isEditing()).toBe(true)
  }
})

// New tests:
// - regression from my changes so far: sometimes cmd-z leaves `[[]]` around the cursor while removing undone text. Not sure repro steps yet.
// - (kinda unrelated) type stuff, wait, cmd-a, type stuff, undo -> should go back to empty text first, then previous text. Not directly to previous text
  // - Maybe do this whenever you do anything to a selection; save an undo state after pressing any input key when a selection is made
// TODO: What is the code that detects if you press backspace after typing [[]] and cancels the action menu? Can't find it yet.
// - lol, make sure backspace doesn't delete twice (why does this happen sometimes??)
//   - oh, it's hot reloading. Refreshing fixes it.
