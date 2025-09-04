import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import styled from 'styled-components';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { 
  startRegistration,
  browserSupportsWebAuthn 
} from '@simplewebauthn/browser';

const RegisterContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
`;

const RegisterCard = styled.div`
  background: ${props => props.theme.colors.surface};
  padding: 2rem;
  border-radius: ${props => props.theme.borderRadius.lg};
  box-shadow: ${props => props.theme.shadows.lg};
  width: 100%;
  max-width: 500px;
`;

const Title = styled.h1`
  font-size: 1.875rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 1.5rem;
  color: ${props => props.theme.colors.text};
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

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
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
  
  &.error {
    border-color: ${props => props.theme.colors.error};
  }
`;

const ErrorMessage = styled.span`
  color: ${props => props.theme.colors.error};
  font-size: 0.75rem;
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

const LinkStyled = styled(Link)`
  color: ${props => props.theme.colors.primary};
  text-decoration: none;
  text-align: center;
  display: block;
  margin-top: 1rem;
  font-size: 0.875rem;
  
  &:hover {
    text-decoration: underline;
  }
`;

const PasswordRequirements = styled.div`
  background: ${props => props.theme.colors.background};
  padding: 1rem;
  border-radius: ${props => props.theme.borderRadius.md};
  border: 1px solid ${props => props.theme.colors.border};
  margin-top: 0.5rem;
`;

const RequirementTitle = styled.h4`
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  color: ${props => props.theme.colors.text};
`;

const RequirementList = styled.ul`
  margin: 0;
  padding-left: 1rem;
  font-size: 0.75rem;
  color: ${props => props.theme.colors.textLight};
`;

const TwoFactorSetup = styled.div`
  background: ${props => props.theme.colors.background};
  padding: 1.5rem;
  border-radius: ${props => props.theme.borderRadius.md};
  border: 1px solid ${props => props.theme.colors.border};
  text-align: center;
`;

const QRCode = styled.img`
  max-width: 200px;
  margin: 1rem 0;
`;

const SecretText = styled.div`
  background: ${props => props.theme.colors.surface};
  padding: 0.5rem;
  border-radius: ${props => props.theme.borderRadius.sm};
  font-family: monospace;
  font-size: 0.875rem;
  word-break: break-all;
  margin: 1rem 0;
  border: 1px solid ${props => props.theme.colors.border};
`;

const RegisterPage = () => {
  const [loading, setLoading] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [twoFactorData, setTwoFactorData] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(false);
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  
  // Check passkey support when component mounts
  React.useEffect(() => {
    setPasskeySupported(browserSupportsWebAuthn());
  }, []);
  
  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm();
  const { register: register2FA, handleSubmit: handleSubmit2FA, formState: { errors: errors2FA } } = useForm();
  
  const password = watch('password', '');

  const onSubmit = async (data) => {
    setLoading(true);
    
    try {
      console.log('🔍 Registering user with email:', data.email);
      const result = await registerUser({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName
      });
      
      // Use the email from the server response to ensure exact match
      const serverEmail = result.user?.email || data.email;
      console.log('🔍 Server returned user email:', serverEmail);
      console.log('🔍 Setting userEmail state to:', serverEmail);
      setUserEmail(serverEmail);
      setTwoFactorData(result.twoFactor);
      setShowTwoFactor(true);
      if (result.emailSent) {
        toast.success('Account created! A welcome email has been sent to your inbox.');
      } else {
        toast.success('Account created! Please set up two-factor authentication.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const verify2FA = async (data) => {
    setLoading(true);
    
    try {
      // Import authService for 2FA verification
      const { authService } = await import('../services/authService');
      
      await authService.enableTwoFactor(userEmail, data.twoFactorCode);
      
      toast.success('Two-factor authentication enabled! A confirmation email has been sent.');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const setupPasskey = async () => {
    if (!passkeySupported) {
      toast.error('Passkeys are not supported in this browser');
      return;
    }
    
    console.log('🔍 Setting up passkey for email:', userEmail);
    
    if (!userEmail) {
      toast.error('Email not found. Please try registering again.');
      return;
    }
    
    setPasskeyLoading(true);
    
    try {
      const { authService } = await import('../services/authService');
      
      console.log('🔍 About to call beginPasskeyRegistration with:', userEmail);
      // Start passkey registration
      const options = await authService.beginPasskeyRegistration(userEmail);
      
      // Create the passkey
      const credential = await startRegistration(options);
      
      // Complete passkey registration
      await authService.finishPasskeyRegistration(userEmail, credential);
      
      toast.success('Passkey registered successfully! You can now use biometrics to sign in.');
      navigate('/login');
    } catch (error) {
      console.error('Passkey registration error:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Full error:', error);
      
      if (error.name === 'NotAllowedError') {
        toast.error('Passkey registration was cancelled. Please try again and approve the TouchID/FaceID prompt.');
      } else if (error.name === 'NotSupportedError') {
        toast.error('This device does not support passkeys.');
      } else if (error.name === 'InvalidStateError') {
        toast.error('A passkey for this account may already exist. Please try logging in instead.');
      } else if (error.name === 'SecurityError') {
        toast.error('Security error: Please make sure you are on HTTPS or localhost.');
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error(`Passkey error: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setPasskeyLoading(false);
    }
  };


  if (showTwoFactor && twoFactorData) {
    return (
      <RegisterContainer>
        <RegisterCard>
          <Title>Set Up Two-Factor Authentication</Title>
          <TwoFactorSetup>
            <div style={{ background: '#d1fae5', border: '1px solid #10b981', padding: '1rem', borderRadius: '6px', marginBottom: '1rem' }}>
              <p style={{ margin: 0, color: '#065f46', fontSize: '0.875rem' }}>
                ✅ <strong>Account Created Successfully!</strong><br/>
                A welcome email has been sent to <strong>{userEmail}</strong>. Check your inbox for account details and next steps.
              </p>
            </div>
            <p>To enhance security, please choose a two-factor authentication method:</p>
            
            {passkeySupported && (
              <div style={{
                background: '#eff6ff',
                border: '1px solid #2563eb',
                padding: '1rem',
                borderRadius: '6px',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🔐 Recommended: Use Passkey (Biometrics)
                </h3>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#1e40af' }}>
                  Use your device's built-in security like TouchID, FaceID, or Windows Hello for the most convenient and secure authentication.
                </p>
                <Button 
                  type="button" 
                  onClick={setupPasskey}
                  disabled={passkeyLoading || loading}
                  style={{
                    background: '#2563eb',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {passkeyLoading ? 'Setting up Passkey...' : '🔐 Set Up Passkey'}
                </Button>
              </div>
            )}
            
            <div style={{
              background: '#f9fafb',
              border: '1px solid #d1d5db',
              padding: '1rem',
              borderRadius: '6px',
              marginBottom: '1rem'
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>
                📱 Alternative: Use Authenticator App
              </h3>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#6b7280' }}>
                If you prefer or your device doesn't support passkeys, you can use a traditional authenticator app.
              </p>
            
            <RequirementTitle>Step 1: Install an authenticator app</RequirementTitle>
            <p style={{ fontSize: '0.875rem', margin: '0.5rem 0' }}>
              Download Google Authenticator, Authy, or another TOTP app on your phone.
            </p>
            
            <RequirementTitle>Step 2: Scan this QR code</RequirementTitle>
            <QRCode src={twoFactorData.qrCode} alt="Two-factor authentication QR code" />
            
            <RequirementTitle>Or enter this secret manually:</RequirementTitle>
            <SecretText>{twoFactorData.secret}</SecretText>
            
            <RequirementTitle>Step 3: Enter verification code</RequirementTitle>
            <p style={{ fontSize: '0.875rem', margin: '0.5rem 0' }}>
              Enter the 6-digit code from your authenticator app to verify the setup:
            </p>
            
            <Form onSubmit={handleSubmit2FA(verify2FA)}>
              <FormGroup>
                <Input
                  type="text"
                  placeholder="000000"
                  maxLength="6"
                  className={errors2FA.twoFactorCode ? 'error' : ''}
                  {...register2FA('twoFactorCode', {
                    required: 'Verification code is required',
                    pattern: {
                      value: /^[0-9]{6}$/,
                      message: 'Code must be 6 digits'
                    }
                  })}
                />
                {errors2FA.twoFactorCode && <ErrorMessage>{errors2FA.twoFactorCode.message}</ErrorMessage>}
              </FormGroup>
              
              <div style={{ marginTop: '1rem' }}>
                <Button type="submit" disabled={loading} style={{ width: '100%' }}>
                  {loading ? 'Verifying...' : 'Verify & Complete Setup'}
                </Button>
              </div>
              
              <div style={{ 
                background: '#fef3c7', 
                border: '1px solid #f59e0b', 
                padding: '1rem', 
                borderRadius: '6px', 
                marginTop: '1rem',
                fontSize: '0.875rem',
                color: '#92400e'
              }}>
                ⚠️ <strong>Two-factor authentication is required</strong><br/>
                This step is mandatory to secure your financial data. Please complete the setup above.
              </div>
            </Form>
            </div>
          </TwoFactorSetup>
        </RegisterCard>
      </RegisterContainer>
    );
  }

  return (
    <RegisterContainer>
      <RegisterCard>
        <Title>Create Account</Title>
        
        <Form onSubmit={handleSubmit(onSubmit)}>
          <FormRow>
            <FormGroup>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                className={errors.firstName ? 'error' : ''}
                {...register('firstName', {
                  required: 'First name is required',
                  minLength: {
                    value: 2,
                    message: 'First name must be at least 2 characters'
                  }
                })}
              />
              {errors.firstName && <ErrorMessage>{errors.firstName.message}</ErrorMessage>}
            </FormGroup>

            <FormGroup>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                className={errors.lastName ? 'error' : ''}
                {...register('lastName', {
                  required: 'Last name is required',
                  minLength: {
                    value: 2,
                    message: 'Last name must be at least 2 characters'
                  }
                })}
              />
              {errors.lastName && <ErrorMessage>{errors.lastName.message}</ErrorMessage>}
            </FormGroup>
          </FormRow>

          <FormGroup>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              className={errors.email ? 'error' : ''}
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              })}
            />
            {errors.email && <ErrorMessage>{errors.email.message}</ErrorMessage>}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              className={errors.password ? 'error' : ''}
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters'
                },
                pattern: {
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                  message: 'Password must meet complexity requirements'
                }
              })}
            />
            {errors.password && <ErrorMessage>{errors.password.message}</ErrorMessage>}
            
            <PasswordRequirements>
              <RequirementTitle>Password Requirements:</RequirementTitle>
              <RequirementList>
                <li>At least 8 characters long</li>
                <li>Contains at least one lowercase letter</li>
                <li>Contains at least one uppercase letter</li>
                <li>Contains at least one number</li>
                <li>Contains at least one special character (@$!%*?&)</li>
              </RequirementList>
            </PasswordRequirements>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              className={errors.confirmPassword ? 'error' : ''}
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: value => value === password || 'Passwords do not match'
              })}
            />
            {errors.confirmPassword && <ErrorMessage>{errors.confirmPassword.message}</ErrorMessage>}
          </FormGroup>

          <Button type="submit" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </Form>
        
        <LinkStyled to="/login">
          Already have an account? Sign in here
        </LinkStyled>
      </RegisterCard>
    </RegisterContainer>
  );
};

export default RegisterPage;
