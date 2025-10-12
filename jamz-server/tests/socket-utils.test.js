const { requireSessionId } = require('../src/utils/socket-utils');

describe('requireSessionId', () => {
  test('returns sessionId from data.sessionId', () => {
    const data = { sessionId: 'abc123' };
    expect(requireSessionId(data)).toBe('abc123');
  });

  test('returns session_id from data.session_id', () => {
    const data = { session_id: 'xyz789' };
    expect(requireSessionId(data)).toBe('xyz789');
  });

  test('returns null for missing sessionId and logs truncated payload', () => {
    const data = { some: 'value', long: 'x'.repeat(500) };
    const logs = [];
    const fakeLogger = { warn: (...args) => logs.push(args.join(' ')) };

    const result = requireSessionId(data, { socketId: 'test-socket', logger: fakeLogger });
    expect(result).toBeNull();
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0]).toContain('Malformed socket payload');
    expect(logs[0]).toContain('test-socket');
    expect(logs[0]).toContain('...[truncated]');
  });
});
