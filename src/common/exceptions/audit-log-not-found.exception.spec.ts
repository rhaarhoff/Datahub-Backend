import { AuditLogNotFoundException } from './audit-log-not-found.exception';

describe('AuditLogNotFoundException', () => {
  it('should return a proper error message', () => {
    const exception = new AuditLogNotFoundException(123);
    expect(exception.message).toBe('Audit log with ID 123 not found.');
    expect(exception.getStatus()).toBe(404);
  });
});
