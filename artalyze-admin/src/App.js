import { Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import ManageImages from './pages/ManageImages';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/manage" element={<ManageImages />} />
      </Routes>
    </Router>
  );
}

export default App;
