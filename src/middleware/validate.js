const { validationResult } = require('express-validator');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        fields: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      },
    });
  }
  next();
}

module.exports = { validate };
