const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImages,
  updateStock
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// Public routes
router.route('/')
  .get(getProducts);

router.route('/:id')
  .get(getProduct);

// Protected admin routes
router.route('/')
  .post(protect, authorize('admin'), createProduct);

router.route('/:id')
  .put(protect, authorize('admin'), updateProduct)
  .delete(protect, authorize('admin'), deleteProduct);

// Image upload route
router.route('/:id/images')
  .put(protect, authorize('admin'), upload.array('images', 5), uploadProductImages);

// Stock management route
router.route('/:id/stock')
  .put(protect, authorize('admin'), updateStock);

// Advanced filtering examples
// GET /api/products?category=electronics&price[lt]=1000
// GET /api/products?select=name,price,rating&sort=-price,rating
// GET /api/products?page=2&limit=10
// GET /api/products?search=laptop

module.exports = router;