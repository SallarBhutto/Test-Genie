import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Email configuration - you can customize these settings
const EMAIL_CONFIG = {
  service: 'gmail', // or 'outlook', 'yahoo', etc.
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER, // your email
    pass: process.env.EMAIL_PASSWORD // your app password
  }
};

// Create transporter
const transporter = nodemailer.createTransport(EMAIL_CONFIG);

export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateVerificationExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24); // 24 hours from now
  return expiry;
}

export async function sendVerificationEmail(
  email: string, 
  username: string, 
  verificationToken: string
): Promise<boolean> {
  try {
    const verificationUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: 'Verify Your QualityBytes Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">QualityBytes</h1>
            <p style="color: white; margin: 5px 0;">Test Management Platform</p>
          </div>
          
          <div style="padding: 30px; background: #f9fafb;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Welcome to QualityBytes!</h2>
            <p style="color: #4b5563; line-height: 1.6;">
              Hello <strong>${username}</strong>,
            </p>
            <p style="color: #4b5563; line-height: 1.6;">
              Thank you for signing up for QualityBytes! To complete your registration and start managing your test cases, please verify your email address by clicking the button below.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); 
                        color: white; 
                        padding: 12px 30px; 
                        text-decoration: none; 
                        border-radius: 6px; 
                        font-weight: bold;
                        display: inline-block;">
                Verify Email Address
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
              If you can't click the button, copy and paste this link into your browser:
              <br>
              <a href="${verificationUrl}" style="color: #2563eb; word-break: break-all;">${verificationUrl}</a>
            </p>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
              This verification link will expire in 24 hours. If you didn't create an account with QualityBytes, please ignore this email.
            </p>
          </div>
          
          <div style="background: #e5e7eb; padding: 20px; text-align: center;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              © 2025 QualityBytes. All rights reserved.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
}

export async function sendWelcomeEmail(email: string, username: string): Promise<boolean> {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: 'Welcome to QualityBytes - Your Account is Ready!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">QualityBytes</h1>
            <p style="color: white; margin: 5px 0;">Test Management Platform</p>
          </div>
          
          <div style="padding: 30px; background: #f9fafb;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Account Verified Successfully! 🎉</h2>
            <p style="color: #4b5563; line-height: 1.6;">
              Hello <strong>${username}</strong>,
            </p>
            <p style="color: #4b5563; line-height: 1.6;">
              Congratulations! Your email has been verified and your QualityBytes account is now active. You can start managing your test cases, tracking defects, and collaborating with your team.
            </p>
            
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #1f2937; margin-top: 0;">What you can do now:</h3>
              <ul style="color: #4b5563; line-height: 1.8;">
                <li>Create and organize test cases</li>
                <li>Execute test runs and track results</li>
                <li>Log and manage defects</li>
                <li>Generate comprehensive reports</li>
                <li>Collaborate with team members</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.BASE_URL || 'http://localhost:5000'}/login" 
                 style="background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); 
                        color: white; 
                        padding: 12px 30px; 
                        text-decoration: none; 
                        border-radius: 6px; 
                        font-weight: bold;
                        display: inline-block;">
                Login to QualityBytes
              </a>
            </div>
          </div>
          
          <div style="background: #e5e7eb; padding: 20px; text-align: center;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              © 2025 QualityBytes. All rights reserved.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
}