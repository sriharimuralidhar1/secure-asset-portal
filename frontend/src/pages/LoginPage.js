import React from 'react';
import styled from 'styled-components';

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
  margin-bottom: 1.5rem;
  color: ${props => props.theme.colors.text};
`;

const LoginPage = () => {
  return (
    <LoginContainer>
      <LoginCard>
        <Title>Secure Asset Portal</Title>
        <p>Login form will be implemented here with secure authentication</p>
      </LoginCard>
    </LoginContainer>
  );
};

export default LoginPage;
