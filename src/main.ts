import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder} from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as express from 'express';

async function bootstrap() {

  const config = new DocumentBuilder()
  .setTitle('My API')
  .setDescription('API documentation for my project')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

  const logger = WinstonModule.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level}] ${message}`;
          }),
        ),
      }),

      new winston.transports.File({filename: 'logs/combined.log',level: 'info'}),

      new winston.transports.File({filename: 'logs/error.log',level: 'error'}),
    ]
  }); 

  const app = await NestFactory.create(AppModule,{ logger });
  app.use('/payment/webhook', express.raw({ type: 'application/json' }));
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
