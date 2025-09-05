import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import styled from 'styled-components';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const LoginContainer = styled.div`
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

const Title = styled.h1`
  font-size: 1.875rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 0.5rem;
  color: ${props => props.theme.colors.text};
`;

const Subtitle = styled.p`
  text-align: center;
  margin-bottom: 1.5rem;
  color: ${props => props.theme.colors.textLight};
  font-size: 0.875rem;
`;

const AdminBadge = styled.div`
  background: linear-gradient(135deg, #dc2626, #991b1b);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: ${props => props.theme.borderRadius.md};
  text-align: center;
  margin-bottom: 1.5rem;
  font-weight: 600;
  font-size: 0.875rem;
  box-shadow: ${props => props.theme.shadows.sm};
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

const TwoFactorSection = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: ${props => props.theme.colors.background};
  border-radius: ${props => props.theme.borderRadius.md};
  border: 1px solid ${props => props.theme.colors.border};
`;

const TwoFactorText = styled.p`
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
  color: ${props => props.theme.colors.textLight};
`;

const AdminLoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    
    try {
      // First attempt: login without 2FA to check if it's required
      const result = await login(data.email, data.password, null);
      
      if (result.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setLoginEmail(data.email);
        toast.info('Please enter your two-factor authentication code');
      } else if (result.success) {
        // Check if user has admin role
        if (result.user && result.user.role === 'admin') {
          toast.success('Admin login successful!');
          navigate('/admin');
        } else {
          toast.error('Access denied: Admin privileges required');
          // Log out the user since they don't have admin access
          // The useAuth context should handle this
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (data) => {
    setLoading(true);
    
    try {
      const result = await login(loginEmail, data.password, data.twoFactorToken);
      
      if (result.success) {
        // Check if user has admin role
        if (result.user && result.user.role === 'admin') {
          toast.success('Admin login successful!');
          navigate('/admin');
        } else {
          toast.error('Access denied: Admin privileges required');
          // Reset the form
          resetForm();
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid two-factor code');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setRequiresTwoFactor(false);
    setLoginEmail('');
    reset();
  };

  return (
    <LoginContainer>
      <LoginCard>
        <Title>🔐 Admin Portal</Title>
        <Subtitle>Secure Asset Portal Administration</Subtitle>
        
        <AdminBadge>
          ⚠️ ADMINISTRATOR ACCESS REQUIRED
        </AdminBadge>
        
        {!requiresTwoFactor ? (
          <>
            <Form onSubmit={handleSubmit(onSubmit)}>
              <FormGroup>
                <Label htmlFor="email">Admin Email Address</Label>
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
                <Label htmlFor="password">Admin Password</Label>
                <Input
                  id="password"
                  type="password"
                  className={errors.password ? 'error' : ''}
                  {...register('password', {
                    required: 'Password is required'
                  })}
                />
                {errors.password && <ErrorMessage>{errors.password.message}</ErrorMessage>}
              </FormGroup>

              <Button type="submit" disabled={loading}>
                {loading ? 'Authenticating...' : 'Sign In as Admin'}
              </Button>
            </Form>
          </>
        ) : (
          <div>
            <TwoFactorSection>
              <TwoFactorText>
                Two-factor authentication is required for admin access.
                Please enter the 6-digit code from your authenticator app.
              </TwoFactorText>
              
              <Form onSubmit={handleSubmit(handleTwoFactorSubmit)}>
                <FormGroup>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    className={errors.password ? 'error' : ''}
                    {...register('password', {
                      required: 'Password is required'
                    })}
                  />
                  {errors.password && <ErrorMessage>{errors.password.message}</ErrorMessage>}
                </FormGroup>

                <FormGroup>
                  <Label htmlFor="twoFactorToken">Authenticator Code</Label>
                  <Input
                    id="twoFactorToken"
                    type="text"
                    placeholder="000000"
                    maxLength="6"
                    className={errors.twoFactorToken ? 'error' : ''}
                    {...register('twoFactorToken', {
                      required: 'Two-factor code is required',
                      pattern: {
                        value: /^[0-9]{6}$/,
                        message: 'Code must be 6 digits'
                      }
                    })}
                  />
                  {errors.twoFactorToken && <ErrorMessage>{errors.twoFactorToken.message}</ErrorMessage>}
                </FormGroup>

                <Button type="submit" disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify & Sign In'}
                </Button>
                
                <Button type="button" onClick={resetForm} style={{ marginTop: '0.5rem', background: '#6b7280' }}>
                  Back to Admin Login
                </Button>
              </Form>
            </TwoFactorSection>
          </div>
        )}
        
        {!requiresTwoFactor && (
          <div>
            <LinkStyled to="/login">
              ← Back to User Login
            </LinkStyled>
          </div>
        )}
      </LoginCard>
    </LoginContainer>
  );
};

export default AdminLoginPage;
