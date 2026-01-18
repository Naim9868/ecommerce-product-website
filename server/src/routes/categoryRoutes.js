const express = require('express');
const router = express.Router();
const {
  getCategories,
  getCategory,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  uploadCategoryImage,
  getCategoryTree
} = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// Public routes
router.route('/')
  .get(getCategories);

router.route('/hierarchy/tree')
  .get(getCategoryTree);

router.route('/:id')
  .get(getCategory);

router.route('/slug/:slug')
  .get(getCategoryBySlug);

// Protected admin routes
router.route('/')
  .post(protect, authorize('admin'), createCategory);

router.route('/:id')
  .put(protect, authorize('admin'), updateCategory)
  .delete(protect, authorize('admin'), deleteCategory);

// Image upload route
router.route('/:id/image')
  .put(
    protect, 
    authorize('admin'), 
    upload.single('image'), 
    uploadCategoryImage
  );

module.exports = router;