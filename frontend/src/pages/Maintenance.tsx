import { useState, useEffect } from 'react';
import { getMaintenances, createMaintenance, updateMaintenance, deleteMaintenance, getMachines, getStockItems, completeMaintenance } from '../api';
import { Maintenance, Machine, StockItem, UsedStockItem } from '../types';

const MaintenancePage = () => {
    const [maintenanceSchedules, setMaintenanceSchedules] = useState<Maintenance[]>([]);
    const [machines, setMachines] = useState<Machine[]>([]);
    const [stockItems, setStockItems] = useState<StockItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentMaintenance, setCurrentMaintenance] = useState<Partial<Maintenance>>({ usedStock: [] });
    const [isEditing, setIsEditing] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    useEffect(() => {
        fetchData();
    }, [selectedMonth, selectedYear]);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [schedules, machinesData, stockData] = await Promise.all([getMaintenances(selectedMonth, selectedYear), getMachines(), getStockItems()]);
            setMaintenanceSchedules(schedules);
            setMachines(machinesData);
            setStockItems(stockData);
            setError(null);
        } catch (err) {
            setError('Failed to fetch data.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = (maintenance?: Maintenance) => {
        if (maintenance) {
            setCurrentMaintenance(JSON.parse(JSON.stringify(maintenance))); // Deep copy
            setIsEditing(true);
        } else {
            setCurrentMaintenance({ machineId: '', date: '', description: '', usedStock: [] });
            setIsEditing(false);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentMaintenance({ usedStock: [] });
        setIsEditing(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setCurrentMaintenance(prev => ({ ...prev, [name]: value }));
    };

    const handleStockChange = (index: number, field: keyof UsedStockItem, value: string) => {
        const updatedStock = [...(currentMaintenance.usedStock || [])];
        updatedStock[index] = { ...updatedStock[index], [field]: value };
        setCurrentMaintenance(prev => ({ ...prev, usedStock: updatedStock }));
    };

    const addStockItem = () => {
        const newStockItem: UsedStockItem = { stockId: '', quantity: 1 };
        setCurrentMaintenance(prev => ({
            ...prev,
            usedStock: [...(prev.usedStock || []), newStockItem]
        }));
    };

    const removeStockItem = (index: number) => {
        const updatedStock = [...(currentMaintenance.usedStock || [])];
        updatedStock.splice(index, 1);
        setCurrentMaintenance(prev => ({ ...prev, usedStock: updatedStock }));
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentMaintenance.machineId || !currentMaintenance.date) {
            setError("Machine and Date are required.");
            return;
        }

        const payload = {
            ...currentMaintenance,
            date: new Date(currentMaintenance.date + 'T00:00:00').toISOString(),
            usedStock: (currentMaintenance.usedStock || []).map(item => ({
                ...item,
                quantity: Number(item.quantity)
            })).filter(item => item.stockId && item.quantity > 0)
        };

        try {
            if (isEditing && currentMaintenance.id) {
                await updateMaintenance(currentMaintenance.id, payload as Maintenance);
            } else {
                await createMaintenance(payload as Omit<Maintenance, 'id'>);
            }
            fetchData();
            handleCloseModal();
        } catch (err) {
            setError('Failed to save maintenance schedule.');
            console.error(err);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this maintenance schedule?')) {
            try {
                await deleteMaintenance(id);
                fetchData();
            } catch (err) {
                setError('Failed to delete maintenance schedule.');
                console.error(err);
            }
        }
    };

    const handleComplete = async (id: string) => {
        if (window.confirm('Are you sure you want to mark this maintenance as complete?')) {
            try {
                await completeMaintenance(id);
                fetchData();
            } catch (err) {
                setError('Failed to complete maintenance schedule.');
                console.error(err);
            }
        }
    };

    const getMachineName = (machineId: string) => {
        const machine = machines.find(m => m.id === machineId);
        return machine ? machine.name : 'Unknown Machine';
    };

    const getStockItemName = (stockId: string) => {
        const item = stockItems.find(i => i.id === stockId);
        return item ? item.name : 'Unknown Item';
    }

    const getDateStatusColor = (dateString: string) => {
        const today = new Date();
        const maintenanceDate = new Date(dateString);
        today.setHours(0, 0, 0, 0);
        maintenanceDate.setHours(0, 0, 0, 0);

        const diffTime = maintenanceDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return 'bg-red-300'; // Atrasado
        } else if (diffDays <= 3) {
            return 'bg-red-500'; // Muito próximo
        } else if (diffDays <= 7) {
            return 'bg-yellow-400'; // Próximo
        } else {
            return 'bg-green-400'; // Longe
        }
    };

    if (isLoading) return <div className="text-center p-4">Loading...</div>;
    if (error) return <div className="text-center p-4 text-red-500">{error}</div>;

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Maintenance Schedules</h1>
                <button onClick={() => handleOpenModal()} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                    Add Schedule
                </button>
            </div>

            <div className="flex items-end space-x-4 mb-4">
                <div>
                    <label htmlFor="month-select" className="block text-sm font-medium text-gray-700">Mês</label>
                    <select
                        id="month-select"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                        {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="year-select" className="block text-sm font-medium text-gray-700">Ano</label>
                    <input
                        type="number"
                        id="year-select"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {maintenanceSchedules.map(schedule => (
                    <div key={schedule.id} className={`${schedule.status === 'Completed' ? 'bg-white' : getDateStatusColor(schedule.date)} shadow-md rounded-lg p-4`}>
                        <h2 className="text-xl font-semibold">{getMachineName(schedule.machineId)}</h2>
                        <p className="text-gray-600">Date: {new Date(schedule.date).toLocaleDateString()}</p>
                        <p className="mt-2">{schedule.description}</p>
                        {schedule.usedStock && schedule.usedStock.length > 0 && (
                            <div className="mt-4">
                                <h3 className="font-semibold">Used Stock:</h3>
                                <ul className="list-disc list-inside">
                                    {schedule.usedStock.map((item, index) => (
                                        <li key={index}>{getStockItemName(item.stockId)}: {item.quantity}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <div className="mt-4 flex justify-end space-x-2">
                            {schedule.status !== 'Completed' && (
                                <button onClick={() => handleComplete(schedule.id)} className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded">
                                    Complete
                                </button>
                            )}
                            <button onClick={() => handleOpenModal(schedule)} className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-3 rounded">
                                Edit
                            </button>
                            <button onClick={() => handleDelete(schedule.id)} className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded">
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
                    <div className="bg-white p-5 rounded-lg shadow-xl w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">{isEditing ? 'Edit' : 'Add'} Maintenance Schedule</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label htmlFor="machineId" className="block text-sm font-medium text-gray-700">Machine</label>
                                <select
                                    id="machineId"
                                    name="machineId"
                                    value={currentMaintenance.machineId || ''}
                                    onChange={handleChange}
                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                    required
                                >
                                    <option value="" disabled>Select a machine</option>
                                    {machines.map(machine => (
                                        <option key={machine.id} value={machine.id}>{machine.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-4">
                                <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date</label>
                                <input
                                    type="date"
                                    id="date"
                                    name="date"
                                    value={currentMaintenance.date || ''}
                                    onChange={handleChange}
                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={currentMaintenance.description || ''}
                                    onChange={handleChange}
                                    rows={3}
                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                ></textarea>
                            </div>

                            <div className="mb-4">
                                <h3 className="text-lg font-medium">Used Stock</h3>
                                {currentMaintenance.usedStock?.map((item, index) => (
                                    <div key={index} className="flex items-center space-x-2 mt-2">
                                        <select
                                            value={item.stockId}
                                            onChange={(e) => handleStockChange(index, 'stockId', e.target.value)}
                                            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                        >
                                            <option value="">Select Stock Item</option>
                                            {stockItems.map(stock => (
                                                <option key={stock.id} value={stock.id}>{stock.name} (Available: {stock.quantity})</option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => handleStockChange(index, 'quantity', e.target.value)}
                                            className="block w-24 pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                        />
                                        <button type="button" onClick={() => removeStockItem(index)} className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded">
                                            X
                                        </button>
                                    </div>
                                ))}
                                <button type="button" onClick={addStockItem} className="mt-2 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                                    Add Stock Item
                                </button>
                            </div>

                            <div className="flex justify-end space-x-2">
                                <button type="button" onClick={handleCloseModal} className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
                                    Cancel
                                </button>
                                <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MaintenancePage;