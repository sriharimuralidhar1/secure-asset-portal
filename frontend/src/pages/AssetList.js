import React from 'react';
import styled from 'styled-components';

const AssetListContainer = styled.div`
  min-height: 100vh;
  padding: 2rem;
`;

const Header = styled.div`
  background: ${props => props.theme.colors.surface};
  padding: 1.5rem;
  border-radius: ${props => props.theme.borderRadius.lg};
  box-shadow: ${props => props.theme.shadows.md};
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 1.875rem;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
  margin-bottom: 0.5rem;
`;

const AssetList = () => {
  return (
    <AssetListContainer>
      <Header>
        <Title>My Assets</Title>
      </Header>
      <p>Asset list and management interface will be implemented here</p>
    </AssetListContainer>
  );
};

export default AssetList;
