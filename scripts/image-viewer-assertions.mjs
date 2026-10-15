import assert from 'node:assert/strict';
export async function checkViewer(page, width) {
  const viewer = page.locator('.image-viewer[open]'), stage = viewer.locator('.viewer-stage');
  await viewer.locator('img').waitFor();
  await page.waitForFunction(() => Number.parseFloat(document.querySelector('.image-viewer[open] img')?.style.width) > 0);
  const geometry = await viewer.evaluate(dialog => {
    const image = dialog.querySelector('img').getBoundingClientRect(), area = dialog.querySelector('.viewer-stage').getBoundingClientRect();
    return { fits: image.left >= area.left && image.right <= area.right && image.top >= area.top && image.bottom <= area.bottom,
      border: getComputedStyle(dialog.querySelector('img')).outlineWidth,
      metadataTransform: getComputedStyle(dialog.querySelector('.viewer-metadata')).transform,
      touchAction: getComputedStyle(dialog.querySelector('.viewer-stage')).touchAction,
      overflow: document.documentElement.scrollWidth > innerWidth + 2 };
  });
  assert(geometry.fits, 'Original must fit completely'); assert(!geometry.overflow, 'No horizontal overflow');
  assert.equal(geometry.metadataTransform, 'none'); assert.equal(geometry.touchAction, 'none');
  assert.equal(await stage.getAttribute('data-zoom'), '1');
  assert.equal(await viewer.locator('.viewer-help').isVisible(), width > 600);
  if (width > 600) {
    assert.equal(geometry.border, '2px');
    assert.equal(await viewer.locator('.viewer-help').innerText(), 'Zoom: Rueda del mouse ó en teclado +,-');
    await stage.hover(); await page.mouse.wheel(0, -100);
    await page.waitForFunction(() => Number(document.querySelector('.image-viewer[open] .viewer-stage').dataset.zoom) > 1);
    await page.mouse.wheel(0, 100);
    await viewer.getByRole('button', { name: 'Ajustar a pantalla', exact: true }).click();
    await page.keyboard.press('+'); assert(Number(await stage.getAttribute('data-zoom')) > 1);
    await page.keyboard.press('-'); assert.equal(await stage.getAttribute('data-zoom'), '1');
  } else {
    // Pointer Events are shared by Android, iOS and Windows touch. Synthetic events test the handler,
    // not physical hardware. Unit tests also cover the gesture geometry.
    await stage.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch', button: 0, clientX: 100, clientY: 250 });
    await stage.dispatchEvent('pointerdown', { pointerId: 2, pointerType: 'touch', button: 0, clientX: 200, clientY: 250 });
    await stage.dispatchEvent('pointermove', { pointerId: 2, pointerType: 'touch', clientX: 250, clientY: 250 });
    assert(Number(await stage.getAttribute('data-zoom')) > 1);
    await stage.dispatchEvent('pointerup', { pointerId: 1 }); await stage.dispatchEvent('pointerup', { pointerId: 2 });
    await viewer.getByRole('button', { name: 'Ajustar a pantalla', exact: true }).click();
  }
  await viewer.getByRole('button', { name: 'Acercar', exact: true }).click();
  assert(Number(await stage.getAttribute('data-zoom')) > 1);
  await viewer.getByRole('button', { name: 'Alejar', exact: true }).click();
  assert.equal(await stage.getAttribute('data-zoom'), '1');
  assert(await viewer.getByRole('button', { name: 'Cerrar', exact: true }).isVisible());
}
