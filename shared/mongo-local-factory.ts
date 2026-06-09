import { AppLogger } from '@kaltura/services-common';
import { MongooseModuleAsyncOptions } from '@nestjs/mongoose';

const logger = new AppLogger('MongoDBConnection');

export const getMongoFactory: (mongoUrl: string) => MongooseModuleAsyncOptions = (
  mongoUrl: string,
) => ({
  useFactory: async () => {
    logger.debug(
      `Starting MongoDB connection to: ${mongoUrl.replace(/\/\/[^:]+:[^@]+@/, '//*****:*****@')}`,
    );

    let reconnectTimeout: NodeJS.Timeout | null = null;

    return {
      uri: mongoUrl,
      serverSelectionTimeoutMS: 3000,
      socketTimeoutMS: 5000,
      connectTimeoutMS: 3000,
      maxPoolSize: 10,
      minPoolSize: 1,
      retryAttempts: 0,
      connectionFactory: connection => {
        // Check immediate state
        if (connection.readyState === 1) {
          logger.debug('✅ MongoDB connected successfully (immediate)');
        }

        connection.on('connected', () => {
          logger.debug('✅ MongoDB connected successfully');
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
            logger.debug('✅ Reconnected to MongoDB - timeout cleared');
          }
        });

        connection.on('error', (error: Error) => {
          logger.error('❌ MongoDB connection error', {
            error: error.message,
            name: error.name,
            stack: error.stack,
          });

          // Force exit on error if not yet connected
          if (connection.readyState !== 1) {
            logger.error('❌ MongoDB connection failed - forcing exit');
            setTimeout(() => process.exit(1), 1000);
          }
        });

        connection.on('disconnected', () => {
          logger.warn('⚠️ MongoDB disconnected - waiting 60 seconds for reconnection');

          reconnectTimeout = setTimeout(() => {
            logger.error('❌ MongoDB did not reconnect within 60 seconds - killing application');
            process.exit(1);
          }, 60000);
        });

        connection.on('connecting', () => {
          logger.debug('🔄 MongoDB connecting...');
        });

        connection.on('open', () => {
          logger.debug('✅ MongoDB connection opened');
        });

        return connection;
      },
    };
  },
});
