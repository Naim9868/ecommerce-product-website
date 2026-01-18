const Category = require('../models/Category');
const Product = require('../models/Product');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort('name');
    
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single category with products
// @route   GET /api/categories/:id
// @access  Public
exports.getCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }
    
    // Get products in this category (with pagination)
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    const [products, total] = await Promise.all([
      Product.find({ 
        category: category._id,
        isActive: true 
      })
        .select('name price images rating stock')
        .skip(startIndex)
        .limit(limit)
        .sort(req.query.sort || '-createdAt'),
      Product.countDocuments({ 
        category: category._id,
        isActive: true 
      })
    ]);
    
    // Get subcategories
    const subcategories = await Category.find({ 
      parentCategory: category._id,
      isActive: true 
    });
    
    res.status(200).json({
      success: true,
      data: {
        category,
        products: {
          data: products,
          total,
          page,
          pages: Math.ceil(total / limit)
        },
        subcategories
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get category by slug
// @route   GET /api/categories/slug/:slug
// @access  Public
exports.getCategoryBySlug = async (req, res, next) => {
  try {
    const category = await Category.findOne({ 
      slug: req.params.slug,
      isActive: true 
    });
    
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create category
// @route   POST /api/categories
// @access  Private/Admin
exports.createCategory = async (req, res, next) => {
  try {
    // Check if parent category exists
    if (req.body.parentCategory) {
      const parent = await Category.findById(req.body.parentCategory);
      if (!parent) {
        return res.status(404).json({
          success: false,
          error: 'Parent category not found'
        });
      }
    }
    
    const category = await Category.create(req.body);
    
    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
exports.updateCategory = async (req, res, next) => {
  try {
    let category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }
    
    // Check if parent category exists and prevent circular reference
    if (req.body.parentCategory) {
      if (req.body.parentCategory === req.params.id) {
        return res.status(400).json({
          success: false,
          error: 'Category cannot be its own parent'
        });
      }
      
      const parent = await Category.findById(req.body.parentCategory);
      if (!parent) {
        return res.status(404).json({
          success: false,
          error: 'Parent category not found'
        });
      }
    }
    
    category = await Category.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      {
        new: true,
        runValidators: true
      }
    );
    
    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }
    
    // Check if category has products
    const productCount = await Product.countDocuments({ 
      category: category._id 
    });
    
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete category with ${productCount} products. Move products first.`
      });
    }
    
    // Check if category has subcategories
    const subcategoryCount = await Category.countDocuments({ 
      parentCategory: category._id 
    });
    
    if (subcategoryCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete category with ${subcategoryCount} subcategories. Delete subcategories first.`
      });
    }
    
    await category.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload category image
// @route   PUT /api/categories/:id/image
// @access  Private/Admin
exports.uploadCategoryImage = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Please upload an image'
      });
    }
    
    // Upload to Cloudinary or use local path
    let imageData;
    
    if (process.env.NODE_ENV === 'production' && process.env.CLOUDINARY_CLOUD_NAME) {
      const { uploadToCloudinary } = require('../middleware/upload');
      const result = await uploadToCloudinary(req.file.path);
      imageData = {
        url: result.secure_url,
        public_id: result.public_id
      };
      // Delete local file
      require('fs').unlinkSync(req.file.path);
    } else {
      imageData = {
        url: `/uploads/categories/${req.file.filename}`
      };
    }
    
    category.image = imageData;
    await category.save();
    
    res.status(200).json({
      success: true,
      data: imageData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get category hierarchy (tree structure)
// @route   GET /api/categories/hierarchy/tree
// @access  Public
exports.getCategoryTree = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true });
    
    // Build tree structure
    const buildTree = (parentId = null) => {
      return categories
        .filter(category => {
          if (parentId === null) {
            return !category.parentCategory;
          }
          return category.parentCategory && 
                 category.parentCategory.toString() === parentId.toString();
        })
        .map(category => ({
          _id: category._id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          image: category.image,
          children: buildTree(category._id)
        }));
    };
    
    const tree = buildTree();
    
    res.status(200).json({
      success: true,
      data: tree
    });
  } catch (error) {
    next(error);
  }
};