import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  padding: 1rem;
  background: ${props => props.theme.colors.background};
`;

const Card = styled.div`
  background: ${props => props.theme.colors.surface};
  padding: 2rem;
  border-radius: ${props => props.theme.borderRadius.lg};
  box-shadow: ${props => props.theme.shadows.lg};
  width: 100%;
  max-width: 400px;
  text-align: center;
`;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: ${props => props.theme.colors.text};
`;

const Subtitle = styled.p`
  color: ${props => props.theme.colors.textLight};
  font-size: 0.875rem;
  margin-bottom: 2rem;
  line-height: 1.5;
`;

const PasskeyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const Button = styled.button`
  width: 100%;
  padding: 0.75rem 1.5rem;
  background: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-bottom: 1rem;
  
  &:hover {\n    background: ${props => props.theme.colors.primaryHover};
  }
  
  &:disabled {
    background: ${props => props.theme.colors.secondary};
    cursor: not-allowed;
  }
`;

const StatusMessage = styled.div`
  padding: 1rem;
  border-radius: ${props => props.theme.borderRadius.md};
  margin-bottom: 1rem;
  background: ${props => 
    props.type === 'success' ? '#d4edda' : 
    props.type === 'error' ? '#f8d7da' : 
    props.type === 'info' ? props.theme.colors.background : '#fff3cd'};
  color: ${props => 
    props.type === 'success' ? '#155724' : 
    props.type === 'error' ? '#721c24' : 
    props.type === 'info' ? props.theme.colors.text : '#856404'};
  border: 1px solid ${props => 
    props.type === 'success' ? '#c3e6cb' : 
    props.type === 'error' ? '#f5c6cb' : 
    props.type === 'info' ? props.theme.colors.border : '#ffeaa7'};
  font-size: 0.875rem;
  text-align: left;
`;

const BackButton = styled.button`
  width: 100%;
  padding: 0.5rem 1rem;
  background: transparent;
  color: ${props => props.theme.colors.textLight};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: ${props => props.theme.colors.background};
    color: ${props => props.theme.colors.text};
  }
`;

const MobilePasskeyPage = () => {
  const [loading, setLoading] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [step, setStep] = useState('loading'); // 'loading', 'ready', 'registering', 'success', 'error'
  const [error, setError] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = async () => {
    try {
      // Get session ID from URL params
      const params = new URLSearchParams(location.search);
      const sessionId = params.get('session');

      if (!sessionId) {
        setError('Invalid QR code. No session found.');
        setStep('error');
        return;
      }

      // Check if browser supports WebAuthn
      if (!browserSupportsWebAuthn()) {
        setError('This device does not support passkeys. Please use a different device or browser.');
        setStep('error');
        return;
      }

      // Fetch session data from backend
      await fetchSessionData(sessionId);
    } catch (error) {
      console.error('Failed to initialize session:', error);
      setError('Failed to initialize passkey registration.');
      setStep('error');
    }
  };

  const fetchSessionData = async (sessionId) => {
    try {
      const data = await authService.getPasskeySession(sessionId);
      setSessionData(data);
      setStep('ready');
    } catch (error) {
      console.error('Failed to fetch session data:', error);
      if (error.response?.status === 404) {
        setError('Session not found or expired. Please scan a fresh QR code.');
      } else {
        setError('Failed to load registration session. Please try again.');
      }
      setStep('error');
    }
  };

  const handleStartRegistration = async () => {
    if (!sessionData) {
      setError('No registration data available.');
      return;
    }

    setLoading(true);
    setStep('registering');

    try {
      toast('Please use your biometric authentication when prompted', { 
        duration: 5000,
        position: 'top-center' 
      });

      console.log('📱 Starting mobile passkey registration...');
      
      // Perform the WebAuthn registration
      const attResp = await startRegistration(sessionData.options);
      console.log('✅ Mobile passkey created successfully:', attResp);

      // Send result to server
      const result = await authService.finishPasskeyAddition(sessionData.email, attResp);
      console.log('🎉 Mobile passkey registration completed:', result);

      // Update the session to mark as completed
      const sessionId = new URLSearchParams(location.search).get('session');
      await authService.completePasskeySession(sessionId, {
        success: true,
        completed: true,
        result: result
      });

      setStep('success');
      toast.success('Passkey added successfully!');

    } catch (error) {
      console.error('❌ Mobile passkey registration failed:', error);
      
      let errorMessage = 'Failed to add passkey. Please try again.';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Biometric authentication was cancelled. Please try again.';
      } else if (error.name === 'AbortError') {
        errorMessage = 'Registration timed out. Please try again.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      // Update session to mark as failed
      try {
        const sessionId = new URLSearchParams(location.search).get('session');
        await authService.completePasskeySession(sessionId, {
          success: false,
          completed: true,
          error: errorMessage
        });
      } catch (sessionError) {
        console.error('Failed to update session with error:', sessionError);
      }

      setError(errorMessage);
      setStep('error');
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (step) {
      case 'loading':
        return (
          <>
            <PasskeyIcon>🔄</PasskeyIcon>
            <Title>Loading...</Title>
            <Subtitle>Preparing your passkey registration...</Subtitle>
          </>
        );

      case 'ready':
        return (
          <>
            <PasskeyIcon>🔐</PasskeyIcon>
            <Title>Add Passkey</Title>
            <Subtitle>
              You're about to add a passkey for <strong>{sessionData?.email}</strong>. 
              This will allow you to sign in securely using biometric authentication.
            </Subtitle>
            
            <StatusMessage type="info">
              <strong>What happens next:</strong>
              <br />• Tap "Continue" below
              <br />• Use your fingerprint, face, or device PIN when prompted
              <br />• Your passkey will be securely registered
            </StatusMessage>

            <Button 
              onClick={handleStartRegistration} 
              disabled={loading}
            >
              {loading ? '🔄 Adding Passkey...' : '🔐 Continue with Biometric'}
            </Button>
          </>
        );

      case 'registering':
        return (
          <>
            <PasskeyIcon>👆</PasskeyIcon>
            <Title>Authenticating...</Title>
            <Subtitle>
              Please complete the biometric authentication on your device.
            </Subtitle>
            
            <StatusMessage type="info">
              <strong>Follow the prompts:</strong>
              <br />• Use your fingerprint or face recognition
              <br />• Or enter your device PIN/password
              <br />• Keep this page open during the process
            </StatusMessage>
          </>
        );

      case 'success':
        return (
          <>
            <PasskeyIcon>✅</PasskeyIcon>
            <Title>Passkey Added!</Title>
            <Subtitle>
              Your passkey has been successfully added. You can now use biometric 
              authentication to sign in to your account.
            </Subtitle>
            
            <StatusMessage type="success">
              <strong>Next steps:</strong>
              <br />• You can close this page
              <br />• Return to the original device to continue
              <br />• Try logging in with your new passkey
            </StatusMessage>

            <Button onClick={() => navigate('/')}>
              🏠 Return to App
            </Button>
          </>
        );

      case 'error':
        return (
          <>
            <PasskeyIcon>❌</PasskeyIcon>
            <Title>Registration Failed</Title>
            <Subtitle>
              There was an issue adding your passkey.
            </Subtitle>
            
            <StatusMessage type="error">
              <strong>Error:</strong> {error}
            </StatusMessage>

            <Button onClick={() => navigate('/passkey/add')}>
              🔄 Try Again
            </Button>
            
            <BackButton onClick={() => navigate('/')}>
              ← Back to App
            </BackButton>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Container>
      <Card>
        {renderContent()}
      </Card>
    </Container>
  );
};

export default MobilePasskeyPage;
