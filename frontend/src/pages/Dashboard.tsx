import { useState, useEffect } from 'react';
import { getMachines, createMachine, updateMachine, deleteMachine, getOperators, removeSensorFromMachine } from '../api';
import { Machine, Operator, Sensor } from '../types';

const Dashboard = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [name, setName] = useState('');
  const [selectedOperator, setSelectedOperator] = useState<string>('');
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [formSensors, setFormSensors] = useState<Sensor[]>([]);
  const [newSensorName, setNewSensorName] = useState('');
  const [newSensorType, setNewSensorType] = useState('');
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
    const data = await getOperators();
    setOperators(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const machineData = {
      name,
      operatorId: selectedOperator,
      sensors: formSensors
    };

    try {
      if (editingMachine) {
        const updatedMachine = await updateMachine(editingMachine.id, machineData);
        setMachines(machines.map((m) => (m.id === editingMachine.id ? updatedMachine : m)));
      } else {
        const newMachine = await createMachine(machineData);
        setMachines([...machines, newMachine]);
      }
      resetForm();
    } catch (err) {
      setError("Failed to save machine. Please try again.");
    }
  };

  const handleEdit = (machine: Machine) => {
    setEditingMachine(machine);
    setName(machine.name);
    setSelectedOperator(machine.operatorId || '');
    setFormSensors(machine.sensors || []);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMachine(id);
      fetchMachines();
    } catch (err) {
      setError("Failed to delete machine. Please try again.");
    }
  };

  const resetForm = () => {
    setName('');
    setSelectedOperator('');
    setEditingMachine(null);
    setFormSensors([]);
    setNewSensorName('');
    setNewSensorType('');
  };

  const handleAddSensor = () => {
    if (newSensorName && newSensorType) {
      const newSensor: Sensor = { id: '', name: newSensorName, type: newSensorType };
      setFormSensors([...formSensors, newSensor]);
      setNewSensorName('');
      setNewSensorType('');
    }
  };

  const handleRemoveFormSensor = (index: number) => {
    setFormSensors(formSensors.filter((_, i) => i !== index));
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">{editingMachine ? 'Edit Machine' : 'Add New Machine'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="e.g., CNC-002"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700">Operator</label>
                <select
                  value={selectedOperator}
                  onChange={(e) => setSelectedOperator(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">No operator</option>
                  {operators.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700">Sensors</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Sensor Name"
                    value={newSensorName}
                    onChange={(e) => setNewSensorName(e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                  <input
                    type="text"
                    placeholder="Sensor Type"
                    value={newSensorType}
                    onChange={(e) => setNewSensorType(e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                  <button type="button" onClick={handleAddSensor} className="bg-blue-500 text-white p-2 rounded">Add</button>
                </div>
                <ul className="mt-2">
                  {formSensors.map((s, index) => (
                    <li key={index} className="flex justify-between items-center p-1 bg-gray-100 rounded">
                      <span>{s.name} ({s.type})</span>
                      <button type="button" onClick={() => handleRemoveFormSensor(index)} className="text-red-500">Remove</button>
                    </li>
                  ))}
                </ul>
              </div>

              <button type="submit" className="bg-blue-500 text-white p-2 rounded">
                {editingMachine ? 'Update Machine' : 'Add Machine'}
              </button>
              {editingMachine && (
                <button type="button" onClick={resetForm} className="ml-2 text-gray-500">
                  Cancel
                </button>
              )}
            </form>
          </div>
        </div>
        <div className="md:col-span-2">
          <ul className="space-y-4">
            {machines.map((m) => (
              <li key={m.id} className="p-4 border rounded shadow-sm">
                <h3 className="text-xl font-bold">{m.name}</h3>
                <p>Operator: {operators.find(o => o.id === m.operatorId)?.name || 'None'}</p>
                <div>
                  <h4 className="font-bold mt-2">Sensors:</h4>
                  {m.sensors && m.sensors.length > 0 ? (
                    <ul className="list-disc ml-5">
                      {m.sensors.map((s: Sensor) => (
                        <li key={s.id} className="flex justify-between items-center">
                          {s.name} ({s.type})
                          <button onClick={() => handleRemoveSensorFromMachine(m.id, s.id)} className="text-red-500 ml-4">Remove</button>
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
      </div>
    </div>
  );
};

export default Dashboard;