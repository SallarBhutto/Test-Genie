const { validateLicense } = require('../utils/license');
require('dotenv').config();

/**
 * Express middleware to validate license keys
 * Checks X-License-Key header or LICENSE_KEY environment variable
 * Returns 403 if license is invalid, otherwise calls next()
 */
async function licenseMiddleware(req, res, next) {
  // Get license key from header or environment variable
  const licenseKey = req.headers['x-license-key'] || process.env.LICENSE_KEY;
  
  if (!licenseKey) {
    return res.status(403).json({ 
      error: 'License key required. Provide via X-License-Key header or LICENSE_KEY environment variable.' 
    });
  }

  try {
    const isValid = await validateLicense(licenseKey);
    
    if (!isValid) {
      return res.status(403).json({ 
        error: 'Invalid or expired license key.' 
      });
    }

    // License is valid, continue to next middleware
    next();
  } catch (error) {
    console.error('License validation middleware error:', error);
    return res.status(500).json({ 
      error: 'License validation service unavailable.' 
    });
  }
}

module.exports = {
  licenseMiddleware
};