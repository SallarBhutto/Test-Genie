import fetch from 'node-fetch';

/**
 * Validates a license key against the remote validation service
 */
export async function validateLicense(licenseKey: string): Promise<boolean> {
  if (!licenseKey) {
    return false;
  }

  const validateUrl = process.env.VALIDATE_LICENSE_URL;
  if (!validateUrl) {
    console.error('VALIDATE_LICENSE_URL environment variable not set');
    return false;
  }

  try {
    const response = await fetch(validateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        licenseKey: licenseKey
      }),
      timeout: 10000 // 10 second timeout
    });

    if (!response.ok) {
      console.error(`License validation failed with status: ${response.status}`);
      return false;
    }

    const result = await response.json() as any;
    return result.valid === true;
  } catch (error: any) {
    console.error('License validation error:', error.message);
    return false;
  }
}