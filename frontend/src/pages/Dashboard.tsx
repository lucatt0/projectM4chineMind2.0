import { useState, useEffect } from 'react';
import {
  getMachines,
  createMachine,
  updateMachine,
  deleteMachine,
  getOperators,
  removeSensorFromMachine,
} from '../api';
import { Machine, Operator, Sensor } from '../types';
import Modal from '../components/Modal';
import MachineForm from '../components/MachineForm';

const Dashboard = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMachines();
    fetchOperators();
  }, []);

  const fetchMachines = async () => {
    try {
      const data = await getMachines();
      setMachines(data);
    } catch (err) {
      setError("Failed to fetch machines. Is the backend server running?");
    }
  };

  const fetchOperators = async () => {
    try {
      const data = await getOperators();
      setOperators(data);
    } catch (err) {
      console.error("Failed to fetch operators", err);
    }
  };

  const handleCreate = () => {
    setEditingMachine(null);
    setIsModalOpen(true);
  };

  const handleEdit = (machine: Machine) => {
    setEditingMachine(machine);
    setIsModalOpen(true);
  };

  const handleSave = async (machineData: Omit<Machine, 'id'>) => {
    try {
      if (editingMachine) {
        const updatedMachine = await updateMachine(editingMachine.id, machineData);
        setMachines(machines.map((m) => (m.id === editingMachine.id ? updatedMachine : m)));
      } else {
        const newMachine = await createMachine(machineData);
        setMachines([...machines, newMachine]);
      }
      setIsModalOpen(false);
      fetchMachines(); // Re-fetch to get the latest state
    } catch (err) {
      setError("Failed to save machine. Please try again.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this machine?')) {
      try {
        await deleteMachine(id);
        fetchMachines();
      } catch (err) {
        setError("Failed to delete machine. Please try again.");
      }
    }
  };

  const handleRemoveSensorFromMachine = async (machineId: string, sensorId: string) => {
    try {
      await removeSensorFromMachine(machineId, sensorId);
      fetchMachines();
    } catch (err) {
      setError("Failed to remove sensor. Please try again.");
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Machines Dashboard</h1>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <div className="mb-4">
        <button
          onClick={handleCreate}
          className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Add New Machine
        </button>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <MachineForm
          machine={editingMachine}
          onSave={handleSave}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      <ul className="space-y-4">
        {machines.map((m) => (
          <li key={m.id} className="p-4 border rounded shadow-sm bg-white">
            <h3 className="text-xl font-bold">{m.name}</h3>
            <p>Status: <span className={`font-semibold ${m.status === 'Ativo' ? 'text-green-600' : 'text-red-600'}`}>{m.status}</span></p>
            <p>Operator: {operators.find(o => o.id === m.operatorId)?.name || 'None'}</p>
            <div>
              <h4 className="font-bold mt-2">Sensors:</h4>
              {m.sensors && m.sensors.length > 0 ? (
                <ul className="list-disc ml-5">
                  {m.sensors.map((s: Sensor) => (
                    <li key={s.id} className="flex justify-between items-center">
                      {s.name} ({s.type})
                      <button onClick={() => handleRemoveSensorFromMachine(m.id, s.id)} className="text-red-500 ml-4 text-xs">Remove</button>
                    </li>
                  ))}
                </ul>
              ) : <p>No sensors attached.</p>}
            </div>
            <div className="mt-4 space-x-2">
              <button onClick={() => handleEdit(m)} className="bg-yellow-500 text-white p-2 rounded">Edit</button>
              <button onClick={() => handleDelete(m.id)} className="bg-red-500 text-white p-2 rounded">Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Dashboard;