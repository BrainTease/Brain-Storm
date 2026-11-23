import {
  createCredentialIssuanceFixture,
  TEST_CREDENTIAL_IDS,
} from '../fixtures/credential-issuance';

describe('credential issuance end-to-end (#1519)', () => {
  it('issues, persists, lists, and publicly verifies a Stellar credential', async () => {
    const fixture = createCredentialIssuanceFixture();

    const issued = await fixture.controller.issue({
      userId: TEST_CREDENTIAL_IDS.user,
      courseId: TEST_CREDENTIAL_IDS.course,
      stellarPublicKey: TEST_CREDENTIAL_IDS.publicKey,
    });

    expect(issued.id).toBe(TEST_CREDENTIAL_IDS.credential);
    expect(issued.txHash).toBe(TEST_CREDENTIAL_IDS.txHash);
    expect(fixture.stellarService.issueCredential).toHaveBeenCalledWith(
      TEST_CREDENTIAL_IDS.publicKey,
      TEST_CREDENTIAL_IDS.course
    );
    expect(fixture.stellarService.mintReward).toHaveBeenCalledWith(
      TEST_CREDENTIAL_IDS.publicKey,
      100
    );

    const listed = await fixture.controller.findByUser(TEST_CREDENTIAL_IDS.user);
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe(issued.id);

    const verification = await fixture.publicController.verifyById(issued.id);
    expect(verification).toMatchObject({
      credentialId: issued.id,
      txHash: TEST_CREDENTIAL_IDS.txHash,
      courseTitle: 'Stellar Basics',
      status: 'valid',
      onChain: { verified: true, ledger: 42 },
    });
  });

  it('returns an existing credential without issuing a second Stellar transaction', async () => {
    const fixture = createCredentialIssuanceFixture();
    const request = {
      userId: TEST_CREDENTIAL_IDS.user,
      courseId: TEST_CREDENTIAL_IDS.course,
      stellarPublicKey: TEST_CREDENTIAL_IDS.publicKey,
    };

    const first = await fixture.controller.issue(request);
    const repeated = await fixture.controller.issue(request);

    expect(repeated.id).toBe(first.id);
    expect(fixture.stellarService.issueCredential).toHaveBeenCalledTimes(1);
    expect(fixture.records.size).toBe(1);
  });
});
