import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.setGlobalPrefix('api');
  const configuredOrigins = process.env.CORS_ORIGIN?.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const devOrigins = [
    'http://localhost:3000',
    'http://localhost:3002',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3002',
  ];
  app.enableCors({
    origin: (requestOrigin, callback) => {
      if (!requestOrigin) {
        callback(null, true);
        return;
      }
      if (process.env.NODE_ENV !== 'production') {
        if (
          !configuredOrigins?.length ||
          configuredOrigins.includes(requestOrigin) ||
          devOrigins.includes(requestOrigin)
        ) {
          callback(null, true);
          return;
        }
      }
      if (configuredOrigins?.includes(requestOrigin)) {
        callback(null, true);
        return;
      }
      callback(null, process.env.NODE_ENV !== 'production');
    },
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(
    `API listening on :${port} (analytics: summary, timeseries, by-property, by-channel)`,
  );
}

bootstrap();
