import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { 
  startAuthentication,
  browserSupportsWebAuthn 
} from '@simplewebauthn/browser';

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
`;

const LoginCard = styled.div`
  background: ${props => props.theme.colors.surface};
  padding: 2rem;
  border-radius: ${props => props.theme.borderRadius.lg};
  box-shadow: ${props => props.theme.shadows.lg};
  width: 100%;
  max-width: 400px;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 1.5rem;
`;

const Title = styled.h1`
  font-size: 1.875rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 1.5rem;
  color: ${props => props.theme.colors.text};
`;

const Subtitle = styled.p`
  color: ${props => props.theme.colors.textLight};
  font-size: 0.875rem;
  margin: 0;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 500;
  color: ${props => props.theme.colors.text};
  font-size: 0.875rem;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: 1rem;
  transition: border-color 0.2s;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary}20;
  }
  
  &:disabled {
    background: ${props => props.theme.colors.secondary};
    cursor: not-allowed;
  }
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  background: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background: ${props => props.theme.colors.primaryHover};
  }
  
  &:disabled {
    background: ${props => props.theme.colors.secondary};
    cursor: not-allowed;
  }
`;

const BackLink = styled(Link)`
  color: ${props => props.theme.colors.primary};
  text-decoration: none;
  display: block;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  
  &:hover {
    text-decoration: underline;
  }
`;

const StepIndicator = styled.div`
  text-align: center;
  margin-bottom: 1rem;
  color: ${props => props.theme.colors.textLight};
  font-size: 0.875rem;
`;

const PasskeyIcon = styled.div`
  font-size: 2rem;
  text-align: center;
  margin-bottom: 1rem;
`;

const StatusMessage = styled.div`
  text-align: center;
  padding: 1rem;
  border-radius: ${props => props.theme.borderRadius.md};
  margin-bottom: 1rem;
  background: ${props => props.type === 'success' ? '#d4edda' : props.type === 'info' ? props.theme.colors.background : '#f8d7da'};
  color: ${props => props.type === 'success' ? '#155724' : props.type === 'info' ? props.theme.colors.textLight : '#721c24'};
  border: 1px solid ${props => props.type === 'success' ? '#c3e6cb' : props.type === 'info' ? props.theme.colors.border : '#f5c6cb'};
  font-size: 0.875rem;
`;

const PasskeyLoginPage = () => {
  const [step, setStep] = useState('email'); // 'email', 'verifying', 'authenticating'
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [passkeyCount, setPasskeyCount] = useState(0);
  const navigate = useNavigate();
  const { passkeyLogin } = useAuth();

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    setStep('verifying');

    try {
      console.log('🔍 Checking passkeys for email:', email);
      const passkeyInfo = await authService.getUserPasskeys(email);
      
      if (!passkeyInfo.userExists) {
        toast.error(
          <div>
            <strong>No account found for {email}</strong>
            <br />
            <a href="/register" style={{color: '#2563eb', textDecoration: 'underline'}}>
              Click here to create an account
            </a>
          </div>,
          { duration: 6000 }
        );
        setStep('email');
        setLoading(false);
        return;
      }
      
      if (!passkeyInfo.passkeys || passkeyInfo.passkeys.length === 0) {
        toast.error(
          <div>
            <strong>No passkeys found for {email}</strong>
            <br />
            <a href="/passkey/add" style={{color: '#2563eb', textDecoration: 'underline'}}>
              Click here to add a passkey to your account
            </a>
          </div>,
          { duration: 6000 }
        );
        setStep('email');
        setLoading(false);
        return;
      }
      
      console.log(`🔑 Found ${passkeyInfo.passkeys.length} passkey(s) for ${email}`);
      setPasskeyCount(passkeyInfo.passkeys.length);
      
      // Move to authentication step
      setStep('authenticating');
      
      // Small delay to show the status, then trigger passkey auth
      setTimeout(() => {
        handlePasskeyAuth();
      }, 1500);
      
    } catch (error) {
      console.error('Error checking passkeys:', error);
      console.error('Error response:', error.response?.data);
      
      if (error.response?.status === 404) {
        toast.error(
          <div>
            <strong>Account not found</strong>
            <br />
            Enter the email used when creating the account.
          </div>,
          { duration: 5000 }
        );
      } else {
        const serverMessage = error.response?.data?.message || error.response?.data?.error;
        toast.error(serverMessage || 'No passkeys found. Try another email.', { duration: 4000 });
      }
      setStep('email');
      setLoading(false);
    }
  };

  const handlePasskeyAuth = async () => {
    if (!browserSupportsWebAuthn()) {
      toast.error('Your browser does not support passkeys');
      setStep('email');
      setLoading(false);
      return;
    }

    try {
      console.log('🚀 Starting passkey authentication for:', email);
      
      // Get authentication options from server
      console.log('📋 Requesting authentication options from server...');
      const authOptions = await authService.beginPasskeyAuthentication(email);
      console.log('📋 Authentication options received:', authOptions);
      console.log('📋 Allow credentials count:', authOptions.allowCredentials?.length);
      
      // Log credentials info but don't fail if allowCredentials is empty (discoverable flow)
      if (!authOptions.allowCredentials || authOptions.allowCredentials.length === 0) {
        console.log('🔍 No specific allowCredentials - trying discoverable authentication');
      } else {
        console.log('🔑 Using specific credential IDs for authentication');
      }
      
      // Start the authentication ceremony
      console.log('👆 About to call startAuthentication...');
      console.log('👆 Auth options challenge length:', authOptions.challenge?.length);
      console.log('🔍 Full auth options:', JSON.stringify(authOptions, null, 2));
      
      toast('Please use your TouchID/fingerprint when prompted', { duration: 5000 });
      
      // Try to authenticate with the specific credential
      let authResult;
      try {
      console.log('🔍 Starting WebAuthn authentication with specific credentials...');
        console.log('🔑 Credential IDs available:', authOptions.allowCredentials?.length || 0);
        console.log('🌐 User Agent:', navigator.userAgent);
        console.log('📱 Platform:', navigator.platform);
        console.log('🔒 WebAuthn support:', !!window.PublicKeyCredential);
        
        // Check if this is Safari
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        console.log('🥀 Is Safari:', isSafari);
        
        if (authOptions.allowCredentials && authOptions.allowCredentials.length > 0) {
          console.log('🔑 Specific credentials to authenticate:', authOptions.allowCredentials.map(c => ({
            id: c.id.substring(0, 10) + '...',
            type: c.type,
            transports: c.transports
          })));
        }
        
        authResult = await startAuthentication(authOptions);
        console.log('✅ Authentication successful:', authResult);
        
      } catch (authError) {
        console.error('❌ Authentication failed:', authError.name, authError.message);
        
        // Handle specific WebAuthn errors
        if (authError.name === 'NotAllowedError') {
          // This usually means user cancelled or no credential found
          if (authError.message.includes('timed out') || authError.message.includes('not allowed')) {
            throw new Error('Authentication was cancelled or timed out. Please try again.');
          } else {
            throw new Error('No passkey was found or authentication was denied. Please ensure your passkey is properly registered.');
          }
        } else if (authError.name === 'NotSupportedError') {
          throw new Error('Passkeys are not supported on this device or browser.');
        } else if (authError.name === 'SecurityError') {
          throw new Error('Security error: Please ensure you are on a secure connection.');
        } else {
          throw authError;
        }
      }
      console.log('✅ Biometric authentication completed:', authResult);
      
      // Send result to server and update auth context
      console.log('📤 Sending authentication result to server...');
      const loginResult = await passkeyLogin(email, authResult);
      console.log('🎉 Passkey login successful:', loginResult);
      
      toast.success('Successfully signed in with passkey!');
      
      // Navigate to dashboard
      navigate('/dashboard');
      
    } catch (error) {
      console.error('❌ Passkey authentication failed:', error);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      
      if (error.name === 'NotAllowedError') {
        toast.error(
          <div>
            <strong>Biometric authentication was cancelled or failed</strong>
            <br />
            Please try again or use{' '}
            <a href="/login" style={{color: '#2563eb', textDecoration: 'underline'}}>
              password login instead
            </a>
          </div>,
          { duration: 5000 }
        );
      } else if (error.name === 'AbortError') {
        toast.error(
          <div>
            <strong>Authentication timed out</strong>
            <br />
            Please try again or use{' '}
            <a href="/login" style={{color: '#2563eb', textDecoration: 'underline'}}>
              password login instead
            </a>
          </div>,
          { duration: 5000 }
        );
      } else {
        toast.error(
          <div>
            <strong>Passkey authentication failed</strong>
            <br />
            Please try again or use{' '}
            <a href="/login" style={{color: '#2563eb', textDecoration: 'underline'}}>
              password login instead
            </a>
          </div>,
          { duration: 5000 }
        );
      }
      
      setStep('email');
      setLoading(false);
    }
  };

  const renderEmailStep = () => (
    <>
      <PasskeyIcon>🔐</PasskeyIcon>
      <Header>
        <Title>Sign in with Passkey</Title>
        <Subtitle>Enter your email to continue with biometric authentication</Subtitle>
      </Header>
      
      <Form onSubmit={handleEmailSubmit}>
        <FormGroup>
          <Label htmlFor="email">Email Address</Label>
          <Input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            required
            disabled={loading}
            autoFocus
          />
        </FormGroup>
        
        <Button type="submit" disabled={loading}>
          {loading ? '🔍 Checking...' : '🔍 Check for Passkeys'}
        </Button>
      </Form>
    </>
  );

  const renderVerifyingStep = () => (
    <>
      <PasskeyIcon>🔍</PasskeyIcon>
      <Header>
        <Title>Checking Passkeys</Title>
        <Subtitle>Verifying passkeys for {email}</Subtitle>
      </Header>
      
      <StatusMessage type="info">
        Looking for passkeys associated with your account...
      </StatusMessage>
    </>
  );

  const renderAuthenticatingStep = () => (
    <>
      <PasskeyIcon>👆</PasskeyIcon>
      <Header>
        <Title>Authenticate with Passkey</Title>
        <Subtitle>Use your TouchID or fingerprint to sign in</Subtitle>
      </Header>
      
      <StatusMessage type="success">
        Found {passkeyCount} passkey{passkeyCount !== 1 ? 's' : ''} for {email}
      </StatusMessage>
      
      <StatusMessage type="info">
        Please use your biometric authentication when prompted by your device.
      </StatusMessage>
    </>
  );

  return (
    <Container>
      <LoginCard>
        <BackLink to="/login">
          ← Back to Login Options
        </BackLink>
        
        <StepIndicator>
          Step {step === 'email' ? '1' : step === 'verifying' ? '2' : '3'} of 3
        </StepIndicator>
        
        {step === 'email' && renderEmailStep()}
        {step === 'verifying' && renderVerifyingStep()}
        {step === 'authenticating' && renderAuthenticatingStep()}
      </LoginCard>
    </Container>
  );
};

export default PasskeyLoginPage;
