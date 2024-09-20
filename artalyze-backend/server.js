const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const imageRoutes = require('./routes/imageRoutes');
app.use('/api/images', imageRoutes);

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
