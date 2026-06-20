const ApiError = require("../utils/ApiError");

/**
 * Lightweight, dependency-free validation middleware.
 * Validates request body fields against rules and throws an ApiError if validation fails.
 */
const validate = (rules) => {
  return (req, res, next) => {
    const errors = [];
    const body = req.body || {};

    for (const [field, config] of Object.entries(rules)) {
      const val = body[field];

      // 1. Check Required
      if (config.required && (val === undefined || val === null || val === "")) {
        errors.push(`Field '${field}' is required.`);
        continue;
      }

      if (val !== undefined && val !== null && val !== "") {
        // 2. Check Type
        if (config.type === "number" && typeof val !== "number") {
          const parsed = Number(val);
          if (isNaN(parsed)) {
            errors.push(`Field '${field}' must be a number.`);
          } else {
            req.body[field] = parsed; // Coerce to number
          }
        } else if (config.type === "integer" && !Number.isInteger(val)) {
          const parsed = parseInt(val, 10);
          if (isNaN(parsed)) {
            errors.push(`Field '${field}' must be an integer.`);
          } else {
            req.body[field] = parsed;
          }
        } else if (config.type === "boolean" && typeof val !== "boolean") {
          if (val === "true" || val === 1) req.body[field] = true;
          else if (val === "false" || val === 0) req.body[field] = false;
          else errors.push(`Field '${field}' must be a boolean.`);
        } else if (config.type === "string" && typeof val !== "string") {
          errors.push(`Field '${field}' must be a string.`);
        }

        // 3. Check Regex/Format
        if (config.regex && typeof val === "string" && !config.regex.test(val)) {
          errors.push(`Field '${field}' format is invalid.`);
        }

        // 4. Check Enum
        if (config.enum && !config.enum.includes(val)) {
          errors.push(`Field '${field}' must be one of: ${config.enum.join(", ")}.`);
        }

        // 5. Check Custom Validators
        if (config.custom && typeof config.custom === "function") {
          const customErr = config.custom(val, body);
          if (customErr) {
            errors.push(customErr);
          }
        }
      }
    }

    if (errors.length > 0) {
      return next(new ApiError(400, "Validation failed", errors));
    }

    next();
  };
};

// Common Schemas
const schemas = {
  login: {
    email: { required: true, type: "string", regex: /^\S+@\S+\.\S+$/ },
    password: { required: true, type: "string" }
  },
  signup: {
    name: { required: true, type: "string" },
    email: { required: true, type: "string", regex: /^\S+@\S+\.\S+$/ },
    password: { type: "string" }
  },
  addParking: {
    title: { required: true, type: "string" },
    address: { required: true, type: "string" },
    latitude: { required: true, type: "number" },
    longitude: { required: true, type: "number" },
    pricePerHour: { 
      required: true, 
      type: "number",
      custom: (val) => val <= 0 ? "pricePerHour must be greater than zero." : null
    },
    vehicleType: { required: true, type: "string", enum: ["car", "bike", "rv"] },
    slots: { 
      required: true, 
      type: "integer",
      custom: (val) => val <= 0 ? "slots must be at least 1." : null
    },
    startTime: { required: true, type: "string", regex: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
    endTime: { required: true, type: "string", regex: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ }
  },
  createBooking: {
    parkingId: { 
      required: true, 
      type: "string", 
      custom: (val) => !/^[0-9a-fA-F]{24}$/.test(val) ? "parkingId must be a valid 24-character hex ID." : null
    },
    startTime: { 
      required: true, 
      type: "string",
      custom: (val) => isNaN(Date.parse(val)) ? "startTime must be a valid ISO Date string." : null
    },
    endTime: { 
      required: true, 
      type: "string",
      custom: (val) => isNaN(Date.parse(val)) ? "endTime must be a valid ISO Date string." : null
    }
  },
  addReview: {
    rating: { required: true, type: "integer", enum: [1, 2, 3, 4, 5] },
    feedback: { required: true, type: "string" },
    bookingId: { 
      required: true, 
      type: "string", 
      custom: (val) => !/^[0-9a-fA-F]{24}$/.test(val) ? "bookingId must be a valid 24-character hex ID." : null
    }
  },
  createTicket: {
    bookingId: { 
      required: true, 
      type: "string", 
      custom: (val) => !/^[0-9a-fA-F]{24}$/.test(val) ? "bookingId must be a valid 24-character hex ID." : null
    },
    category: { required: true, type: "string", enum: ["Parking Full", "Wrong Location", "Unsafe Area", "Host Unresponsive", "Other"] },
    description: { required: true, type: "string" }
  }
};

module.exports = { validate, schemas };
