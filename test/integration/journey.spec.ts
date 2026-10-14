import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';

/**
 * Integration tests run against a real test database.
 * Set DATABASE_URL to a test DB before running:
 *   DATABASE_URL=postgresql://postgres:password@localhost:5432/casting_test npm run test:e2e
 *
 * These tests are skipped in CI unless TEST_DB_AVAILABLE=true is set.
 */
const RUN_INTEGRATION = process.env.TEST_DB_AVAILABLE === 'true';
const describeIf = RUN_INTEGRATION ? describe : describe.skip;

describeIf('Integration: Full User Journey', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Shared state across tests
  let guardianToken: string;
  let professionalToken: string;
  let talentId: string;
  let projectId: string;
  let roleId: string;
  let applicationId: string;

  const guardianEmail = `guardian-${Date.now()}@test.com`;
  const professionalEmail = `pro-${Date.now()}@test.com`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({ where: { email: { in: [guardianEmail, professionalEmail] } } });
    await app.close();
  });

  // ─── Register ──────────────────────────────────────────────────────────────

  it('POST /auth/register — guardian', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: guardianEmail, password: 'Test@1234', firstName: 'Jane', lastName: 'Guardian', role: 'GUARDIAN' })
      .expect(201);
    expect(res.body.message).toContain('Registration successful');
  });

  it('POST /auth/register — professional', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: professionalEmail, password: 'Test@1234', firstName: 'John', lastName: 'Pro', role: 'CASTING_PROFESSIONAL' })
      .expect(201);
  });

  // Manually verify emails for test users
  it('Verify emails for test users', async () => {
    await prisma.user.updateMany({
      where: { email: { in: [guardianEmail, professionalEmail] } },
      data: { emailVerifiedAt: new Date(), status: 'ACTIVE' },
    });
  });

  // ─── Login ─────────────────────────────────────────────────────────────────

  it('POST /auth/login — guardian', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: guardianEmail, password: 'Test@1234' })
      .expect(201);
    guardianToken = res.body.accessToken;
    expect(guardianToken).toBeDefined();
  });

  it('POST /auth/login — professional', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: professionalEmail, password: 'Test@1234' })
      .expect(201);
    professionalToken = res.body.accessToken;
    expect(professionalToken).toBeDefined();
  });

  // ─── Create Talent ─────────────────────────────────────────────────────────

  it('POST /guardian/talents — create talent', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/guardian/talents')
      .set('Authorization', `Bearer ${guardianToken}`)
      .send({
        firstName: 'Emma', lastName: 'Test', dateOfBirth: '2015-01-01',
        gender: 'FEMALE', countryId: null,
      })
      .expect(201);
    talentId = res.body.id;
    expect(talentId).toBeDefined();
  });

  // ─── Create Casting ────────────────────────────────────────────────────────

  it('POST /casting — create project', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/casting')
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({ title: 'Test Film', description: 'A test casting', isPaid: false, isRemote: true })
      .expect(201);
    projectId = res.body.id;
    expect(projectId).toBeDefined();
  });

  it('POST /casting/:id/roles — add role', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/casting/${projectId}/roles`)
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({ name: 'Lead Child', ageMin: 8, ageMax: 12, gender: 'FEMALE', spotsTotal: 1 })
      .expect(201);
    roleId = res.body.id;
    expect(roleId).toBeDefined();
  });

  it('POST /casting/:id/submit — submit for review', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/casting/${projectId}/submit`)
      .set('Authorization', `Bearer ${professionalToken}`)
      .expect(200);
  });

  // Manually publish for test
  it('Publish project for test', async () => {
    await prisma.castingProject.update({
      where: { id: projectId },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
  });

  // ─── Apply ─────────────────────────────────────────────────────────────────

  it('POST /applications — submit application', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${guardianToken}`)
      .send({ talentId, projectId, roleId, coverNote: 'Emma would be perfect!' })
      .expect(201);
    applicationId = res.body.id;
    expect(applicationId).toBeDefined();
  });

  it('POST /applications — duplicate application returns 409', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${guardianToken}`)
      .send({ talentId, projectId, roleId })
      .expect(409);
  });

  // ─── Shortlist ─────────────────────────────────────────────────────────────

  it('POST /projects/:id/shortlists — create shortlist', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/shortlists`)
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({ name: 'Top Picks' })
      .expect(201);
    expect(res.body.id).toBeDefined();
  });

  // ─── Message ───────────────────────────────────────────────────────────────

  it('POST /conversations — professional starts conversation with guardian', async () => {
    const guardian = await prisma.user.findUnique({ where: { email: guardianEmail } });
    const res = await request(app.getHttpServer())
      .post('/api/v1/conversations')
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({ guardianUserId: guardian!.id, message: 'Hello, Emma looks great for the role!' })
      .expect(201);
    expect(res.body.id).toBeDefined();
  });

  // ─── Auth me ───────────────────────────────────────────────────────────────

  it('GET /auth/me — returns current user', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${guardianToken}`)
      .expect(200);
    expect(res.body.email).toBe(guardianEmail);
  });

  it('GET /auth/me — returns 401 without token', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
  });
});
