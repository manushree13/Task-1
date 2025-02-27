const request = require('supertest');
const app = require('../../src/server');
const pool = require('../../src/config/db');

describe('Comment Routes', () => {
    let userToken;
    let userId;
    let postId;
    let commentId;

    const testUser = {
        username: 'testuser',
        email: 'test@test.com',
        password: 'password123'
    };

    const testPost = {
        title: 'Test Post',
        content: 'This is a test post content'
    };

    const testComment = {
        content: 'This is a test comment'
    };

    beforeAll(async () => {
        // Register user and get token
        const userRes = await request(app)
            .post('/api/auth/register')
            .send(testUser);
        userToken = userRes.body.token;
        userId = userRes.body.user.id;

        // Create a post
        const postRes = await request(app)
            .post('/api/posts')
            .set('x-auth-token', userToken)
            .send(testPost);
        postId = postRes.body.id;
    });

    beforeEach(async () => {
        await pool.query('DELETE FROM comments');
    });

    afterAll(async () => {
        await pool.query('DELETE FROM posts');
        await pool.query('DELETE FROM users');
        await pool.end();
    });

    describe('POST /api/comments', () => {
        it('should create a new comment', async () => {
            const res = await request(app)
                .post('/api/comments')
                .set('x-auth-token', userToken)
                .send({
                    content: testComment.content,
                    postId: postId
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('content', testComment.content);
            expect(res.body).toHaveProperty('user_id', userId);
            expect(res.body).toHaveProperty('post_id', postId);
            expect(res.body).toHaveProperty('username', testUser.username);
            commentId = res.body.id;
        });

        it('should not create comment without auth token', async () => {
            const res = await request(app)
                .post('/api/comments')
                .send({
                    content: testComment.content,
                    postId: postId
                });

            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/comments/post/:postId', () => {
        beforeEach(async () => {
            await request(app)
                .post('/api/comments')
                .set('x-auth-token', userToken)
                .send({
                    content: testComment.content,
                    postId: postId
                });
        });

        it('should get all comments for a post', async () => {
            const res = await request(app)
                .get(`/api/comments/post/${postId}`);
            
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBeTruthy();
            expect(res.body.length).toBeGreaterThan(0);
            expect(res.body[0]).toHaveProperty('content', testComment.content);
            expect(res.body[0]).toHaveProperty('username', testUser.username);
        });
    });

    describe('DELETE /api/comments/:id', () => {
        beforeEach(async () => {
            const res = await request(app)
                .post('/api/comments')
                .set('x-auth-token', userToken)
                .send({
                    content: testComment.content,
                    postId: postId
                });
            commentId = res.body.id;
        });

        it('should delete a comment', async () => {
            const res = await request(app)
                .delete(`/api/comments/${commentId}`)
                .set('x-auth-token', userToken);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Comment removed');
        });

        it('should not delete comment of another user', async () => {
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
                .delete(`/api/comments/${commentId}`)
                .set('x-auth-token', anotherUserRes.body.token);

            expect(res.status).toBe(401);
        });
    });
});