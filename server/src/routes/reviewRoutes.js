const express = require('express');
const router = express.Router();
const {
  getProductReviews,
  addReview,
  updateReview,
  deleteReview
} = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

// Public route
router.route('/product/:productId')
  .get(getProductReviews);

// Protected routes
router.route('/product/:productId')
  .post(protect, addReview);

router.route('/:id')
  .put(protect, updateReview)
  .delete(protect, deleteReview);

module.exports = router;