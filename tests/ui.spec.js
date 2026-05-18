const { expect, test } = require('@playwright/test');

const expectedWorkTitles = [
  'Untitled',
  'All-American Performance (3:15)',
  'The Tea Tastes Funny',
  'Something is Killing the Kids',
  'Indulgence Numbs Rational Inquiry',
  'New World Order',
];

async function openSite(page) {
  await page.addInitScript(() => {
    let seed = 123456789;
    Math.random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    let frameCount = 0;
    let now = 1000;
    const nativeRequestAnimationFrame = window.requestAnimationFrame.bind(window);
    const nativePerformanceNow = performance.now.bind(performance);

    Object.defineProperty(performance, 'now', {
      configurable: true,
      value: () => now,
    });

    window.__restoreBrowserTiming = () => {
      window.requestAnimationFrame = nativeRequestAnimationFrame;
      Object.defineProperty(performance, 'now', {
        configurable: true,
        value: nativePerformanceNow,
      });
    };
    window.__freezeRenderLoop = false;
    window.__testFrameCount = 0;
    window.requestAnimationFrame = callback => nativeRequestAnimationFrame(() => {
      if (window.__freezeRenderLoop) return;

      frameCount += 1;
      window.__testFrameCount = frameCount;
      now += 1000 / 60;
      callback(now);
    });
  });

  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#name')).toHaveText(/eduardo enrique/i);
  await expect(page.locator('#consentBox')).toBeVisible({ timeout: 45_000 });
  await expect(page.locator('#acknowledge')).toBeVisible();
  await page.waitForTimeout(1200);

  return runtimeErrors;
}

async function acceptDisclaimer(page) {
  await page.locator('#acknowledge').click();
  await expect(page.locator('#loadingScreen')).toBeHidden({ timeout: 5000 });
}

async function expectCanvasToFillViewport(page) {
  const canvasBounds = await page.locator('canvas').boundingBox();
  const viewport = page.viewportSize();

  expect(canvasBounds).not.toBeNull();
  expect(canvasBounds.width).toBeGreaterThanOrEqual(viewport.width);
  expect(canvasBounds.height).toBeGreaterThanOrEqual(viewport.height);
}

async function freezeCanvasAfterFrames(page, frames = 30) {
  const targetFrame = await page.evaluate(frameCount => window.__testFrameCount + frameCount, frames);
  await page.waitForFunction(target => window.__testFrameCount >= target, targetFrame, { timeout: 10_000 });
  await page.evaluate(() => {
    window.__freezeRenderLoop = true;
    window.__restoreBrowserTiming();
  });
  await page.waitForTimeout(100);
}

async function hideUiForCanvasScreenshot(page) {
  return page.addStyleTag({
    content: `
      #headerBox,
      #loadingScreen,
      #menuCatcher,
      #menuContent,
      #selectedWorks {
        visibility: hidden !important;
        opacity: 0 !important;
      }
    `,
  });
}

async function hideCanvasForOverlayScreenshot(page) {
  return page.addStyleTag({
    content: `
      html,
      body {
        background: #e8e8e8 !important;
      }

      canvas {
        visibility: hidden !important;
        opacity: 0 !important;
      }
    `,
  });
}

async function expectNoOverlap(page, firstSelector, secondSelector) {
  const firstBox = await page.locator(firstSelector).boundingBox();
  const secondBox = await page.locator(secondSelector).boundingBox();

  expect(firstBox).not.toBeNull();
  expect(secondBox).not.toBeNull();

  const overlaps = !(
    firstBox.x + firstBox.width <= secondBox.x ||
    secondBox.x + secondBox.width <= firstBox.x ||
    firstBox.y + firstBox.height <= secondBox.y ||
    secondBox.y + secondBox.height <= firstBox.y
  );

  expect(overlaps).toBe(false);
}

test('visual baseline for disclosure and menu overlays', async ({ page }) => {
  const runtimeErrors = await openSite(page);

  await expect(page).toHaveScreenshot('disclaimer.png', {
    animations: 'disabled',
  });

  await acceptDisclaimer(page);
  await expectCanvasToFillViewport(page);
  await freezeCanvasAfterFrames(page);
  const uiHider = await hideUiForCanvasScreenshot(page);
  await expect(page).toHaveScreenshot('scene-canvas.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.002,
  });
  await uiHider.evaluate(style => style.remove());

  await page.locator('#aboutButton').click();
  await expect(page.locator('#aboutButton')).toHaveClass(/focused/);
  await expect(page.locator('#about')).toBeVisible();
  await expect(page.locator('#contact')).toBeHidden();
  await expectNoOverlap(page, '#about', '#shopButton');
  const canvasHider = await hideCanvasForOverlayScreenshot(page);
  await expect(page).toHaveScreenshot('about-overlay.png', {
    animations: 'disabled',
  });

  await page.locator('#contactButton').click();
  await expect(page.locator('#contactButton')).toHaveClass(/focused/);
  await expect(page.locator('#contact')).toBeVisible();
  await expect(page.locator('#about')).toBeHidden();
  await expect(page.locator('#subscribeInput')).toBeVisible();
  await expectNoOverlap(page, '#contact', '#shopButton');
  await expect(page).toHaveScreenshot('contact-overlay.png', {
    animations: 'disabled',
  });
  await canvasHider.evaluate(style => style.remove());

  expect(runtimeErrors).toEqual([]);
});

test('selected works data renders into the UI', async ({ page }) => {
  const runtimeErrors = await openSite(page);

  await expect(page.locator('.workItem')).toHaveCount(6);
  await expect(page.locator('.workItem img')).toHaveCount(6);

  const titles = await page.locator('.workItem').evaluateAll(items => items.map(item => item.dataset.title));
  const imageAlts = await page.locator('.workItem img').evaluateAll(images => images.map(image => image.alt));

  expect(titles.sort()).toEqual([...expectedWorkTitles].sort());
  expect(imageAlts.sort()).toEqual([...expectedWorkTitles].sort());

  expect(runtimeErrors).toEqual([]);
});
