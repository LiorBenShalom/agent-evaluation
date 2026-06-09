import { getCurrentContext } from '@kaltura/services-common';
import { runWithContext } from '@kaltura/services-common/middleware/request-context.middleware';

/**
 * Initialize the request context with the given user and partner.
 * The function to run in the request context.
 */
export const mockKalturaRequestContext = (
  fx: () => unknown,
  { userId = 'daniel@kaltura.com', partnerId = 1234 }: { userId?: string; partnerId?: number } = {},
) => {
  return async (): Promise<void> => {
    await runWithContext(async () => {
      getCurrentContext().session.ksPartnerId = partnerId;
      getCurrentContext().session.userId = userId;
      await fx();
    });
  };
};

export const mockKalturaRequestContextMiddleware = ({
  userId = 'daniel@kaltura.com',
  partnerId = 1234,
}: { userId?: string; partnerId?: number } = {}) => {
  return async (_req: unknown, _res: unknown, next: () => void): Promise<void> => {
    await runWithContext(async () => {
      getCurrentContext().session.partnerId = partnerId;
      getCurrentContext().session.ksPartnerId = partnerId;
      getCurrentContext().session.userId = userId;
      next();
    });
  };
};
