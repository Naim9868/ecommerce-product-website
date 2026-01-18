const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required']
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Product category is required']
  },
  images: [{
    url: String,
    public_id: String,
    alt: String
  }],
  stock: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    default: 0,
    min: [0, 'Stock cannot be negative']
  },
  sku: {
    type: String,
    unique: true,
    sparse: true
  },
  brand: {
    type: String,
    trim: true
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  numReviews: {
    type: Number,
    default: 0
  },
  features: [{
    name: String,
    value: String
  }],
  specifications: {
    type: Map,
    of: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  discount: {
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    discountedPrice: {
      type: Number,
      min: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for getting final price after discount
productSchema.virtual('finalPrice').get(function() {
  if (this.discount && this.discount.percentage > 0) {
    return this.price * (1 - this.discount.percentage / 100);
  }
  return this.price;
});

// Indexes for faster queries
productSchema.index({ name: 'text', description: 'text', brand: 'text' });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Product', productSchema);