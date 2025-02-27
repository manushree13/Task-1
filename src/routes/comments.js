const router = require('express').Router();
const auth = require('../middleware/auth');
const pool = require('../config/db');

// Get comments for a post
router.get('/post/:postId', async (req, res) => {
    try {
        const comments = await pool.query(
            'SELECT c.*, u.username FROM comments c JOIN users u ON c.user_id = u.id WHERE c.post_id = $1 ORDER BY c.created_at DESC',
            [req.params.postId]
        );
        res.json(comments.rows);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Add comment
router.post('/', auth, async (req, res) => {
    const { content, postId } = req.body;
    
    try {
        const newComment = await pool.query(
            'INSERT INTO comments (content, user_id, post_id) VALUES ($1, $2, $3) RETURNING *',
            [content, req.user.id, postId]
        );
        
        // Get username for the response
        const user = await pool.query('SELECT username FROM users WHERE id = $1', [req.user.id]);
        
        const response = {
            ...newComment.rows[0],
            username: user.rows[0].username
        };
        
        res.json(response);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete comment
router.delete('/:id', auth, async (req, res) => {
    try {
        const comment = await pool.query(
            'SELECT * FROM comments WHERE id = $1',
            [req.params.id]
        );
        
        if (comment.rows.length === 0) {
            return res.status(404).json({ message: 'Comment not found' });
        }
        
        if (comment.rows[0].user_id !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }
        
        await pool.query('DELETE FROM comments WHERE id = $1', [req.params.id]);
        res.json({ message: 'Comment removed' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;