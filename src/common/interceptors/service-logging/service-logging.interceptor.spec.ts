import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError, firstValueFrom } from 'rxjs';
import { ServiceLoggingInterceptor } from './service-logging.interceptor';

describe('ServiceLoggingInterceptor', () => {
  let interceptor: ServiceLoggingInterceptor;
  let reflector: Reflector;
  let mockLogger: Partial<Record<keyof Console, jest.Mock>>;

  beforeEach(async () => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceLoggingInterceptor,
        Reflector,
        { provide: Logger, useValue: mockLogger },
      ],
    }).compile();

    interceptor = module.get<ServiceLoggingInterceptor>(ServiceLoggingInterceptor);
    reflector = module.get<Reflector>(Reflector);

    // Mock console logs in the interceptor for testing
    jest.spyOn(interceptor['logger'], 'log').mockImplementation(mockLogger.log);
    jest.spyOn(interceptor['logger'], 'error').mockImplementation(mockLogger.error);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to create a mock ExecutionContext
function createMockExecutionContext(className: string, methodName: string): ExecutionContext {
  return {
    getClass: () => ({ name: className }),
    getHandler: () => ({ name: methodName }),
    switchToHttp: jest.fn(),
  } as unknown as ExecutionContext;
}

  it('SLI-01: Basic Invocation - should not log anything if @ServiceLog is not present', (done) => {
    const context = createMockExecutionContext('TestClass', 'testMethod');
    jest.spyOn(reflector, 'get').mockReturnValue(undefined); // No decorator metadata

    const next: CallHandler = {
      handle: () => of('test response'),
    };

    interceptor.intercept(context, next).subscribe(() => {
      expect(mockLogger.log).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
      done();
    });
  });

  it('SLI-02 & SLI-03: Log Start and Completion - should log start and completion messages when @ServiceLog is present', (done) => {
    const context = createMockExecutionContext('TestClass', 'testMethod');
    jest.spyOn(reflector, 'get').mockReturnValue('Test Service Log Message');

    const next: CallHandler = {
      handle: () => of('test response'),
    };

    interceptor.intercept(context, next).subscribe(() => {
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Starting Test Service Log Message in TestClass.testMethod')
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Completed Test Service Log Message in TestClass.testMethod')
      );
      done();
    });
  });

  it('SLI-04: Error Handling with Log Message - should log an error and start message but not completion message', async () => {
    const context = createMockExecutionContext('TestClass', 'testMethod');
    jest.spyOn(reflector, 'get').mockReturnValue('Test Service Log Message');
  
    const next: CallHandler = {
      handle: () => throwError(() => new Error('Test error')),
    };
  
    try {
      await firstValueFrom(interceptor.intercept(context, next));
    } catch (error) {
      // Check that the start message was logged
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Starting Test Service Log Message in TestClass.testMethod')
      );
  
      // Check that an error message was logged containing the key parts
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error in Test Service Log Message in TestClass.testMethod')
      );
  
      // Ensure that the completion log was not called
      expect(mockLogger.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Completed Test Service Log Message in TestClass.testMethod')
      );
    }
  });
  
  it('SLI-05: Verify Logger Method Calls - should verify Logger.log calls with correct message', (done) => {
    const context = createMockExecutionContext('TestClass', 'testMethod');
    jest.spyOn(reflector, 'get').mockReturnValue('Test Service Log Message');

    const next: CallHandler = {
      handle: () => of('test response'),
    };

    interceptor.intercept(context, next).subscribe(() => {
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Starting Test Service Log Message')
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Completed Test Service Log Message')
      );
      done();
    });
  });

  it('SLI-06: Log Execution Time - should log execution time for the method', (done) => {
    const context = createMockExecutionContext('TestClass', 'testMethod');
    jest.spyOn(reflector, 'get').mockReturnValue('Test Service Log Message');

    const next: CallHandler = {
      handle: () => of('test response'),
    };

    interceptor.intercept(context, next).subscribe(() => {
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Execution Time:')
      );
      done();
    });
  });

  it('SLI-07: Error without `ServiceLog` Message - should propagate error without logging any message if ServiceLog is absent', async () => {
    const context = createMockExecutionContext('TestClass', 'testMethod');
    jest.spyOn(reflector, 'get').mockReturnValue(undefined); // No decorator metadata

    const next: CallHandler = {
      handle: () => throwError(() => new Error('Test error')),
    };

    try {
      await firstValueFrom(interceptor.intercept(context, next));
    } catch (error) {
      expect(mockLogger.log).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    }
  });

  it('SLI-08: Verify Reflector Usage - should call Reflector.get with correct arguments', (done) => {
    // Arrange
    const context = createMockExecutionContext('TestClass', 'testMethod');
    const reflectorSpy = jest.spyOn(reflector, 'get').mockReturnValue('Test Service Log Message');

    const next: CallHandler = {
      handle: () => of('test response'),
    };

    // Act
    interceptor.intercept(context, next).subscribe(() => {
      // Assert
      expect(reflectorSpy).toHaveBeenCalledWith('serviceLog', context.getHandler());
      done();
    });
  })

  it('SLI-09: Error Handling without ServiceLog - should propagate error without logging any message if ServiceLog is absent', async () => {
    // Arrange
    const context = createMockExecutionContext('TestClass', 'testMethod');
    jest.spyOn(reflector, 'get').mockReturnValue(undefined); // No @ServiceLog metadata

    const next: CallHandler = {
      handle: () => throwError(() => new Error('Test error without ServiceLog')),
    };

    // Act & Assert
    await expect(firstValueFrom(interceptor.intercept(context, next))).rejects.toThrow('Test error without ServiceLog');

    // Verify that neither start, completion, nor error logs were generated
    expect(mockLogger.log).not.toHaveBeenCalled();
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('SLI-10: Multiple Method Invocations - should log start and completion only for methods with ServiceLog metadata', (done) => {
    // Arrange
    const contextWithServiceLog = createMockExecutionContext('TestClass', 'methodWithServiceLog');
    const contextWithoutServiceLog = createMockExecutionContext('TestClass', 'methodWithoutServiceLog');
    
    // Set up Reflector to return a message for methods with @ServiceLog, and undefined for methods without it
    const reflectorSpy = jest.spyOn(reflector, 'get')
      .mockImplementation((metadataKey, target) => {
        if (target.name === 'methodWithServiceLog') return 'Service Log Message for methodWithServiceLog';
        return undefined;
      });

    const next: CallHandler = {
      handle: () => of('test response'),
    };

    // Act - Invoke interceptor for both methods
    interceptor.intercept(contextWithServiceLog, next).subscribe(() => {
      interceptor.intercept(contextWithoutServiceLog, next).subscribe(() => {
        // Assert
        // Check logs for method with @ServiceLog
        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringContaining('Starting Service Log Message for methodWithServiceLog in TestClass.methodWithServiceLog')
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringContaining('Completed Service Log Message for methodWithServiceLog in TestClass.methodWithServiceLog')
        );

        // Check that no logs were generated for the method without @ServiceLog
        expect(reflectorSpy).toHaveBeenCalledWith('serviceLog', contextWithServiceLog.getHandler());
        expect(reflectorSpy).toHaveBeenCalledWith('serviceLog', contextWithoutServiceLog.getHandler());

        // Ensure only two log entries (start and completion) for the method with metadata
        expect(mockLogger.log).toHaveBeenCalledTimes(2);
        done();
      });
    });
  });

  it('SLI-11: Log Error with ServiceLog Message - should log error with ServiceLog message and propagate the error', async () => {
    // Arrange
    const context = createMockExecutionContext('TestClass', 'methodWithServiceLog');
    jest.spyOn(reflector, 'get').mockReturnValue('Service Log Message for Error Case');
  
    const next: CallHandler = {
      handle: () => throwError(() => new Error('Test error with ServiceLog')),
    };
  
    // Act & Assert
    await expect(firstValueFrom(interceptor.intercept(context, next))).rejects.toThrow('Test error with ServiceLog');
  
    // Verify that the start message was logged
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Starting Service Log Message for Error Case in TestClass.methodWithServiceLog')
    );
  
    // Access the error log and check both message components
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    const errorLogCall = mockLogger.error.mock.calls[0];
  
    expect(errorLogCall[0]).toContain('Error in Service Log Message for Error Case in TestClass.methodWithServiceLog');
    expect(errorLogCall[0]).toContain('Test error with ServiceLog'); // Check for error message in the first argument
  
    // Ensure that the completion log was not called due to the error
    expect(mockLogger.log).not.toHaveBeenCalledWith(
      expect.stringContaining('Completed Service Log Message for Error Case in TestClass.methodWithServiceLog')
    );
  });
  
  it('SLI-12: Error without ServiceLog Message - should propagate error without logging any error message', async () => {
    // Arrange
    const context = createMockExecutionContext('TestClass', 'methodWithoutServiceLog');
    jest.spyOn(reflector, 'get').mockReturnValue(undefined); // No @ServiceLog metadata

    const next: CallHandler = {
      handle: () => throwError(() => new Error('Test error without ServiceLog')),
    };

    // Act & Assert
    await expect(firstValueFrom(interceptor.intercept(context, next))).rejects.toThrow('Test error without ServiceLog');

    // Verify that no log or error messages were generated
    expect(mockLogger.log).not.toHaveBeenCalled();
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('SLI-13: Error Log and No Completion Log - should log start and error messages, but not completion message', async () => {
    // Arrange
    const context = createMockExecutionContext('TestClass', 'methodWithServiceLog');
    jest.spyOn(reflector, 'get').mockReturnValue('Service Log Message for Error Case');
  
    const next: CallHandler = {
      handle: () => throwError(() => new Error('Test error before completion')),
    };
  
    // Act & Assert
    await expect(firstValueFrom(interceptor.intercept(context, next))).rejects.toThrow('Test error before completion');
  
    // Verify that the start message was logged
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Starting Service Log Message for Error Case in TestClass.methodWithServiceLog')
    );
  
    // Access the error log and check both message components
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    const errorLogCall = mockLogger.error.mock.calls[0];
  
    expect(errorLogCall[0]).toContain('Error in Service Log Message for Error Case in TestClass.methodWithServiceLog');
    expect(errorLogCall[0]).toContain('Test error before completion'); // Check for error message in the first argument
  
    // Ensure that the completion log was not called due to the error
    expect(mockLogger.log).not.toHaveBeenCalledWith(
      expect.stringContaining('Completed Service Log Message for Error Case in TestClass.methodWithServiceLog')
    );
  });
  
});


