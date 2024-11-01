import { Test, TestingModule } from '@nestjs/testing';
import { SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ServiceLog, SERVICE_LOG_KEY } from './service-log.decorator';

describe('ServiceLog Decorator', () => {
    let reflector: Reflector;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [Reflector],
        }).compile();

        reflector = module.get<Reflector>(Reflector);
    });

    // DEC-SLOG-01: Apply ServiceLog decorator with a specific message
    it('DEC-SLOG-01: should set serviceLog metadata on a method with a specific message', () => {
        class TestClass {
            @ServiceLog('Test Service Log Message')
            testMethod() { }
        }

        const metadata = Reflect.getMetadata(SERVICE_LOG_KEY, TestClass.prototype.testMethod);
        expect(metadata).toBe('Test Service Log Message');
    });

    // DEC-SLOG-02: Retrieve serviceLog metadata from a decorated method
    it('DEC-SLOG-02: should retrieve serviceLog metadata from a decorated method', () => {
        class TestClass {
            @ServiceLog('Retrieve Service Log Message')
            retrieveMethod() { }
        }

        const metadata = reflector.get(SERVICE_LOG_KEY, TestClass.prototype.retrieveMethod);
        expect(metadata).toBe('Retrieve Service Log Message');
    });

    // DEC-SLOG-03: Decorate multiple methods with different messages
    it('DEC-SLOG-03: should allow unique serviceLog metadata on multiple methods without conflicts', () => {
        class TestClass {
            @ServiceLog('Message One')
            methodOne() { }

            @ServiceLog('Message Two')
            methodTwo() { }
        }

        const metadataOne = Reflect.getMetadata(SERVICE_LOG_KEY, TestClass.prototype.methodOne);
        const metadataTwo = Reflect.getMetadata(SERVICE_LOG_KEY, TestClass.prototype.methodTwo);

        expect(metadataOne).toBe('Message One');
        expect(metadataTwo).toBe('Message Two');
    });

    // DEC-SLOG-04: Apply ServiceLog without ServiceLoggingInterceptor
    it('DEC-SLOG-04: should set serviceLog metadata even without the ServiceLoggingInterceptor', () => {
        class TestClass {
            @ServiceLog('Message without Interceptor')
            testMethod() { }
        }

        const metadata = Reflect.getMetadata(SERVICE_LOG_KEY, TestClass.prototype.testMethod);
        expect(metadata).toBe('Message without Interceptor');
    });

    // DEC-SLOG-05: Verify no serviceLog metadata on undecorated methods
    it('DEC-SLOG-05: should not set serviceLog metadata on undecorated methods', () => {
        class TestClass {
            testMethod() { }
        }

        const metadata = Reflect.getMetadata(SERVICE_LOG_KEY, TestClass.prototype.testMethod);
        expect(metadata).toBeUndefined();
    });

    // DEC-SLOG-06: Validate SERVICE_LOG_KEY consistency with interceptor expectations
    it('DEC-SLOG-06: should ensure SERVICE_LOG_KEY consistency with interceptor expectations', () => {
        expect(SERVICE_LOG_KEY).toBe('serviceLog');
    });

    // DEC-SLOG-07: Apply decorator with an empty string as the message
    it('DEC-SLOG-07: should allow setting serviceLog metadata with an empty string', () => {
        class TestClass {
            @ServiceLog('')
            testMethod() { }
        }

        const metadata = Reflect.getMetadata(SERVICE_LOG_KEY, TestClass.prototype.testMethod);
        expect(metadata).toBe('');
    });

    // DEC-SLOG-08: Ensure ServiceLog decorator returns MethodDecorator type
    it('DEC-SLOG-08: should ensure ServiceLog returns a MethodDecorator type', () => {
        const decorator = ServiceLog('Testing');
        expect(typeof decorator).toBe('function');
        expect(decorator).toBeInstanceOf(Function);
    });

    // DEC-SLOG-09: Confirm compatibility of ServiceLog with other metadata
    it('DEC-SLOG-09: should ensure ServiceLog is compatible with other metadata', () => {
        const Roles = (role: string) => SetMetadata('roles', role);

        class TestClass {
            @ServiceLog('Compatible Message')
            @Roles('admin')
            testMethod() { }
        }

        const serviceLogMetadata = reflector.get(SERVICE_LOG_KEY, TestClass.prototype.testMethod);
        const rolesMetadata = reflector.get('roles', TestClass.prototype.testMethod);

        expect(serviceLogMetadata).toBe('Compatible Message');
        expect(rolesMetadata).toBe('admin');
    });

    // DEC-SLOG-10: Apply decorator multiple times with varied messages
    it('DEC-SLOG-10: should apply the last ServiceLog message if redecorated', () => {
        class TestClass {
            @ServiceLog('First Message')
            testMethod() {
                return 'Test method executed';
            }
        }
    
        // Apply the decorator again with a new message to simulate update behavior
        Reflect.defineMetadata(SERVICE_LOG_KEY, 'Second Message', TestClass.prototype.testMethod);
    
        const metadata = Reflect.getMetadata(SERVICE_LOG_KEY, TestClass.prototype.testMethod);
        expect(metadata).toBe('Second Message');
    });

});
