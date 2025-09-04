import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';
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
      
      if (!passkeyInfo.passkeys || passkeyInfo.passkeys.length === 0) {
        toast.error('No passkeys found for this account. Please set up a passkey first or use password login.');
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
      toast.error('Failed to check for passkeys. Please try again.');
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
      const authOptions = await authService.beginPasskeyAuthentication(email);
      console.log('📋 Authentication options received');
      
      // Start the authentication ceremony
      console.log('👆 Prompting for biometric authentication...');
      toast.info('Please use your TouchID/fingerprint when prompted', { duration: 3000 });
      
      const authResult = await startAuthentication(authOptions);
      console.log('✅ Biometric authentication completed');
      
      // Send result to server
      const loginResult = await authService.finishPasskeyAuthentication(email, authResult);
      console.log('🎉 Passkey login successful');
      
      toast.success('Successfully signed in with passkey!');
      
      // Login successful - store token
      localStorage.setItem('token', loginResult.token);
      
      // Force a page reload to trigger AuthContext to pick up the new token
      window.location.href = '/dashboard';
      
      // Navigate to dashboard
      navigate('/dashboard');
      
    } catch (error) {
      console.error('❌ Passkey authentication failed:', error);
      
      if (error.name === 'NotAllowedError') {
        toast.error('Biometric authentication was cancelled or failed');
      } else if (error.name === 'AbortError') {
        toast.error('Authentication timed out');
      } else {
        toast.error('Passkey authentication failed. Please try again.');
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
