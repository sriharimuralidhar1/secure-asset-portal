#!/usr/bin/env node

/**
 * Test Email Script
 * 
 * This script tests the email functionality without going through the full registration process.
 * Run: node test-email.js
 */

require('dotenv').config({ path: '../.env' });
const emailService = require('./services/emailService');

async function testEmail() {
  console.log('🧪 Testing Gmail SMTP Configuration...\n');
  
  // Test user data
  const testUser = {
    id: 'test-123',
    email: 'srihari.muralidhar@gmail.com',
    firstName: 'Srihari',
    lastName: 'Muralidhar',
    createdAt: new Date().toISOString()
  };

  try {
    console.log('📧 Attempting to send test welcome email...');
    
    // Wait a moment for email service to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const result = await emailService.sendWelcomeEmail(testUser, false);
    
    if (result.success) {
      console.log('✅ Test email sent successfully!');
      console.log('📧 Check your inbox at:', testUser.email);
      console.log('🔖 Message ID:', result.messageId);
    } else {
      console.log('❌ Test email failed to send');
      console.log('Error:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test email error:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n🔧 AUTHENTICATION ERROR - Check these:');
      console.log('1. Make sure 2FA is enabled on your Google account');
      console.log('2. Generate an App Password for Gmail');
      console.log('3. Update SMTP_PASS in your .env file');
      console.log('4. See GMAIL_SETUP.md for detailed instructions');
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n🌐 NETWORK ERROR - Check your internet connection');
    } else {
      console.log('\n🔧 Check your email configuration in .env file');
    }
  }
  
  console.log('\n📋 Current Configuration:');
  console.log('SMTP_HOST:', process.env.SMTP_HOST || 'Not set');
  console.log('SMTP_USER:', process.env.SMTP_USER || 'Not set');
  console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***configured***' : 'Not set');
  console.log('FROM_EMAIL:', process.env.FROM_EMAIL || 'Not set');
}

// Run the test
testEmail().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Script error:', error);
  process.exit(1);
});
