import Joi from "joi";

export const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        message: "Validation error",
        details: error.details.map((err) => err.message),
      });
    }
    next();
  };
};

export const registerSchema = Joi.object({
  email: Joi.string()
    .min(6)
    .max(60)
    .required()
    .email({ tlds: { allow: ["com", "net"] } }),
  username: Joi.string().min(3).max(30).required(),
  password: Joi.string()
    .required()
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$"))
  // role removed - can only be set by direct DB access
});

// Login schema
export const loginSchema = Joi.object({
  email: Joi.string().required().email(),
  password: Joi.string().required(),
}).unknown(false);



export const resendCodeSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
}).unknown(false);

