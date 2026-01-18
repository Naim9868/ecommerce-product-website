const Joi = require('joi');

// Product validation
exports.productValidation = (data) => {
  const schema = Joi.object({
    name: Joi.string().required().min(3).max(200),
    description: Joi.string().required().min(10),
    price: Joi.number().required().min(0),
    category: Joi.string().required(),
    stock: Joi.number().required().min(0),
    sku: Joi.string(),
    brand: Joi.string(),
    features: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        value: Joi.string().required()
      })
    ),
    isActive: Joi.boolean()
  });
  
  return schema.validate(data);
};

// Category validation
exports.categoryValidation = (data) => {
  const schema = Joi.object({
    name: Joi.string().required().min(2).max(100),
    description: Joi.string().max(500),
    parentCategory: Joi.string().allow(null),
    isActive: Joi.boolean()
  });
  
  return schema.validate(data);
};

// User registration validation
exports.registerValidation = (data) => {
  const schema = Joi.object({
    name: Joi.string().required().min(2).max(50),
    email: Joi.string().required().email(),
    password: Joi.string().required().min(6),
    role: Joi.string().valid('user', 'admin')
  });
  
  return schema.validate(data);
};

// User login validation
exports.loginValidation = (data) => {
  const schema = Joi.object({
    email: Joi.string().required().email(),
    password: Joi.string().required()
  });
  
  return schema.validate(data);
};

// Review validation
exports.reviewValidation = (data) => {
  const schema = Joi.object({
    rating: Joi.number().required().min(1).max(5),
    title: Joi.string().max(100),
    comment: Joi.string().required().min(10).max(1000),
    isVerifiedPurchase: Joi.boolean()
  });
  
  return schema.validate(data);
};