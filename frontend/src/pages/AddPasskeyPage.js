import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';
import { 
  startRegistration,
  browserSupportsWebAuthn 
} from '@simplewebauthn/browser';

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
`;

const Card = styled.div`
  background: ${props => props.theme.colors.surface};
  padding: 2rem;
  border-radius: ${props => props.theme.borderRadius.lg};
  box-shadow: ${props => props.theme.shadows.lg};
  width: 100%;
  max-width: 500px;
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
  font-size: 3rem;
  text-align: center;
  margin-bottom: 1rem;
`;

const StatusMessage = styled.div`
  text-align: center;
  padding: 1rem;
  border-radius: ${props => props.theme.borderRadius.md};
  margin-bottom: 1rem;
  background: ${props => 
    props.type === 'success' ? '#d4edda' : 
    props.type === 'info' ? props.theme.colors.background : 
    props.type === 'error' ? '#f8d7da' : '#fff3cd'};
  color: ${props => 
    props.type === 'success' ? '#155724' : 
    props.type === 'info' ? props.theme.colors.textLight : 
    props.type === 'error' ? '#721c24' : '#856404'};
  border: 1px solid ${props => 
    props.type === 'success' ? '#c3e6cb' : 
    props.type === 'info' ? props.theme.colors.border : 
    props.type === 'error' ? '#f5c6cb' : '#ffeaa7'};
  font-size: 0.875rem;
`;

const InfoCard = styled.div`
  background: ${props => props.theme.colors.background};
  padding: 1.5rem;
  border-radius: ${props => props.theme.borderRadius.md};
  border: 1px solid ${props => props.theme.colors.border};
  margin-bottom: 1.5rem;
`;

const InfoTitle = styled.h3`
  margin: 0 0 1rem 0;
  color: ${props => props.theme.colors.text};
  font-size: 1.125rem;
`;

const InfoList = styled.ul`
  margin: 0;
  padding-left: 1.5rem;
  color: ${props => props.theme.colors.textLight};
`;

const InfoItem = styled.li`
  margin-bottom: 0.5rem;
`;

const AddPasskeyPage = () => {
  const [step, setStep] = useState('email'); // 'email', 'adding', 'success'
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    setPasskeySupported(browserSupportsWebAuthn());
    if (!browserSupportsWebAuthn()) {
      toast.error('Your browser does not support passkeys');
    }
  }, []);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    if (!passkeySupported) {
      toast.error('Passkeys are not supported in this browser');
      return;
    }

    setLoading(true);
    setStep('adding');

    try {
      console.log('🔑 Starting passkey addition process for:', email);
      
      // Step 1: Get registration options from server
      console.log('📋 Requesting registration options from server...');
      const registrationOptions = await authService.beginPasskeyAddition(email);
      console.log('📋 Registration options received:', registrationOptions);
      
      toast('Please use your TouchID/fingerprint when prompted', { duration: 5000 });
      
      // Step 2: Start the registration ceremony
      console.log('👆 About to call startRegistration...');
      const attResp = await startRegistration(registrationOptions);
      console.log('✅ Passkey created successfully:', attResp);
      
      // Step 3: Send result to server
      console.log('📤 Sending registration result to server...');
      const registrationResult = await authService.finishPasskeyAddition(email, attResp);
      console.log('🎉 Passkey addition successful:', registrationResult);
      
      setStep('success');
      toast.success('Passkey added successfully! You can now use biometric login.');
      
    } catch (error) {
      console.error('❌ Passkey addition failed:', error);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error response:', error.response?.data);
      
      if (error.name === 'NotAllowedError') {
        toast.error(
          <div>
            <strong>Biometric authentication was cancelled</strong>
            <br />
            Please try again to add your passkey
          </div>,
          { duration: 5000 }
        );
      } else if (error.name === 'AbortError') {
        toast.error('Registration timed out. Please try again.');
      } else if (error.response?.status === 404 || error.message?.includes('not found')) {
        toast.error(
          <div>
            <strong>Failed to add passkey</strong>
            <br />
            Account not found, Enter the email used when creating the account.
          </div>,
          { duration: 6000 }
        );
      } else if (error.response?.status === 409 || error.message?.includes('already registered')) {
        toast.error('This passkey is already registered to an account.');
      } else {
        // Check if we have a custom error message from the server
        const serverMessage = error.response?.data?.message || error.response?.data?.error;
        toast.error(
          <div>
            <strong>Failed to add passkey</strong>
            <br />
            {serverMessage || error.message || 'Please try again or contact support'}
          </div>,
          { duration: 5000 }
        );
      }
      
      setStep('email');
    } finally {
      setLoading(false);
    }
  };

  const renderEmailStep = () => (
    <>
      <PasskeyIcon>🔐</PasskeyIcon>
      <Header>
        <Title>Add Passkey to Your Account</Title>
        <Subtitle>Enhance your account security with biometric authentication</Subtitle>
      </Header>
      
      <InfoCard>
        <InfoTitle>🛡️ Why Add a Passkey?</InfoTitle>
        <InfoList>
          <InfoItem><strong>Passwordless Login:</strong> Sign in with just your fingerprint or face</InfoItem>
          <InfoItem><strong>Enhanced Security:</strong> Passkeys are phishing-resistant and unique to your device</InfoItem>
          <InfoItem><strong>Faster Access:</strong> No need to type passwords or 2FA codes</InfoItem>
          <InfoItem><strong>Multiple Devices:</strong> Add passkeys for all your trusted devices</InfoItem>
        </InfoList>
      </InfoCard>
      
      <Form onSubmit={handleEmailSubmit}>
        <FormGroup>
          <Label htmlFor="email">Email Address</Label>
          <Input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your account email address"
            required
            disabled={loading}
            autoFocus
          />
        </FormGroup>
        
        <Button type="submit" disabled={loading || !passkeySupported}>
          {loading ? '🔄 Adding Passkey...' : '🔐 Add Passkey'}
        </Button>
      </Form>
      
      {!passkeySupported && (
        <StatusMessage type="error">
          Your browser does not support passkeys. Please use a modern browser like Chrome, Safari, or Firefox.
        </StatusMessage>
      )}
    </>
  );

  const renderAddingStep = () => (
    <>
      <PasskeyIcon>👆</PasskeyIcon>
      <Header>
        <Title>Creating Your Passkey</Title>
        <Subtitle>Follow the prompts on your device</Subtitle>
      </Header>
      
      <StatusMessage type="info">
        Please use your biometric authentication (TouchID, fingerprint, or Face ID) when prompted by your device.
      </StatusMessage>
      
      <StatusMessage type="warning">
        <strong>Keep this page open</strong> until the process completes.
      </StatusMessage>
    </>
  );

  const renderSuccessStep = () => (
    <>
      <PasskeyIcon>✅</PasskeyIcon>
      <Header>
        <Title>Passkey Added Successfully!</Title>
        <Subtitle>Your account is now more secure</Subtitle>
      </Header>
      
      <StatusMessage type="success">
        <strong>Great!</strong> You can now sign in to your account using biometric authentication.
      </StatusMessage>
      
      <InfoCard>
        <InfoTitle>🚀 What's Next?</InfoTitle>
        <InfoList>
          <InfoItem>You'll receive a confirmation email shortly</InfoItem>
          <InfoItem>Try signing in with your new passkey</InfoItem>
          <InfoItem>Add passkeys to your other devices for convenience</InfoItem>
          <InfoItem>You can always use your password as a backup</InfoItem>
        </InfoList>
      </InfoCard>
      
      <div style={{ display: 'flex', gap: '1rem' }}>
        <Button onClick={() => navigate('/login/passkey')} style={{ flex: 1 }}>
          Try Passkey Login
        </Button>
        <Button onClick={() => setStep('email')} style={{ flex: 1, background: '#6b7280' }}>
          Add Another Passkey
        </Button>
      </div>
    </>
  );

  return (
    <Container>
      <Card>
        <BackLink to="/login">
          ← Back to Login Options
        </BackLink>
        
        <StepIndicator>
          {step === 'email' && 'Step 1 of 2: Enter Email'}
          {step === 'adding' && 'Step 2 of 2: Biometric Verification'}
          {step === 'success' && 'Completed Successfully'}
        </StepIndicator>
        
        {step === 'email' && renderEmailStep()}
        {step === 'adding' && renderAddingStep()}
        {step === 'success' && renderSuccessStep()}
      </Card>
    </Container>
  );
};

export default AddPasskeyPage;
