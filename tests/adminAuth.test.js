const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const config = require('../src/config/config');
const { AdminModel, School } = require('../src/models');

let schoolId;

beforeAll(async () => {
  await mongoose.connect(config.mongoose.url, config.mongoose.options);
  const school = await School.create({ name: 'Test School', address: '123 Test St' });
  schoolId = school._id;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('Admin Auth APIs', () => {
  let adminToken;
  let adminId;

  const adminData = {
    email: 'testadmin@schoolerp.com',
    password: 'Test123!',
    name: 'Test Admin',
    role: 'admin',
    schoolId,
  };

  describe('POST /v1/admin/register', () => {
    test('should register a new admin', async () => {
      const res = await request(app)
        .post('/v1/admin/register')
        .send(adminData)
        .set('X-CSRF-Token', 'dummy-csrf-token'); // Mock CSRF token
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.admin.email).toBe(adminData.email);
      expect(res.body.data.tokens).toHaveProperty('access.token');
      adminId = res.body.data.admin.id;
    });

    test('should fail if email is taken', async () => {
      const res = await request(app)
        .post('/v1/admin/register')
        .send(adminData)
        .set('X-CSRF-Token', 'dummy-csrf-token');
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('email already exists');
    });
  });

  describe('POST /v1/admin/login', () => {
    test('should login admin with correct credentials', async () => {
      const res = await request(app)
        .post('/v1/admin/login')
        .send({ email: adminData.email, password: adminData.password })
        .set('X-CSRF-Token', 'dummy-csrf-token');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.admin.email).toBe(adminData.email);
      expect(res.body.data.tokens).toHaveProperty('access.token');
      adminToken = res.body.data.tokens.access.token;
    });

    test('should fail with incorrect password', async () => {
      const res = await request(app)
        .post('/v1/admin/login')
        .send({ email: adminData.email, password: 'WrongPass!' })
        .set('X-CSRF-Token', 'dummy-csrf-token');
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toContain('Invalid Credentials');
    });
  });

  describe('GET /v1/admin/profile', () => {
    test('should get logged-in admin details', async () => {
      const res = await request(app)
        .get('/v1/admin/profile')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(adminData.email);
    });

    test('should fail without token', async () => {
      const res = await request(app).get('/v1/admin/profile');
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toContain('authentication token');
    });
  });

  describe('PATCH /v1/admin/profile', () => {
    test('should update admin profile', async () => {
      const updateData = { name: 'Updated Admin' };
      const res = await request(app)
        .patch('/v1/admin/profile')
        .send(updateData)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Admin');
    });
  });

  describe('POST /v1/admin/setup-2fa', () => {
    test('should setup 2FA', async () => {
      const res = await request(app)
        .post('/v1/admin/setup-2fa')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('qrCodeUrl');
      expect(res.body.data).toHaveProperty('secret');
    });
  });
  
  describe('POST /v1/admin/refresh-tokens', () => {
    test('should refresh tokens', async () => {
      const loginRes = await request(app)
        .post('/v1/admin/login')
        .send({ email: adminData.email, password: 'NewTest123!' })
        .set('X-CSRF-Token', 'dummy-csrf-token');
      const refreshToken = loginRes.body.data.tokens.refresh.token;
      const res = await request(app)
        .post('/v1/admin/refresh-tokens')
        .send({ refreshToken })
        .set('X-CSRF-Token', 'dummy-csrf-token');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('access.token');
    });
  });

  describe('POST /v1/admin/change-password', () => {
    test('should change password', async () => {
      const res = await request(app)
        .post('/v1/admin/change-password')
        .send({ oldPassword: 'Test123!', newPassword: 'NewTest123!' })
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-CSRF-Token', 'dummy-csrf-token');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Password changed');
    });

    test('should fail with wrong old password', async () => {
      const res = await request(app)
        .post('/v1/admin/change-password')
        .send({ oldPassword: 'WrongPass!', newPassword: 'NewTest123!' })
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-CSRF-Token', 'dummy-csrf-token');
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toContain('valid old password');
    });
  });
});