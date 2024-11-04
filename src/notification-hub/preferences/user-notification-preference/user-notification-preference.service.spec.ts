import { Test, TestingModule } from '@nestjs/testing';
import { UserNotificationPreferenceService } from './user-notification-preference.service';

describe('UserNotificationPreferenceService', () => {
  let service: UserNotificationPreferenceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserNotificationPreferenceService],
    }).compile();

    service = module.get<UserNotificationPreferenceService>(UserNotificationPreferenceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
