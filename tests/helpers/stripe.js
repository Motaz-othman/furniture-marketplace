// Fill Stripe Payment Element with test card details.
// Stripe nests the actual card inputs inside sub-iframes within the outer Payment Element iframe,
// so we scan page.frames() directly rather than using a fixed frameLocator selector.
export async function fillStripeCard(page, cardNumber = '4242 4242 4242 4242') {
  // Wait for the outer Stripe iframe to appear.
  // Auth checkout needs extra time for the backend payment-intent creation before Stripe mounts.
  await page.waitForSelector('iframe[title="Secure payment input frame"]', { timeout: 60_000 });

  // Scan all frames until we find the one with each input field
  const fillInAnyFrame = async (placeholder, value, timeout = 20_000) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      for (const frame of page.frames()) {
        try {
          const el = await frame.$(`input[placeholder="${placeholder}"]`);
          if (el) {
            await frame.fill(`input[placeholder="${placeholder}"]`, value);
            return;
          }
        } catch {
          // frame may be detached or cross-origin restricted — skip
        }
      }
      await page.waitForTimeout(300);
    }
    throw new Error(`Stripe input "${placeholder}" not found in any frame after ${timeout}ms`);
  };

  await fillInAnyFrame('1234 1234 1234 1234', cardNumber);
  await fillInAnyFrame('MM / YY', '12 / 34');
  await fillInAnyFrame('CVC', '123');

  // ZIP / postal code (only rendered for some countries)
  for (const frame of page.frames()) {
    try {
      const el = await frame.$('input[placeholder="ZIP"]');
      if (el) {
        await frame.fill('input[placeholder="ZIP"]', process.env.STRIPE_TEST_ZIP || '30301');
        break;
      }
    } catch {}
  }
}
