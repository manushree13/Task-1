const router = require('express').Router();
const auth = require('../middleware/auth');
const pool = require('../config/db');

// Get all posts
router.get('/', async (req, res) => {
    try {
        const posts = await pool.query(
            'SELECT p.*, u.username FROM posts p JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC'
        );
        res.json(posts.rows);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get single post
router.get('/:id', async (req, res) => {
    try {
        const post = await pool.query(
            'SELECT p.*, u.username FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = $1',
            [req.params.id]
        );
        
        if (post.rows.length === 0) {
            return res.status(404).json({ message: 'Post not found' });
        }
        
        res.json(post.rows[0]);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Create post
router.post('/', auth, async (req, res) => {
    const { title, content } = req.body;
    
    try {
        const newPost = await pool.query(
            'INSERT INTO posts (title, content, user_id) VALUES ($1, $2, $3) RETURNING *',
            [title, content, req.user.id]
        );
        
        res.json(newPost.rows[0]);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update post
router.put('/:id', auth, async (req, res) => {
    const { title, content } = req.body;
    
    try {
        const post = await pool.query(
            'SELECT * FROM posts WHERE id = $1',
            [req.params.id]
        );
        
        if (post.rows.length === 0) {
            return res.status(404).json({ message: 'Post not found' });
        }
        
        if (post.rows[0].user_id !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }
        
        const updatedPost = await pool.query(
            'UPDATE posts SET title = $1, content = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
            [title, content, req.params.id]
        );
        
        res.json(updatedPost.rows[0]);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete post
router.delete('/:id', auth, async (req, res) => {
    try {
        const post = await pool.query(
            'SELECT * FROM posts WHERE id = $1',
            [req.params.id]
        );
        
        if (post.rows.length === 0) {
            return res.status(404).json({ message: 'Post not found' });
        }
        
        if (post.rows[0].user_id !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }
        
        await pool.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
        res.json({ message: 'Post removed' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;