import { User } from './user.model';

describe('User Model', () => {
  let user: User;

  beforeEach(() => {
    user = new User();
    user.id = 1;
    user.email = 'test@example.com';
    user.name = 'Test User';
    user.phone = '123456789';
    user.profileImageUrl = 'https://example.com/profile.jpg';
    user.password = 'password123';
    user.createdAt = new Date();
    user.updatedAt = new Date();
    user.deletedAt = null; // not deleted
  });

  it('should be defined', () => {
    expect(user).toBeDefined();
  });

  it('should have the correct id', () => {
    expect(user.id).toBe(1);
  });

  it('should have the correct email', () => {
    expect(user.email).toBe('test@example.com');
  });

  it('should have the correct name', () => {
    expect(user.name).toBe('Test User');
  });

  it('should have the correct phone', () => {
    expect(user.phone).toBe('123456789');
  });

  it('should have the correct profile image URL', () => {
    expect(user.profileImageUrl).toBe('https://example.com/profile.jpg');
  });

  it('should have the correct password', () => {
    expect(user.password).toBe('password123');
  });

  it('should have the correct createdAt date', () => {
    expect(user.createdAt).toBeInstanceOf(Date);
  });

  it('should have the correct updatedAt date', () => {
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  it('should have a null deletedAt field when not deleted', () => {
    expect(user.deletedAt).toBeNull();
  });

  it('should allow setting deletedAt for soft delete', () => {
    const deleteDate = new Date();
    user.deletedAt = deleteDate;
    expect(user.deletedAt).toEqual(deleteDate);
  });
});
