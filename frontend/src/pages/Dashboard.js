import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { assetService } from '../services/assetService';
import { reportService } from '../services/reportService';

const DashboardContainer = styled.div`
  min-height: 100vh;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  background: ${props => props.theme.colors.surface};
  padding: 1.5rem;
  border-radius: ${props => props.theme.borderRadius.lg};
  box-shadow: ${props => props.theme.shadows.md};
  margin-bottom: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const HeaderContent = styled.div``;

const Title = styled.h1`
  font-size: 1.875rem;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
  color: ${props => props.theme.colors.textLight};
  margin: 0;
`;

const LogoutButton = styled.button`
  padding: 0.5rem 1rem;
  background: ${props => props.theme.colors.error};
  color: white;
  border: none;
  border-radius: ${props => props.theme.borderRadius.md};
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.2s;
  
  &:hover {
    background: #dc2626;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  background: ${props => props.theme.colors.surface};
  padding: 1.5rem;
  border-radius: ${props => props.theme.borderRadius.lg};
  box-shadow: ${props => props.theme.shadows.md};
  border-left: 4px solid ${props => props.color || props.theme.colors.primary};
`;

const StatTitle = styled.h3`
  color: ${props => props.theme.colors.textLight};
  font-size: 0.875rem;
  font-weight: 500;
  margin: 0 0 0.5rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const StatValue = styled.div`
  color: ${props => props.theme.colors.text};
  font-size: 1.875rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
`;

const StatSubtext = styled.p`
  color: ${props => props.theme.colors.textLight};
  font-size: 0.75rem;
  margin: 0;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: ${props => props.theme.borderRadius.lg};
  box-shadow: ${props => props.theme.shadows.md};
  overflow: hidden;
`;

const CardHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CardTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  margin: 0;
`;

const CardContent = styled.div`
  padding: 1.5rem;
`;

const AssetGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const AssetItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: ${props => props.theme.colors.background};
  border-radius: ${props => props.theme.borderRadius.md};
  border: 1px solid ${props => props.theme.colors.border};
`;

const AssetInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const AssetName = styled.span`
  font-weight: 500;
  color: ${props => props.theme.colors.text};
`;

const AssetType = styled.span`
  font-size: 0.75rem;
  color: ${props => props.theme.colors.textLight};
  text-transform: capitalize;
`;

const AssetValue = styled.span`
  font-weight: 600;
  color: ${props => props.theme.colors.text};
`;

const AssetActions = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const DeleteButton = styled.button`
  padding: 0.25rem 0.5rem;
  background: ${props => props.theme.colors.error};
  color: white;
  border: none;
  border-radius: ${props => props.theme.borderRadius.sm};
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    opacity: 0.8;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CategoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const CategoryItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  
  &:last-child {
    border-bottom: none;
  }
`;

const CategoryName = styled.span`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.text};
`;

const CategoryValue = styled.span`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${props => props.theme.colors.text};
`;

const Button = styled(Link)`
  display: inline-block;
  padding: 0.5rem 1rem;
  background: ${props => props.theme.colors.primary};
  color: white;
  text-decoration: none;
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: 0.875rem;
  font-weight: 500;
  transition: background-color 0.2s;
  
  &:hover {
    background: ${props => props.theme.colors.primaryHover};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${props => props.theme.colors.textLight};
`;

const LoadingState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  color: ${props => props.theme.colors.textLight};
`;

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [assets, setAssets] = useState([]);
  const [portfolioSummary, setPortfolioSummary] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [assetsResponse, summaryResponse] = await Promise.all([
        assetService.getAssets(),
        reportService.getPortfolioSummary()
      ]);
      
      setAssets(assetsResponse.assets || []);
      setPortfolioSummary(summaryResponse);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const formatAssetType = (type) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleDeleteAsset = async (assetId, assetName) => {
    if (!window.confirm(`Are you sure you want to delete "${assetName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setDeleting(assetId);
      await assetService.deleteAsset(assetId);
      
      // Remove asset from local state and refresh data
      setAssets(prevAssets => prevAssets.filter(asset => asset.id !== assetId));
      
      // Refresh portfolio summary
      loadDashboardData();
      
      toast.success(`"${assetName}" has been deleted successfully`);
    } catch (error) {
      console.error('Failed to delete asset:', error);
      toast.error('Failed to delete asset. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <DashboardContainer>
        <LoadingState>
          <div>Loading your portfolio...</div>
        </LoadingState>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      <Header>
        <HeaderContent>
          <Title>Welcome back, {user?.firstName} {user?.lastName}</Title>
          <Subtitle>Here's an overview of your financial portfolio</Subtitle>
        </HeaderContent>
        <LogoutButton onClick={handleLogout}>
          Logout
        </LogoutButton>
      </Header>

      <StatsGrid>
        <StatCard color="#10b981">
          <StatTitle>Total Portfolio Value</StatTitle>
          <StatValue>{formatCurrency(portfolioSummary?.summary?.totalValue || 0)}</StatValue>
          <StatSubtext>Across all asset categories</StatSubtext>
        </StatCard>
        
        <StatCard color="#3b82f6">
          <StatTitle>Total Assets</StatTitle>
          <StatValue>{portfolioSummary?.summary?.totalAssets || 0}</StatValue>
          <StatSubtext>Individual assets tracked</StatSubtext>
        </StatCard>
        
        <StatCard color="#8b5cf6">
          <StatTitle>Categories</StatTitle>
          <StatValue>{portfolioSummary?.summary?.categoriesUsed || 0}</StatValue>
          <StatSubtext>Asset types in portfolio</StatSubtext>
        </StatCard>
      </StatsGrid>

      <ContentGrid>
        <Card>
          <CardHeader>
            <CardTitle>Recent Assets</CardTitle>
            <Button to="/assets">View All Assets</Button>
          </CardHeader>
          <CardContent>
            {assets.length === 0 ? (
              <EmptyState>
                <p>No assets found. Start building your portfolio!</p>
                <Button to="/assets/add">Add Your First Asset</Button>
              </EmptyState>
            ) : (
              <AssetGrid>
                {assets.slice(0, 5).map((asset) => (
                  <AssetItem key={asset.id}>
                    <AssetInfo>
                      <AssetName>{asset.name}</AssetName>
                      <AssetType>{formatAssetType(asset.type)}</AssetType>
                    </AssetInfo>
                    <AssetActions>
                      <AssetValue>{formatCurrency(asset.value)}</AssetValue>
                      <DeleteButton
                        onClick={() => handleDeleteAsset(asset.id, asset.name)}
                        disabled={deleting === asset.id}
                      >
                        {deleting === asset.id ? '...' : '🗑️'}
                      </DeleteButton>
                    </AssetActions>
                  </AssetItem>
                ))}
                {assets.length > 5 && (
                  <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <Button to="/assets">View {assets.length - 5} more assets</Button>
                  </div>
                )}
              </AssetGrid>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Portfolio Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {portfolioSummary?.categoryBreakdown?.length > 0 ? (
              <CategoryList>
                {portfolioSummary.categoryBreakdown.map((category) => (
                  <CategoryItem key={category.id}>
                    <CategoryName>{category.category}</CategoryName>
                    <div style={{ textAlign: 'right' }}>
                      <CategoryValue>{formatCurrency(category.value)}</CategoryValue>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {category.percentage}%
                      </div>
                    </div>
                  </CategoryItem>
                ))}
              </CategoryList>
            ) : (
              <EmptyState>
                <p>No portfolio data available</p>
              </EmptyState>
            )}
          </CardContent>
        </Card>
      </ContentGrid>
    </DashboardContainer>
  );
};

export default Dashboard;
