const nodemailer = require('nodemailer');
const validator = require('validator');
const dns = require('dns').promises;

class EmailService {
  constructor() {
    // Configure email transporter
    // For production, you'd use real SMTP settings
    // For development, we'll use a test account or console logging
    this.transporter = null;
    this.init();
  }

  async init() {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && 
        process.env.SMTP_PASS !== 'your-gmail-app-password-here' && process.env.SMTP_PASS.trim() !== '') {
      // Production email configuration for Gmail
      console.log('📧 Attempting Gmail SMTP connection with user:', process.env.SMTP_USER);
      
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      
      console.log('📧 Email service initialized with Gmail SMTP for:', process.env.SMTP_USER);
      
      // Verify the connection
      try {
        await this.transporter.verify();
        console.log('✅ Gmail SMTP connection verified successfully');
        return; // Early return if Gmail works
      } catch (error) {
        console.error('❌ Gmail SMTP verification failed:', error.message);
        console.warn('📧 Falling back to test account');
        this.transporter = null;
      }
    } else {
      // Development: Create test account
      try {
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
        console.log('📧 Email service initialized with test account:', testAccount.user);
        console.log('📧 Preview emails at: https://ethereal.email');
      } catch (error) {
        console.warn('⚠️  Could not create email test account, emails will be logged to console');
        this.transporter = null;
      }
    }
  }

  // Enhanced email validation
  async isValidEmail(email) {
    // Basic format validation
    if (!validator.isEmail(email)) {
      return { valid: false, reason: 'Invalid email format' };
    }

    try {
      // Extract domain from email
      const domain = email.split('@')[1];
      
      // Check if domain has MX record (mail exchange record)
      const mxRecords = await dns.resolveMx(domain);
      
      if (!mxRecords || mxRecords.length === 0) {
        return { valid: false, reason: 'Email domain does not accept emails' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, reason: 'Email domain does not exist' };
    }
  }

  // Send welcome email
  async sendWelcomeEmail(user, twoFactorSetup = null) {
    const emailContent = this.generateWelcomeEmail(user, twoFactorSetup);

    try {
      if (this.transporter) {
        const info = await this.transporter.sendMail({
          from: process.env.FROM_EMAIL || 'Secure Asset Portal <noreply@secure-asset-portal.com>',
          to: user.email,
          subject: '🛡️ Welcome to Secure Asset Portal - Account Created Successfully!',
          html: emailContent.html,
          text: emailContent.text,
          priority: 'high',
          headers: {
            'X-Mailer': 'Secure Asset Portal v1.0',
            'X-Priority': '1'
          }
        });

        console.log(`✅ Welcome email sent successfully!`);
        console.log(`📧 To: ${user.email}`);
        console.log(`🔖 Message ID: ${info.messageId}`);
        if (process.env.NODE_ENV !== 'production') {
          console.log(`🔗 Preview URL: ${nodemailer.getTestMessageUrl(info) || 'N/A'}`);
        }

        return { success: true, messageId: info.messageId };
      } else {
        // Fallback: log to console
        console.log('📧 EMAIL WOULD BE SENT TO:', user.email);
        console.log('Subject: Welcome to Secure Asset Portal!');
        console.log(emailContent.text);
        return { success: true, messageId: 'console-log' };
      }
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      return { success: false, error: error.message };
    }
  }

  // Generate welcome email content
  generateWelcomeEmail(user, twoFactorSetup) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Welcome to Secure Asset Portal</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px 20px; border-radius: 0 0 8px 8px; }
            .card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; }
            .security-note { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🛡️ Welcome to Secure Asset Portal!</h1>
            </div>
            
            <div class="content">
              <h2>Hello ${user.firstName}!</h2>
              
              <p>Congratulations! Your secure asset management account has been successfully created.</p>
              
              <div class="card">
                <h3>✅ Account Details</h3>
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Name:</strong> ${user.firstName} ${user.lastName}</p>
                <p><strong>Account Created:</strong> ${new Date(user.createdAt).toLocaleString()}</p>
                <p><strong>Two-Factor Authentication:</strong> ${twoFactorSetup ? '🔐 Enabled' : '⚠️ Not yet configured'}</p>
              </div>

              ${twoFactorSetup ? `
              <div class="security-note">
                <h3>🔐 Two-Factor Authentication Configured</h3>
                <p>Great choice! Your account is now protected with two-factor authentication. You'll need your authenticator app every time you sign in.</p>
              </div>
              ` : `
              <div class="security-note">
                <h3>⚠️ Secure Your Account</h3>
                <p>For maximum security, we recommend enabling two-factor authentication in your account settings after your first login.</p>
              </div>
              `}

              <div class="card">
                <h3>🚀 Next Steps</h3>
                <ol>
                  <li>Log in to your account using your email and password</li>
                  <li>Complete your profile setup</li>
                  <li>Start adding your financial assets</li>
                  <li>Explore portfolio reports and insights</li>
                </ol>
                
                <p style="text-align: center; margin-top: 20px;">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/login" class="button">
                    Sign In Now
                  </a>
                </p>
              </div>

              <div class="card">
                <h3>💡 Features You'll Love</h3>
                <ul>
                  <li><strong>Asset Tracking:</strong> Monitor all your investments in one place</li>
                  <li><strong>Portfolio Analytics:</strong> Detailed reports and performance insights</li>
                  <li><strong>Bank-Level Security:</strong> End-to-end encryption and audit trails</li>
                  <li><strong>Mobile Ready:</strong> Access your portfolio anywhere, anytime</li>
                </ul>
              </div>

              <div class="footer">
                <p>This email was sent to ${user.email} because you created an account on Secure Asset Portal.</p>
                <p>If you didn't create this account, please ignore this email.</p>
                <p>© ${new Date().getFullYear()} Secure Asset Portal. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Welcome to Secure Asset Portal!

Hello ${user.firstName}!

Congratulations! Your secure asset management account has been successfully created.

Account Details:
- Email: ${user.email}
- Name: ${user.firstName} ${user.lastName}
- Account Created: ${new Date(user.createdAt).toLocaleString()}
- Two-Factor Authentication: ${twoFactorSetup ? 'Enabled' : 'Not yet configured'}

${twoFactorSetup ? 
  'Great choice! Your account is now protected with two-factor authentication.' :
  'For maximum security, we recommend enabling two-factor authentication in your account settings.'}

Next Steps:
1. Log in to your account using your email and password
2. Complete your profile setup  
3. Start adding your financial assets
4. Explore portfolio reports and insights

Sign in at: ${process.env.FRONTEND_URL || 'http://localhost:3001'}/login

Features You'll Love:
- Asset Tracking: Monitor all your investments in one place
- Portfolio Analytics: Detailed reports and performance insights  
- Bank-Level Security: End-to-end encryption and audit trails
- Mobile Ready: Access your portfolio anywhere, anytime

This email was sent to ${user.email} because you created an account on Secure Asset Portal.
If you didn't create this account, please ignore this email.

© ${new Date().getFullYear()} Secure Asset Portal. All rights reserved.
    `;

    return { html, text };
  }

  // Send 2FA confirmation email
  async send2FAConfirmationEmail(user) {
    const emailContent = this.generate2FAConfirmationEmail(user);

    try {
      if (this.transporter) {
        const info = await this.transporter.sendMail({
          from: process.env.FROM_EMAIL || 'Secure Asset Portal <noreply@secure-asset-portal.com>',
          to: user.email,
          subject: '🔐 Two-Factor Authentication Enabled - Your Account is Now More Secure!',
          html: emailContent.html,
          text: emailContent.text,
          priority: 'high',
          headers: {
            'X-Mailer': 'Secure Asset Portal v1.0',
            'X-Priority': '1'
          }
        });

        console.log(`✅ 2FA confirmation email sent successfully!`);
        console.log(`📧 To: ${user.email}`);
        console.log(`🔖 Message ID: ${info.messageId}`);
        if (process.env.NODE_ENV !== 'production') {
          console.log(`🔗 Preview URL: ${nodemailer.getTestMessageUrl(info) || 'N/A'}`);
        }

        return { success: true, messageId: info.messageId };
      } else {
        // Fallback: log to console
        console.log('📧 2FA CONFIRMATION EMAIL WOULD BE SENT TO:', user.email);
        console.log('Subject: Two-Factor Authentication Enabled!');
        console.log(emailContent.text);
        return { success: true, messageId: 'console-log' };
      }
    } catch (error) {
      console.error('❌ Failed to send 2FA confirmation email:', error);
      return { success: false, error: error.message };
    }
  }

  // Generate 2FA confirmation email content
  generate2FAConfirmationEmail(user) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Two-Factor Authentication Enabled</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #059669; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px 20px; border-radius: 0 0 8px 8px; }
            .card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669; }
            .success-badge { background: #d1fae5; color: #059669; padding: 8px 16px; border-radius: 20px; font-weight: 600; display: inline-block; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Two-Factor Authentication Enabled!</h1>
            </div>
            
            <div class="content">
              <h2>Hello ${user.firstName}!</h2>
              
              <div class="success-badge">✅ Security Enhanced</div>
              
              <p>Great news! Two-factor authentication (2FA) has been successfully enabled on your Secure Asset Portal account.</p>
              
              <div class="card">
                <h3>🛡️ What This Means</h3>
                <ul>
                  <li><strong>Enhanced Security:</strong> Your account is now protected by an additional layer of security</li>
                  <li><strong>Required for Login:</strong> You'll need your authenticator app to generate codes when signing in</li>
                  <li><strong>Protection from Unauthorized Access:</strong> Even if someone has your password, they can't access your account without your phone</li>
                </ul>
              </div>

              <div class="card">
                <h3>📱 How to Sign In</h3>
                <ol>
                  <li>Enter your email and password as usual</li>
                  <li>Open your authenticator app (Google Authenticator, Authy, etc.)</li>
                  <li>Enter the 6-digit code for "Secure Asset Portal"</li>
                  <li>Complete your secure login!</li>
                </ol>
              </div>

              <div class="card">
                <h3>⚠️ Important Security Tips</h3>
                <ul>
                  <li>Keep your authenticator app installed and backed up</li>
                  <li>Never share your 2FA codes with anyone</li>
                  <li>Contact support immediately if you lose access to your authenticator</li>
                  <li>Consider saving backup codes in a secure location</li>
                </ul>
              </div>

              <div class="footer">
                <p>This security confirmation was sent to ${user.email}.</p>
                <p>If you did not enable 2FA, please contact support immediately.</p>
                <p>© ${new Date().getFullYear()} Secure Asset Portal. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Two-Factor Authentication Enabled!

Hello ${user.firstName}!

Great news! Two-factor authentication (2FA) has been successfully enabled on your Secure Asset Portal account.

What This Means:
- Enhanced Security: Your account is now protected by an additional layer of security
- Required for Login: You'll need your authenticator app to generate codes when signing in
- Protection from Unauthorized Access: Even if someone has your password, they can't access your account without your phone

How to Sign In:
1. Enter your email and password as usual
2. Open your authenticator app (Google Authenticator, Authy, etc.)
3. Enter the 6-digit code for "Secure Asset Portal"
4. Complete your secure login!

Important Security Tips:
- Keep your authenticator app installed and backed up
- Never share your 2FA codes with anyone
- Contact support immediately if you lose access to your authenticator
- Consider saving backup codes in a secure location

This security confirmation was sent to ${user.email}.
If you did not enable 2FA, please contact support immediately.

© ${new Date().getFullYear()} Secure Asset Portal. All rights reserved.
    `;

    return { html, text };
  }

  // Send password reset email (for future use)
  async sendPasswordResetEmail(user, resetToken) {
    // Implementation for password reset emails
    // We can add this later if needed
  }

  // Send security alert email (for future use)
  async sendSecurityAlertEmail(user, alertType, details) {
    // Implementation for security alerts
    // We can add this later if needed
  }
}

module.exports = new EmailService();
