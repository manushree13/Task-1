const request = require('supertest');
const app = require('../../src/server');
const pool = require('../../src/config/db');
const jwt = require('jsonwebtoken');

describe('Post Routes', () => {
    let token;
    let userId;
    let postId;

    const testUser = {
        username: 'testuser',
        email: 'test@test.com',
        password: 'password123'
    };

    const testPost = {
        title: 'Test Post',
        content: 'This is a test post content'
    };

    beforeAll(async () => {
        // Register user and get token
        const res = await request(app)
            .post('/api/auth/register')
            .send(testUser);
        token = res.body.token;
        userId = res.body.user.id;
    });

    beforeEach(async () => {
        await pool.query('DELETE FROM posts');
    });

    afterAll(async () => {
        await pool.query('DELETE FROM users');
        await pool.end();
    });

    describe('POST /api/posts', () => {
        it('should create a new post', async () => {
            const res = await request(app)
                .post('/api/posts')
                .set('x-auth-token', token)
                .send(testPost);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('title', testPost.title);
            expect(res.body).toHaveProperty('content', testPost.content);
            expect(res.body).toHaveProperty('user_id', userId);
            postId = res.body.id;
        });

        it('should not create post without auth token', async () => {
            const res = await request(app)
                .post('/api/posts')
                .send(testPost);

            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/posts', () => {
        beforeEach(async () => {
            await request(app)
                .post('/api/posts')
                .set('x-auth-token', token)
                .send(testPost);
        });

        it('should get all posts', async () => {
            const res = await request(app).get('/api/posts');
            
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBeTruthy();
            expect(res.body.length).toBeGreaterThan(0);
            expect(res.body[0]).toHaveProperty('title', testPost.title);
            expect(res.body[0]).toHaveProperty('username', testUser.username);
        });
    });

    describe('PUT /api/posts/:id', () => {
        beforeEach(async () => {
            const res = await request(app)
                .post('/api/posts')
                .set('x-auth-token', token)
                .send(testPost);
            postId = res.body.id;
        });

        it('should update a post', async () => {
            const updatedPost = {
                title: 'Updated Title',
                content: 'Updated content'
            };

            const res = await request(app)
                .put(`/api/posts/${postId}`)
                .set('x-auth-token', token)
                .send(updatedPost);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('title', updatedPost.title);
            expect(res.body).toHaveProperty('content', updatedPost.content);
        });

        it('should not update post of another user', async () => {
            // Create another user
            const anotherUser = {
                username: 'another',
                email: 'another@test.com',
                password: 'password123'
            };
            const anotherUserRes = await request(app)
                .post('/api/auth/register')
                .send(anotherUser);

            const res = await request(app)
                .put(`/api/posts/${postId}`)
                .set('x-auth-token', anotherUserRes.body.token)
                .send({ title: 'Hacked', content: 'Hacked content' });

            expect(res.status).toBe(401);
        });
    });

    describe('DELETE /api/posts/:id', () => {
        beforeEach(async () => {
            const res = await request(app)
                .post('/api/posts')
                .set('x-auth-token', token)
                .send(testPost);
            postId = res.body.id;
        });

        it('should delete a post', async () => {
            const res = await request(app)
                .delete(`/api/posts/${postId}`)
                .set('x-auth-token', token);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Post removed');

            // Verify post is deleted
            const getRes = await request(app).get(`/api/posts/${postId}`);
            expect(getRes.status).toBe(404);
        });

        it('should not delete post of another user', async () => {
            // Create another user
            const anotherUser = {
                username: 'another',
                email: 'another@test.com',
                password: 'password123'
            };
            const anotherUserRes = await request(app)
                .post('/api/auth/register')
                .send(anotherUser);

            const res = await request(app)
                .delete(`/api/posts/${postId}`)
                .set('x-auth-token', anotherUserRes.body.token);

            expect(res.status).toBe(401);
        });
    });
});