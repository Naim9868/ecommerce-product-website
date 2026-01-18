const Product = require('../models/Product');
const Category = require('../models/Category');
const { uploadToCloudinary } = require('../middleware/upload');
const fs = require('fs');

// @desc    Get all products with filtering, sorting, pagination
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res, next) => {
  try {
    // Copy req.query
    const reqQuery = { ...req.query };
    
    // Fields to exclude from filtering
    const removeFields = ['select', 'sort', 'page', 'limit', 'search'];
    removeFields.forEach(param => delete reqQuery[param]);
    
    // Create query string
    let queryStr = JSON.stringify(reqQuery);
    
    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);
    
    // Building query
    let query = Product.find(JSON.parse(queryStr)).populate('category', 'name slug');
    
    // Search functionality
    if (req.query.search) {
      query = query.find({
        $or: [
          { name: { $regex: req.query.search, $options: 'i' } },
          { description: { $regex: req.query.search, $options: 'i' } },
          { brand: { $regex: req.query.search, $options: 'i' } }
        ]
      });
    }
    
    // Select fields
    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      query = query.select(fields);
    }
    
    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Product.countDocuments(query);
    
    query = query.skip(startIndex).limit(limit);
    
    // Execute query
    const products = await query;
    
    // Pagination result
    const pagination = {};
    
    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }
    
    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }
    
    res.status(200).json({
      success: true,
      count: products.length,
      pagination,
      data: products
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name slug')
      .populate({
        path: 'reviews',
        populate: {
          path: 'user',
          select: 'name'
        }
      });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private/Admin
exports.createProduct = async (req, res, next) => {
  try {
    // Add user to req.body
    req.body.user = req.user.id;
    
    // Check if category exists
    const category = await Category.findById(req.body.category);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }
    
    const product = await Product.create(req.body);
    
    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
exports.updateProduct = async (req, res, next) => {
  try {
    let product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    
    // Update product
    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    
    // Delete images from Cloudinary if they exist
    if (product.images && product.images.length > 0) {
      for (const image of product.images) {
        if (image.public_id) {
          await cloudinary.uploader.destroy(image.public_id);
        }
      }
    }
    
    await product.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload product images
// @route   PUT /api/products/:id/images
// @access  Private/Admin
exports.uploadProductImages = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please upload at least one image'
      });
    }
    
    const uploadPromises = req.files.map(async (file) => {
      // Upload to Cloudinary (or use local path)
      let imageData;
      
      if (process.env.NODE_ENV === 'production' && process.env.CLOUDINARY_CLOUD_NAME) {
        const result = await uploadToCloudinary(file.path);
        imageData = {
          url: result.secure_url,
          public_id: result.public_id,
          alt: req.body.alt || product.name
        };
        // Delete local file after upload
        fs.unlinkSync(file.path);
      } else {
        imageData = {
          url: `/uploads/products/${file.filename}`,
          alt: req.body.alt || product.name
        };
      }
      
      return imageData;
    });
    
    const uploadedImages = await Promise.all(uploadPromises);
    
    // Add images to product
    product.images.push(...uploadedImages);
    await product.save();
    
    res.status(200).json({
      success: true,
      data: uploadedImages
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product stock
// @route   PUT /api/products/:id/stock
// @access  Private/Admin
exports.updateStock = async (req, res, next) => {
  try {
    const { quantity, operation } = req.body; // operation: 'add', 'subtract', 'set'
    
    if (!['add', 'subtract', 'set'].includes(operation)) {
      return res.status(400).json({
        success: false,
        error: 'Operation must be add, subtract, or set'
      });
    }
    
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    
    switch (operation) {
      case 'add':
        product.stock += quantity;
        break;
      case 'subtract':
        product.stock = Math.max(0, product.stock - quantity);
        break;
      case 'set':
        product.stock = quantity;
        break;
    }
    
    await product.save();
    
    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};