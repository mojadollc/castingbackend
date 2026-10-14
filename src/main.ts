import { NestFactory, Reflector } from '@nestjs/core';
import { VersioningType, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';
import { SanitizePipe } from './common/pipes/sanitize.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bufferLogs: true,
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3000);
  const nodeEnv = config.get<string>('NODE_ENV', 'development');
  const appVersion = config.get<string>('APP_VERSION', '1.0.0');
  const allowedOrigins = config.get<string>('ALLOWED_ORIGINS', 'http://localhost:3001').split(',');

  // ─── API Versioning ────────────────────────────────────────────────────────
  // Strategy: URI versioning. All current controllers live under /api/v1/
  // via setGlobalPrefix. Future v2 controllers use @Version('2') decorator
  // which NestJS resolves to /api/v2/ automatically.
  app.enableVersioning({ type: VersioningType.URI });
  app.setGlobalPrefix('api/v1', {
    // Exclude health endpoint from versioned prefix
    exclude: ['/health', '/version'],
  });
  // Note: individual routes use /v1 via controller path prefix — see versioning strategy below

  // ─── Security headers ──────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    }),
  );

  // ─── CORS ──────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: nodeEnv === 'production' ? allowedOrigins : true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Version'],
    credentials: true,
    maxAge: 86400,
  });

  app.use(compression());

  // ─── Global pipes ──────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new SanitizePipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // ─── Global interceptors ───────────────────────────────────────────────────
  app.useGlobalInterceptors(
    new HttpLoggingInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  // ─── Swagger ───────────────────────────────────────────────────────────────
  setupSwagger(app, appVersion, nodeEnv);

  await app.listen(port);
  console.log(`[${nodeEnv}] API: http://localhost:${port}/api/v1`);
  if (nodeEnv !== 'production') {
    console.log(`Swagger: http://localhost:${port}/docs`);
  }
}

function setupSwagger(app: any, version: string, nodeEnv: string) {
  // Swagger available in all envs but protected by basic auth in production
  // (add nginx basic_auth in front of /docs in production)
  const config = new DocumentBuilder()
    .setTitle('Kids Casting Platform API')
    .setDescription(
      '## Kids Casting Platform — REST API\n\n' +
      '### Authentication\n' +
      'All endpoints require a Bearer JWT token unless marked **[Public]**.\n\n' +
      '### API Versioning\n' +
      'Current version: **v1** — all routes are prefixed `/api/v1/`.\n' +
      'Future versions will use `/api/v2/` for breaking changes only.\n\n' +
      '### Child Privacy\n' +
      '`GET /v1/talents/:id` returns different fields depending on the viewer role:\n' +
      '- **Guardian (owner)**: full profile including exact DOB\n' +
      '- **Professional**: age range only, last name initial, country only\n' +
      '- **Public**: first name, age range, headshot, bio only\n',
    )
    .setVersion(version)
    .setContact('Kids Casting Support', 'https://kidscasting.com', 'support@kidscasting.com')
    .setLicense('Proprietary', '')
    .addServer('http://localhost:3000', 'Local Development')
    .addServer('https://api.kidscasting.com', 'Production')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', name: 'Authorization', in: 'header' },
      'JWT',
    )
    // ── Tag groups in display order ──────────────────────────────────────────
    .addTag('Authentication', 'Register, login, logout, refresh tokens, email/phone verification, MFA')
    .addTag('Users', 'User account management')
    .addTag('Guardian', 'Guardian profile and dashboard')
    .addTag('Talents', 'Talent profiles, media, skills, languages, credits, comp cards')
    .addTag('Professionals', 'Casting professional profiles, documents, verification')
    .addTag('Organizations', 'Production company management and team members')
    .addTag('Casting', 'Casting projects and roles lifecycle (DRAFT → PUBLISHED → CLOSED)')
    .addTag('Public Search', 'Public casting search — no authentication required')
    .addTag('Search', 'Advanced casting and talent search with faceted filters')
    .addTag('Applications', 'Guardian submits/withdraws applications')
    .addTag('Casting Applications', 'Professional reviews and manages applications')
    .addTag('Talent Applications', 'Talent-scoped application views')
    .addTag('Shortlists', 'Shortlist management and talent comparison')
    .addTag('Invitations', 'Professional invites talent to audition')
    .addTag('Auditions', 'Audition scheduling, self-tape, callbacks')
    .addTag('Conversations', 'Guardian-routed messaging (Professional → Guardian only)')
    .addTag('Notifications', 'In-app notifications and delivery preferences')
    .addTag('Plans', 'Subscription plan catalogue')
    .addTag('Payments & Subscriptions', 'Subscriptions, payments, invoices, Stripe webhooks')
    .addTag('Media', 'S3 presigned upload URLs and media processing')
    .addTag('Recommendations', 'AI-powered casting and talent recommendations')
    .addTag('AI Services', 'Advisory photo analysis (lighting, clarity, framing)')
    .addTag('CMS — Public', 'Pages, blog, FAQs, reviews, safety policy, labor laws')
    .addTag('Reports', 'User-submitted reports and appeals')
    .addTag('Admin — Users', 'Admin user management')
    .addTag('Admin — Safety', 'Moderation queue, enforcement, appeals, audit trail')
    .addTag('Admin — Analytics', 'Platform analytics and full audit log')
    .addTag('Admin — CMS', 'Content management for pages and blog')
    .addTag('Health', 'Health check and version endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',       // collapsed by default — cleaner for large APIs
      filter: true,               // enable search box
      showRequestDuration: true,
    },
    customSiteTitle: 'Kids Casting API Docs',
    customCss: '.swagger-ui .topbar { background-color: #1a1a2e; }',
  });
}

bootstrap();
