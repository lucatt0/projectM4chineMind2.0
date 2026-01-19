import { useState, useEffect } from 'react';
import { Machine, Operator, Sensor } from '../types';
import { getOperators, addSensorToMachine, removeSensorFromMachine } from '../api';

interface MachineFormProps {
    machine: Omit<Machine, 'id' | 'sensors'> | Machine | null;
    onSave: (machine: Omit<Machine, 'id'>) => void;
    onCancel: () => void;
}

const MachineForm = ({ machine, onSave, onCancel }: MachineFormProps) => {
    const [formData, setFormData] = useState({ name: '', status: 'Ativo', operatorId: '' });
    const [operators, setOperators] = useState<Operator[]>([]);
    const [formSensors, setFormSensors] = useState<Sensor[]>([]);
    const [newSensorName, setNewSensorName] = useState('');
    const [newSensorType, setNewSensorType] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchOperators();
        if (machine) {
            setFormData({
                name: machine.name,
                status: machine.status,
                operatorId: machine.operatorId || '',
            });
            if ('sensors' in machine) {
                setFormSensors(machine.sensors || []);
            }
        }
    }, [machine]);

    const fetchOperators = async () => {
        try {
            const data = await getOperators();
            setOperators(data);
        } catch (err) {
            console.error("Failed to fetch operators", err);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddSensor = async () => {
        if (newSensorName && newSensorType) {
            const newSensorData = { name: newSensorName, type: newSensorType };
            if (machine && 'id' in machine) {
                try {
                    const newSensor = await addSensorToMachine(machine.id, newSensorData);
                    setFormSensors(prev => [...prev, newSensor]);
                    setNewSensorName('');
                    setNewSensorType('');
                } catch (err) {
                    setError("Failed to add sensor. Please try again.");
                }
            } else {
                // For new machines, we just add to the local state
                const newSensor: Sensor = { id: `temp-${Date.now()}`, name: newSensorName, type: newSensorType };
                setFormSensors([...formSensors, newSensor]);
                setNewSensorName('');
                setNewSensorType('');
            }
        }
    };

    const handleRemoveSensor = async (sensorId: string) => {
        if (machine && 'id' in machine) {
            try {
                await removeSensorFromMachine(machine.id, sensorId);
                setFormSensors(prev => prev.filter(s => s.id !== sensorId));
            } catch (err) {
                setError("Failed to remove sensor. Please try again.");
            }
        } else {
            // For new machines, we just remove from the local state
            setFormSensors(formSensors.filter(s => s.id !== sensorId));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...formData, sensors: formSensors });
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 bg-white rounded-lg">
            <h2 className="text-xl font-bold mb-4">{machine ? 'Edit Machine' : 'Add New Machine'}</h2>
            {error && <div className="text-red-500 mb-4">{error}</div>}
            <div className="mb-4">
                <label className="block text-gray-700">Name</label>
                <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    placeholder="e.g., CNC-002"
                    required
                />
            </div>
            <div className="mb-4">
                <label className="block text-gray-700">Status</label>
                <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                </select>
            </div>
            <div className="mb-4">
                <label className="block text-gray-700">Operator</label>
                <select
                    name="operatorId"
                    value={formData.operatorId}
                    onChange={handleInputChange}
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
                    {formSensors.map((s) => (
                        <li key={s.id} className="flex justify-between items-center p-1 bg-gray-100 rounded">
                            <span>{s.name} ({s.type})</span>
                            <button type="button" onClick={() => handleRemoveSensor(s.id)} className="text-red-500">Remove</button>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="flex justify-end space-x-4">
                <button type="button" onClick={onCancel} className="text-gray-500">Cancel</button>
                <button type="submit" className="bg-blue-500 text-white p-2 rounded">
                    {machine ? 'Update Machine' : 'Add Machine'}
                </button>
            </div>
        </form>
    );
};

export default MachineForm;