const request = require('supertest');
const app = require('../../src/server');
const pool = require('../../src/config/db');

describe('Auth Routes', () => {
    beforeEach(async () => {
        await pool.query('DELETE FROM users');
    });

    afterAll(async () => {
        await pool.end();
    });

    describe('POST /api/auth/register', () => {
        const newUser = {
            username: 'testuser',
            email: 'test@test.com',
            password: 'password123'
        };

        it('should register a new user', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send(newUser);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body.user).toHaveProperty('username', newUser.username);
            expect(res.body.user).toHaveProperty('email', newUser.email);
            expect(res.body.user).not.toHaveProperty('password');
        });

        it('should not register user with existing email', async () => {
            await request(app).post('/api/auth/register').send(newUser);
            const res = await request(app)
                .post('/api/auth/register')
                .send(newUser);

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('message', 'User already exists');
        });
    });

    describe('POST /api/auth/login', () => {
        const user = {
            username: 'testuser',
            email: 'test@test.com',
            password: 'password123'
        };

        beforeEach(async () => {
            await request(app).post('/api/auth/register').send(user);
        });

        it('should login with valid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: user.email,
                    password: user.password
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body.user).toHaveProperty('username', user.username);
        });

        it('should not login with invalid password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: user.email,
                    password: 'wrongpassword'
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('message', 'Invalid credentials');
        });
    });
});