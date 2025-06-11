import { type Request, Response, NextFunction } from 'express';
import { validateLicense } from '../utils/license';

/**
 * Express middleware to validate license keys
 * Checks X-License-Key header or LICENSE_KEY environment variable
 * Returns 403 if license is invalid, otherwise calls next()
 */
export async function licenseMiddleware(req: Request, res: Response, next: NextFunction) {
  // Get license key from header or environment variable
  const licenseKey = req.headers['x-license-key'] as string || process.env.LICENSE_KEY;
  
  // In development mode, bypass license validation if no key is provided
  if (process.env.NODE_ENV === 'development' && !licenseKey) {
    console.log('Development mode: bypassing license validation');
    return next();
  }
  
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
    // In development mode, allow continuation if validation service is unavailable
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: continuing despite license validation error');
      return next();
    }
    return res.status(500).json({ 
      error: 'License validation service unavailable.' 
    });
  }
}