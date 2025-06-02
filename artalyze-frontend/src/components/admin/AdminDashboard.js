import React from 'react';
import { Container, Typography, Box, Tab, Tabs } from '@mui/material';
import ImageUploader from './ImageUploader';
import ManageDay from './ManageDay';

const AdminDashboard = () => {
  const [tabValue, setTabValue] = React.useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom sx={{ mt: 4 }}>
        Admin Dashboard
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Upload Images" />
          <Tab label="Manage Days" />
        </Tabs>
      </Box>

      {tabValue === 0 && (
        <ImageUploader />
      )}

      {tabValue === 1 && (
        <ManageDay />
      )}
    </Container>
  );
};

export default AdminDashboard; 