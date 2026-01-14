import { useState, useEffect } from 'react';
import { Machine, StockItem, createMaintenance, getStockItems } from '../api';

interface Props {
    machine: Machine;
    onClose: () => void;
    onSuccess: () => void;
}

function ScheduleMaintenanceModal({ machine, onClose, onSuccess }: Props) {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [observations, setObservations] = useState('');
    const [stockItems, setStockItems] = useState<StockItem[]>([]);
    const [selectedStockItemId, setSelectedStockItemId] = useState<string>('');
    const [quantityUsed, setQuantityUsed] = useState<number>(1);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStock = async () => {
            try {
                const items = await getStockItems();
                setStockItems(items);
            } catch (error) {
                console.error("Failed to fetch stock items", error);
                setError("Could not load stock items.");
            }
        };
        fetchStock();
    }, []);
    
    const selectedStockItem = stockItems.find(item => item.id === selectedStockItemId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const payload: any = { machineId: machine.id, date, observations };

        if (selectedStockItemId) {
            if (quantityUsed <= 0) {
                setError("Quantity must be positive.");
                return;
            }
            if (selectedStockItem && quantityUsed > selectedStockItem.quantity) {
                setError(`Not enough items in stock. Available: ${selectedStockItem.quantity}.`);
                return;
            }
            payload.stockItemId = selectedStockItemId;
            payload.quantityUsed = quantityUsed;
        }

        try {
            await createMaintenance(payload);
            onSuccess();
        } catch (error) {
            console.error(error);
            setError('Failed to schedule maintenance. Check stock availability.');
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
            <div className="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="mt-3 text-center">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Schedule Maintenance for {machine.name}</h3>
                    <form onSubmit={handleSubmit} className="mt-2 px-7 py-3">
                        <div className="mb-4">
                            <label htmlFor="date" className="block text-sm font-medium text-gray-700 text-left">Date</label>
                            <input
                                type="date" id="date" value={date} onChange={(e) => setDate(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm"
                            />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="stockItemId" className="block text-sm font-medium text-gray-700 text-left">Stock Item (Optional)</label>
                            <select
                                id="stockItemId" value={selectedStockItemId} onChange={(e) => setSelectedStockItemId(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm"
                            >
                                <option value="">None</option>
                                {stockItems.map(item => (
                                    <option key={item.id} value={item.id}>
                                        {item.name} (Available: {item.quantity})
                                    </option>
                                ))}
                            </select>
                        </div>
                        {selectedStockItemId && (
                             <div className="mb-4">
                                <label htmlFor="quantityUsed" className="block text-sm font-medium text-gray-700 text-left">Quantity to Use</label>
                                <input
                                    type="number" id="quantityUsed" value={quantityUsed}
                                    onChange={(e) => setQuantityUsed(parseInt(e.target.value, 10) || 1)}
                                    min="1"
                                    max={selectedStockItem?.quantity}
                                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm"
                                />
                            </div>
                        )}
                        <div className="mb-4">
                            <label htmlFor="observations" className="block text-sm font-medium text-gray-700 text-left">Observations</label>
                            <textarea
                                id="observations" value={observations} onChange={(e) => setObservations(e.target.value)} rows={3}
                                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm"
                                placeholder="e.g., Check coolant levels, replace filter"
                            ></textarea>
                        </div>

                        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
                        
                        <div className="items-center px-4 py-3">
                            <button
                                type="submit"
                                className="px-4 py-2 bg-indigo-600 text-white text-base font-medium rounded-md w-full shadow-sm"
                            >
                                Schedule
                            </button>
                        </div>
                    </form>
                    <div className="items-center px-4">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md w-full shadow-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ScheduleMaintenanceModal;