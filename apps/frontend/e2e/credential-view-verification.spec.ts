import { expect, test } from './fixtures/determinism';

const USER = {
  id: 'credential-view-e2e-user',
  username: 'credential-holder',
  email: 'credential-holder@example.com',
  role: 'student',
};

const CREDENTIAL = {
  id: 'credential-view-e2e',
  courseId: 'stellar-course',
  courseName: 'Stellar Smart Contracts',
  issuedAt: '2026-01-01T00:00:00.000Z',
  txHash: 'stellar-credential-tx-e2e',
  description: 'Completed the Stellar Smart Contracts course.',
};

test('views a credential and exposes its Stellar transaction verification link', async ({
  deterministicPage: page,
}) => {
  await page.addInitScript(({ user }) => {
    const payload = btoa(JSON.stringify({ sub: user.id, exp: 9_999_999_999 }));
    const token = `header.${payload}.signature`;
    localStorage.setItem(
      'auth',
      JSON.stringify({
        state: { token, user, hasHydrated: true },
        version: 0,
      })
    );
  }, { user: USER });

  await page.route('**/credentials/credential-view-e2e-user', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([CREDENTIAL]),
    })
  );

  await page.goto('/credentials');

  await expect(page.getByText(CREDENTIAL.courseName)).toBeVisible();
  await expect(page.getByRole('link', { name: /verify tx/i })).toHaveAttribute(
    'href',
    `https://stellar.expert/explorer/testnet/tx/${CREDENTIAL.txHash}`
  );

  await page.getByRole('button', { name: 'View', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Certificate of Completion' })).toBeVisible();
  await expect(page.getByText(new RegExp(`Tx: ${CREDENTIAL.txHash}`))).toBeVisible();
  await expect(page.getByRole('link', { name: /view on stellar blockchain/i })).toHaveAttribute(
    'href',
    `https://stellar.expert/explorer/testnet/tx/${CREDENTIAL.txHash}`
  );
});
