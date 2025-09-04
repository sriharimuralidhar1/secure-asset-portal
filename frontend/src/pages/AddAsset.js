import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import styled from 'styled-components';
import toast from 'react-hot-toast';
import { assetService } from '../services/assetService';

const AddAssetContainer = styled.div`
  min-height: 100vh;
  padding: 2rem;
  max-width: 800px;
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

const BackButton = styled(Link)`
  display: inline-block;
  padding: 0.5rem 1rem;
  background: ${props => props.theme.colors.secondary};
  color: white;
  text-decoration: none;
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: 0.875rem;
  font-weight: 500;
  transition: background-color 0.2s;
  
  &:hover {
    background: #4b5563;
  }
`;

const FormCard = styled.div`
  background: ${props => props.theme.colors.surface};
  padding: 2rem;
  border-radius: ${props => props.theme.borderRadius.lg};
  box-shadow: ${props => props.theme.shadows.md};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
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

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: 1rem;
  background: white;
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

const Textarea = styled.textarea`
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: 1rem;
  resize: vertical;
  min-height: 100px;
  font-family: inherit;
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

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1rem;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &.primary {
    background: ${props => props.theme.colors.primary};
    color: white;
    
    &:hover {
      background: ${props => props.theme.colors.primaryHover};
    }
    
    &:disabled {
      background: ${props => props.theme.colors.secondary};
      cursor: not-allowed;
    }
  }
  
  &.secondary {
    background: ${props => props.theme.colors.surface};
    color: ${props => props.theme.colors.text};
    border: 1px solid ${props => props.theme.colors.border};
    
    &:hover {
      background: ${props => props.theme.colors.background};
    }
  }
`;

const AssetTypes = [
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'investment_account', label: 'Investment Account' },
  { value: 'bank_account', label: 'Bank Account' },
  { value: 'cryptocurrency', label: 'Cryptocurrency' },
  { value: 'physical_asset', label: 'Physical Asset' },
  { value: 'business_interest', label: 'Business Interest' },
  { value: 'insurance', label: 'Insurance' }
];

const AddAsset = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    
    try {
      await assetService.createAsset({
        name: data.name,
        type: data.type,
        value: parseFloat(data.value),
        description: data.description || '',
        metadata: {
          purchaseDate: data.purchaseDate,
          purchaseValue: data.purchaseValue ? parseFloat(data.purchaseValue) : null
        }
      });
      
      toast.success('Asset added successfully!');
      navigate('/assets');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add asset');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/assets');
  };

  return (
    <AddAssetContainer>
      <Header>
        <HeaderContent>
          <Title>Add New Asset</Title>
          <Subtitle>Add a new asset to your portfolio</Subtitle>
        </HeaderContent>
        <BackButton to="/assets">
          ← Back to Assets
        </BackButton>
      </Header>

      <FormCard>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <FormRow>
            <FormGroup>
              <Label htmlFor="name">Asset Name *</Label>
              <Input
                id="name"
                type="text"
                placeholder="e.g., Apple Stock, My House, Bitcoin Wallet"
                className={errors.name ? 'error' : ''}
                {...register('name', {
                  required: 'Asset name is required',
                  minLength: {
                    value: 2,
                    message: 'Asset name must be at least 2 characters'
                  }
                })}
              />
              {errors.name && <ErrorMessage>{errors.name.message}</ErrorMessage>}
            </FormGroup>

            <FormGroup>
              <Label htmlFor="type">Asset Type *</Label>
              <Select
                id="type"
                className={errors.type ? 'error' : ''}
                {...register('type', {
                  required: 'Please select an asset type'
                })}
              >
                <option value="">Select asset type</option>
                {AssetTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
              {errors.type && <ErrorMessage>{errors.type.message}</ErrorMessage>}
            </FormGroup>
          </FormRow>

          <FormRow>
            <FormGroup>
              <Label htmlFor="value">Current Value ($) *</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className={errors.value ? 'error' : ''}
                {...register('value', {
                  required: 'Current value is required',
                  min: {
                    value: 0,
                    message: 'Value must be positive'
                  }
                })}
              />
              {errors.value && <ErrorMessage>{errors.value.message}</ErrorMessage>}
            </FormGroup>

            <FormGroup>
              <Label htmlFor="purchaseValue">Purchase Value ($)</Label>
              <Input
                id="purchaseValue"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00 (optional)"
                className={errors.purchaseValue ? 'error' : ''}
                {...register('purchaseValue', {
                  min: {
                    value: 0,
                    message: 'Purchase value must be positive'
                  }
                })}
              />
              {errors.purchaseValue && <ErrorMessage>{errors.purchaseValue.message}</ErrorMessage>}
            </FormGroup>
          </FormRow>

          <FormGroup>
            <Label htmlFor="purchaseDate">Purchase Date</Label>
            <Input
              id="purchaseDate"
              type="date"
              className={errors.purchaseDate ? 'error' : ''}
              {...register('purchaseDate')}
            />
            {errors.purchaseDate && <ErrorMessage>{errors.purchaseDate.message}</ErrorMessage>}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Additional details about this asset (optional)"
              className={errors.description ? 'error' : ''}
              {...register('description', {
                maxLength: {
                  value: 500,
                  message: 'Description must be less than 500 characters'
                }
              })}
            />
            {errors.description && <ErrorMessage>{errors.description.message}</ErrorMessage>}
          </FormGroup>

          <ButtonGroup>
            <Button type="button" className="secondary" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" className="primary" disabled={loading}>
              {loading ? 'Adding Asset...' : 'Add Asset'}
            </Button>
          </ButtonGroup>
        </Form>
      </FormCard>
    </AddAssetContainer>
  );
};

export default AddAsset;
