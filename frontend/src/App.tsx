import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Stock from './pages/Stock';
import Operators from './pages/Operators';

function App() {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/stock" element={<Stock />} />
            <Route path="/operators" element={<Operators />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;