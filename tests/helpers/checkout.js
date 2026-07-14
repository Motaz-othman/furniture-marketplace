// Fill checkout Step 1 (shipping info) — uses field IDs to avoid strict mode conflicts
export async function fillShippingStep(page, overrides = {}) {
  const data = {
    firstName: 'John',
    lastName: 'Doe',
    email: `test+${Date.now()}@playwright.com`,
    phone: '4045551234',
    street: '123 Peachtree St NE',
    apartment: 'Apt 5',
    zip: '30301',
    ...overrides,
  };

  // Email field only visible for guest (not shown when logged in)
  const emailField = page.locator('#email');
  if (await emailField.isVisible()) await emailField.fill(data.email);

  await page.locator('#firstName').fill(data.firstName);
  await page.locator('#lastName').fill(data.lastName);
  await page.locator('#phone').fill(data.phone);

  // ZIP first — triggers city/state lookup
  const zipField = page.locator('#zipCode');
  if (await zipField.isVisible()) {
    await zipField.fill(data.zip);
    await page.waitForTimeout(800); // let city/state autofill settle
  }

  await page.locator('#street').fill(data.street);

  const aptField = page.locator('#apartment');
  if (await aptField.isVisible()) await aptField.fill(data.apartment);

  return data;
}

export function guestEmail() {
  return `test+${Date.now()}@playwright.com`;
}
