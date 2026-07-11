import { expect, test } from '@playwright/test';

test('paid-call crash windows are explicit and inspectable', async ({
  request,
}) => {
  for (const paidCallCrash of [
    'AFTER_CALLBACK_COMMIT_BEFORE_ACK',
    'AFTER_SEND_BEFORE_DURABLE_RESPONSE',
  ]) {
    await request.post('/api/test-control', {
      data: { action: 'configure', config: { paidCallCrash } },
    });
    const state = await request
      .get('/api/test-control')
      .then((result) => result.json());
    expect(state.state.paidCallCrash).toBe(paidCallCrash);
  }
});
