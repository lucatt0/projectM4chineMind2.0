import { useState, useEffect } from 'react';
import { getMaintenances, getMachines, getStockItems, Maintenance, Machine, StockItem, deleteMaintenance } from '../api';

interface MaintenanceWithDetails extends Maintenance {
    machineName: string;
    stockItemName?: string;
}

function Calendar() {
    const [maintenances, setMaintenances] = useState<MaintenanceWithDetails[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [maintenancesData, machinesData, stockItemsData] = await Promise.all([
                getMaintenances(), 
                getMachines(),
                getStockItems()
            ]);
            
            const machinesMap = new Map(machinesData.map(m => [m.id, m.name]));
            const stockItemsMap = new Map(stockItemsData.map(i => [i.id, i.name]));

            const maintenancesWithDetails = maintenancesData.map(m => ({
                ...m,
                machineName: machinesMap.get(m.machineId) || 'Unknown Machine',
                stockItemName: m.stockItemId ? stockItemsMap.get(m.stockItemId) : undefined,
            })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
            setMaintenances(maintenancesWithDetails);
            setError(null);
        } catch (error) {
            console.error(error);
            setError('Failed to fetch maintenance data.');
        }
    };
    
    const handleDelete = async (id: string) => {
        if(confirm('Are you sure you want to cancel this maintenance? This will return any used items to the stock.')) {
            try {
                await deleteMaintenance(id);
                fetchData(); // Refetch data after deleting
            } catch (error) {
                console.error(error);
                setError('Failed to cancel maintenance.');
            }
        }
    }
    
    const groupedMaintenances = maintenances.reduce((acc, m) => {
        const date = m.date;
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(m);
        return acc;
    }, {} as Record<string, MaintenanceWithDetails[]>);

    return (
        <>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Maintenance Calendar</h1>
            <div className="bg-white p-6 rounded-lg shadow">
                {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <span className="block sm:inline">{error}</span>
                </div>
                )}
                {Object.keys(groupedMaintenances).length > 0 ? (
                    <div className="space-y-6">
                        {Object.entries(groupedMaintenances).map(([date, maintList]) => (
                            <div key={date}>
                                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-3">
                                    {new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </h3>
                                <ul className="space-y-3">
                                    {maintList.map(m => (
                                        <li key={m.id} className="bg-gray-50 p-3 rounded-md">
                                            <div className="flex justify-between items-start">
                                                <span className="font-medium text-gray-700">{m.machineName}</span>
                                                <button onClick={() => handleDelete(m.id)} className="text-xs text-red-500 hover:text-red-700 flex-shrink-0 ml-4">
                                                    Cancel
                                                </button>
                                            </div>
                                            {m.stockItemName && m.quantityUsed && (
                                                <p className="text-sm text-gray-600 mt-2">
                                                    <span className="font-semibold">Item Used:</span> {m.stockItemName} ({m.quantityUsed} used)
                                                </p>
                                            )}
                                            {m.observations && (
                                                <p className="text-sm text-gray-600 mt-2">
                                                    <span className="font-semibold">Obs:</span> {m.observations}
                                                </p>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center py-10 text-gray-500">No maintenances scheduled.</p>
                )}
            </div>
        </>
    );
}

export default Calendar;