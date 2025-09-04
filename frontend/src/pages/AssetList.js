import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import toast from 'react-hot-toast';
import { assetService } from '../services/assetService';

const AssetListContainer = styled.div`
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

const Button = styled(Link)`
  display: inline-block;
  padding: 0.75rem 1.5rem;
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

const StatsBar = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  background: ${props => props.theme.colors.surface};
  padding: 1rem;
  border-radius: ${props => props.theme.borderRadius.md};
  box-shadow: ${props => props.theme.shadows.sm};
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
  margin-bottom: 0.25rem;
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.textLight};
`;

const AssetGrid = styled.div`
  display: grid;
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const AssetCard = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: ${props => props.theme.borderRadius.lg};
  box-shadow: ${props => props.theme.shadows.md};
  overflow: hidden;
`;

const AssetHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const AssetInfo = styled.div`
  flex: 1;
`;

const AssetName = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  margin: 0 0 0.5rem 0;
`;

const AssetType = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.textLight};
  text-transform: capitalize;
  margin-bottom: 0.5rem;
`;

const AssetValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => props.theme.colors.success};
  text-align: right;
`;

const AssetDetails = styled.div`
  padding: 1.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
`;

const DetailItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const DetailLabel = styled.span`
  font-size: 0.75rem;
  color: ${props => props.theme.colors.textLight};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const DetailValue = styled.span`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.text};
  font-weight: 500;
`;

const EmptyState = styled.div`
  background: ${props => props.theme.colors.surface};
  border-radius: ${props => props.theme.borderRadius.lg};
  box-shadow: ${props => props.theme.shadows.md};
  padding: 3rem;
  text-align: center;
  color: ${props => props.theme.colors.textLight};
`;

const EmptyIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1rem;
`;

const EmptyTitle = styled.h3`
  color: ${props => props.theme.colors.text};
  margin-bottom: 0.5rem;
`;

const LoadingState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
  color: ${props => props.theme.colors.textLight};
`;

const FilterBar = styled.div`
  background: ${props => props.theme.colors.surface};
  padding: 1rem;
  border-radius: ${props => props.theme.borderRadius.md};
  box-shadow: ${props => props.theme.shadows.sm};
  margin-bottom: 2rem;
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
`;

const FilterSelect = styled.select`
  padding: 0.5rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.sm};
  background: white;
`;

const SearchInput = styled.input`
  padding: 0.5rem 0.75rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.sm};
  flex: 1;
  min-width: 200px;
`;

const AssetTypes = [
  { value: '', label: 'All Types' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'investment_account', label: 'Investment Account' },
  { value: 'bank_account', label: 'Bank Account' },
  { value: 'cryptocurrency', label: 'Cryptocurrency' },
  { value: 'physical_asset', label: 'Physical Asset' },
  { value: 'business_interest', label: 'Business Interest' },
  { value: 'insurance', label: 'Insurance' }
];

const AssetList = () => {
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState([]);
  const [filteredAssets, setFilteredAssets] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadAssets();
  }, []);

  useEffect(() => {
    filterAssets();
  }, [assets, filterType, searchTerm]);

  const loadAssets = async () => {
    try {
      setLoading(true);
      const response = await assetService.getAssets();
      setAssets(response.assets || []);
    } catch (error) {
      console.error('Failed to load assets:', error);
      toast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const filterAssets = () => {
    let filtered = assets;

    if (filterType) {
      filtered = filtered.filter(asset => asset.type === filterType);
    }

    if (searchTerm) {
      filtered = filtered.filter(asset =>
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredAssets(filtered);
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getTotalValue = () => {
    return filteredAssets.reduce((sum, asset) => sum + parseFloat(asset.value), 0);
  };

  const getAssetsByType = () => {
    const types = {};
    filteredAssets.forEach(asset => {
      types[asset.type] = (types[asset.type] || 0) + 1;
    });
    return Object.keys(types).length;
  };

  if (loading) {
    return (
      <AssetListContainer>
        <LoadingState>
          <div>Loading your assets...</div>
        </LoadingState>
      </AssetListContainer>
    );
  }

  return (
    <AssetListContainer>
      <Header>
        <HeaderContent>
          <Title>My Assets</Title>
          <Subtitle>Manage and track your financial portfolio</Subtitle>
        </HeaderContent>
        <Button to="/assets/add">+ Add New Asset</Button>
      </Header>

      <StatsBar>
        <StatCard>
          <StatValue>{filteredAssets.length}</StatValue>
          <StatLabel>Total Assets</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{formatCurrency(getTotalValue())}</StatValue>
          <StatLabel>Total Value</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{getAssetsByType()}</StatValue>
          <StatLabel>Asset Types</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>
            <Button to="/dashboard" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
              ← Dashboard
            </Button>
          </StatValue>
          <StatLabel> </StatLabel>
        </StatCard>
      </StatsBar>

      <FilterBar>
        <FilterSelect
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          {AssetTypes.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </FilterSelect>
        
        <SearchInput
          type="text"
          placeholder="Search assets by name or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </FilterBar>

      {filteredAssets.length === 0 ? (
        <EmptyState>
          <EmptyIcon>💼</EmptyIcon>
          <EmptyTitle>
            {assets.length === 0 ? 'No Assets Yet' : 'No Matching Assets'}
          </EmptyTitle>
          <p>
            {assets.length === 0
              ? 'Start building your portfolio by adding your first asset.'
              : 'Try adjusting your filters or search terms.'}
          </p>
          {assets.length === 0 && (
            <Button to="/assets/add" style={{ marginTop: '1rem' }}>
              Add Your First Asset
            </Button>
          )}
        </EmptyState>
      ) : (
        <AssetGrid>
          {filteredAssets.map((asset) => (
            <AssetCard key={asset.id}>
              <AssetHeader>
                <AssetInfo>
                  <AssetName>{asset.name}</AssetName>
                  <AssetType>{formatAssetType(asset.type)}</AssetType>
                </AssetInfo>
                <AssetValue>{formatCurrency(asset.value)}</AssetValue>
              </AssetHeader>
              
              <AssetDetails>
                <DetailItem>
                  <DetailLabel>Created</DetailLabel>
                  <DetailValue>{formatDate(asset.createdAt)}</DetailValue>
                </DetailItem>
                
                <DetailItem>
                  <DetailLabel>Last Updated</DetailLabel>
                  <DetailValue>{formatDate(asset.updatedAt)}</DetailValue>
                </DetailItem>
                
                {asset.metadata?.purchaseValue && (
                  <DetailItem>
                    <DetailLabel>Purchase Value</DetailLabel>
                    <DetailValue>{formatCurrency(asset.metadata.purchaseValue)}</DetailValue>
                  </DetailItem>
                )}
                
                {asset.metadata?.purchaseDate && (
                  <DetailItem>
                    <DetailLabel>Purchase Date</DetailLabel>
                    <DetailValue>{formatDate(asset.metadata.purchaseDate)}</DetailValue>
                  </DetailItem>
                )}
                
                {asset.description && (
                  <DetailItem style={{ gridColumn: '1 / -1' }}>
                    <DetailLabel>Description</DetailLabel>
                    <DetailValue>{asset.description}</DetailValue>
                  </DetailItem>
                )}
              </AssetDetails>
            </AssetCard>
          ))}
        </AssetGrid>
      )}
    </AssetListContainer>
  );
};

export default AssetList;
