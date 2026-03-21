import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const sendMock = vi.fn();

vi.mock('resend', () => ({
  Resend: vi.fn(function MockResend() {
    return {
      emails: {
        send: sendMock,
      },
    };
  }),
}));

import { isResendConfigured, resendConfigReason, sendTransactionalEmail } from './resend-transactional';

describe('isResendConfigured', () => {
  afterEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  it('returns false when RESEND_API_KEY is missing', () => {
    delete process.env.RESEND_API_KEY;
    expect(isResendConfigured()).toBe(false);
  });

  it('returns true when RESEND_API_KEY is set', () => {
    process.env.RESEND_API_KEY = 're_test_key';
    expect(isResendConfigured()).toBe(true);
  });
});

describe('resendConfigReason', () => {
  afterEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  it('explains missing API key', () => {
    delete process.env.RESEND_API_KEY;
    expect(resendConfigReason()).toBe('RESEND_API_KEY not configured');
  });

  it('returns empty when key exists', () => {
    process.env.RESEND_API_KEY = 're_x';
    expect(resendConfigReason()).toBe('');
  });
});

describe('sendTransactionalEmail', () => {
  beforeEach(() => {
    sendMock.mockReset();
    process.env.RESEND_API_KEY = 're_test_key';
    delete process.env.EMAIL_FROM;
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
  });

  it('returns error when RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY;
    const r = await sendTransactionalEmail({
      to: 'a@b.com',
      subject: 'T',
      text: 'x',
    });
    expect(r).toEqual({ ok: false, error: 'RESEND_API_KEY not configured' });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('sends plain text and returns ok on success', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_1' }, error: null });
    const r = await sendTransactionalEmail({
      to: 'user@example.com',
      subject: 'Hello',
      text: 'Body',
    });
    expect(r).toEqual({ ok: true });
    expect(sendMock).toHaveBeenCalledTimes(1);
    const arg = sendMock.mock.calls[0][0];
    expect(arg).toMatchObject({
      from: 'onboarding@resend.dev',
      to: 'user@example.com',
      subject: 'Hello',
      text: 'Body',
    });
    expect(arg.html).toBeUndefined();
  });

  it('uses EMAIL_FROM when set', async () => {
    process.env.EMAIL_FROM = 'App <hello@custom.com>';
    sendMock.mockResolvedValue({ data: { id: 'm2' }, error: null });
    await sendTransactionalEmail({ to: 'x@y.com', subject: 'S', text: 't' });
    expect(sendMock.mock.calls[0][0].from).toBe('App <hello@custom.com>');
  });

  it('sends html path when html is non-empty', async () => {
    sendMock.mockResolvedValue({ data: { id: 'm3' }, error: null });
    const r = await sendTransactionalEmail({
      to: 'x@y.com',
      subject: 'S',
      html: '<p>Hi</p>',
      text: 'fallback',
    });
    expect(r).toEqual({ ok: true });
    const arg = sendMock.mock.calls[0][0];
    expect(arg.html).toBe('<p>Hi</p>');
    expect(arg.text).toBe('fallback');
  });

  it('maps Resend API error to ok: false', async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { message: 'Invalid to address', statusCode: 422, name: 'validation_error' },
    });
    const r = await sendTransactionalEmail({ to: 'bad', subject: 'S', text: 't' });
    expect(r).toEqual({ ok: false, error: 'Invalid to address' });
  });

  it('returns error when Resend returns no id', async () => {
    sendMock.mockResolvedValue({ data: {}, error: null });
    const r = await sendTransactionalEmail({ to: 'x@y.com', subject: 'S', text: 't' });
    expect(r).toEqual({ ok: false, error: 'No message id returned' });
  });
});
