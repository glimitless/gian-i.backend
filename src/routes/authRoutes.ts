import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  res.send('Chat are we live?')
})

export default router;