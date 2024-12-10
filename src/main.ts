import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import helmet from "@fastify/helmet";
import fastifyRateLimiter from "@fastify/rate-limit";
import fastifyMultipart from "@fastify/multipart";
import { AppModule } from "@app/app.module";
import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ValidationError } from "class-validator";

/**
 * The URL endpoint for OpenAPI UI.
 * @type {string}
 */
export const SWAGGER_API_ROOT = "api/docs";

/**
 * The name of the API.
 * @type {string}
 */
export const SWAGGER_API_NAME = "API";

/**
 * A short description of the API.
 * @type {string}
 */
export const SWAGGER_API_DESCRIPTION = "API Description";

/**
 * Current version of the API.
 * @type {string}
 */
export const SWAGGER_API_CURRENT_VERSION = "1.0";

/**
 * Port on which the app runs.
 * @type {number}
 */
const { PORT } = process.env;

/**
 * Initializes and configures the NestJS application.
 */
(async () => {
  // Create the NestJS application with Fastify adapter
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true, bodyLimit: 50 * 1024 * 1024 }), // Set logger and body limit
  );

  // Configure Swagger options for API documentation
  const options = new DocumentBuilder()
    .setTitle(SWAGGER_API_NAME)
    .setDescription(SWAGGER_API_DESCRIPTION)
    .setVersion(SWAGGER_API_CURRENT_VERSION)
    .addBearerAuth() // Add bearer token authentication to Swagger
    .build();
  const document = SwaggerModule.createDocument(app, options);

  // Setup Swagger UI endpoint
  SwaggerModule.setup(SWAGGER_API_ROOT, app, document);

  // Enable Cross-Origin Resource Sharing (CORS)
  app.enableCors();

  // Register additional Fastify plugins
  await app.register(helmet as any); // Cast to 'any' for compatibility
  await app.register(fastifyRateLimiter as any, {
    max: 100,
    timeWindow: 60000,
  });
  await app.register(fastifyMultipart as any, {
    limits: {
      fileSize: 50 * 1024 * 1024, // Set file size limit to 50MB
    },
  });

  // Apply global validation pipe for request validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips non-decorated properties from objects
      exceptionFactory: (errors: ValidationError[]) => {
        const result =
          errors[0].constraints[Object.keys(errors[0].constraints)[0]];
        throw new BadRequestException(result);
      },
    }),
  );

  // Start the server and listen on all available network interfaces
  await app.listen({ port: +PORT || 9000, host: "0.0.0.0" });
})();
