import { useState, useEffect, FormEvent } from 'react';
import { getMachines, createMachine, updateMachine, deleteMachine, Machine } from '../api';
import ScheduleMaintenanceModal from '../components/ScheduleMaintenanceModal';

function Dashboard() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('active');
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);


  useEffect(() => {
    fetchMachines();
  }, []);

  const fetchMachines = async () => {
    try {
      const data = await getMachines();
      setMachines(data);
      setError(null);
    } catch (error) {
      console.error(error);
      setError("Failed to fetch machines. Is the backend server running?");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name) {
      setError("Machine name is required.");
      return;
    }

    try {
      if (editingMachine) {
        const updated = await updateMachine({ ...editingMachine, name, status });
        setMachines(machines.map(m => m.id === updated.id ? updated : m));
        setEditingMachine(null);
      } else {
        const newData = await createMachine({ name, status });
        setMachines([...machines, newData]);
      }
      setName('');
      setStatus('active');
      setError(null);
    } catch (error) {
       console.error(error);
       setError("Failed to save machine. Please try again.");
    }
  };

  const handleEdit = (machine: Machine) => {
    setEditingMachine(machine);
    setName(machine.name);
    setStatus(machine.status);
  };

  const handleDelete = async (id: string) => {
    if(confirm('Are you sure you want to delete this machine?')) {
        try {
            await deleteMachine(id);
            setMachines(machines.filter(m => m.id !== id));
            setError(null);
        } catch (error) {
            console.error(error);
            setError("Failed to delete machine. Please try again.");
        }
    }
  };
  
  const cancelEdit = () => {
    setEditingMachine(null);
    setName('');
    setStatus('active');
  }

  const handleOpenScheduleModal = (machine: Machine) => {
    setSelectedMachine(machine);
    setIsModalOpen(true);
  }

  return (
    <>
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Machines Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4">{editingMachine ? 'Edit Machine' : 'Add New Machine'}</h2>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="e.g., CNC-002"
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    id="status"
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                    <button type="submit" className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        {editingMachine ? 'Update Machine' : 'Add Machine'}
                    </button>
                    {editingMachine && (
                        <button type="button" onClick={cancelEdit} className="text-sm text-gray-600 hover:text-gray-900">
                            Cancel
                        </button>
                    )}
                </div>
              </form>
            </div>
          </div>

          <div className="md:col-span-2">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                  <span className="block sm:inline">{error}</span>
              </div>
            )}
            <div className="bg-white shadow overflow-hidden rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {machines.length > 0 ? machines.map(machine => (
                    <tr key={machine.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{machine.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            machine.status === 'active' ? 'bg-green-100 text-green-800' : 
                            machine.status === 'inactive' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                            {machine.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => handleOpenScheduleModal(machine)} className="text-blue-600 hover:text-blue-900 mr-4">Schedule</button>
                        <button onClick={() => handleEdit(machine)} className="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
                        <button onClick={() => handleDelete(machine.id)} className="text-red-600 hover:text-red-900">Delete</button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                        <td colSpan={3} className="text-center py-10 text-gray-500">
                            No machines found.
                        </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {isModalOpen && selectedMachine && (
            <ScheduleMaintenanceModal
                machine={selectedMachine}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => {
                    setIsModalOpen(false);
                    // Optionally, you can show a success message
                }}
            />
        )}
    </>
  );
}

export default Dashboard;
