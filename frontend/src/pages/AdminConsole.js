import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const AdminConsole = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const { user, token } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        console.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (!window.confirm(`Are you sure you want to delete the account for ${userEmail}? This action cannot be undone and will delete all their assets and passkeys.`)) {
      return;
    }

    setDeleting(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Successfully deleted account for ${data.deletedUser.email}. Deleted ${data.deletedData.assets} assets and ${data.deletedData.passkeys} passkeys.`);
        await fetchUsers(); // Refresh the list
      } else {
        const error = await response.json();
        alert(`Failed to delete user: ${error.message || error.error}`);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading admin console...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ color: '#333', marginBottom: '10px' }}>Admin Console</h1>
        <p style={{ color: '#666' }}>Manage user accounts and system administration</p>
        <p style={{ fontSize: '14px', color: '#888' }}>Logged in as admin: {user?.email}</p>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #eee' }}>
          <h2 style={{ margin: '0', color: '#333' }}>User Management</h2>
          <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
            Total users: {users.length}
          </p>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #eee' }}>User</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #eee' }}>Email</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #eee' }}>2FA</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #eee' }}>Created</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #eee' }}>Last Login</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #eee' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f1f1f1' }}>
                  <td style={{ padding: '12px' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{u.firstName} {u.lastName}</div>
                      <div style={{ fontSize: '12px', color: '#888' }}>ID: {u.id}</div>
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>{u.email}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      backgroundColor: u.twoFactorEnabled ? '#d4edda' : '#f8d7da',
                      color: u.twoFactorEnabled ? '#155724' : '#721c24'
                    }}>
                      {u.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px' }}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px' }}>
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {u.id === user?.userId ? (
                      <span style={{ color: '#888', fontSize: '12px' }}>Current Admin</span>
                    ) : (
                      <button
                        onClick={() => handleDeleteUser(u.id, u.email)}
                        disabled={deleting === u.id}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: deleting === u.id ? '#ccc' : '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: deleting === u.id ? 'not-allowed' : 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        {deleting === u.id ? 'Deleting...' : 'Delete'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
            No users found
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminConsole;
