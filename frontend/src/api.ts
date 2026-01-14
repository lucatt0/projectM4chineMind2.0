import { Machine, StockItem, Operator, Sensor, Maintenance } from './types';

const API_URL = 'http://localhost:8080/api';

// Machine API
export const getMachines = async (): Promise<Machine[]> => {
    const response = await fetch(`${API_URL}/machines`);
    if (!response.ok) {
        throw new Error('Failed to fetch machines');
    }
    return response.json();
};

export const createMachine = async (machine: Omit<Machine, 'id'>): Promise<Machine> => {
    const response = await fetch(`${API_URL}/machines`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(machine),
    });
    if (!response.ok) {
        throw new Error('Failed to create machine');
    }
    return response.json();
};

export const updateMachine = async (id: string, machine: Omit<Machine, 'id'>): Promise<Machine> => {
    const response = await fetch(`${API_URL}/machines/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(machine),
    });
    return response.json();
};

export const deleteMachine = async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/machines/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error('Failed to delete machine');
    }
};

// Maintenance API
export const getMaintenance = async (): Promise<Maintenance[]> => {
    const response = await fetch(`${API_URL}/maintenance`);
    if (!response.ok) {
        throw new Error('Failed to fetch maintenance schedules');
    }
    return response.json();
};

export const createMaintenance = async (maintenance: Omit<Maintenance, 'id'>): Promise<Maintenance> => {
    const response = await fetch(`${API_URL}/maintenance`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(maintenance),
    });
    if (!response.ok) {
        throw new Error('Failed to create maintenance schedule');
    }
    return response.json();
};

export const updateMaintenance = async (id: string, maintenance: Maintenance): Promise<Maintenance> => {
    const response = await fetch(`${API_URL}/maintenance/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(maintenance),
    });
    if (!response.ok) {
        throw new Error('Failed to update maintenance schedule');
    }
    return response.json();
};

export const deleteMaintenance = async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/maintenance/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error('Failed to delete maintenance schedule');
    }
};


// Stock API calls
export const getStockItems = async (): Promise<StockItem[]> => {
    const response = await fetch(`${API_URL}/stock`);
    if (!response.ok) {
        throw new Error('Failed to fetch stock items');
    }
    return response.json();
}

export const createStockItem = async (item: Omit<StockItem, 'id'>): Promise<StockItem> => {
    const response = await fetch(`${API_URL}/stock`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(item),
    });
    if (!response.ok) {
        throw new Error('Failed to create stock item');
    }
    return response.json();
}

export const updateStockItem = async (item: StockItem): Promise<StockItem> => {
    const response = await fetch(`${API_URL}/stock/${item.id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(item),
    });
    if (!response.ok) {
        throw new Error('Failed to update stock item');
    }
    return response.json();
}

export const deleteStockItem = async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/stock/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error('Failed to delete stock item');
    }
}

// Operator API calls
export const getOperators = async (): Promise<Operator[]> => {
    const response = await fetch(`${API_URL}/operators`);
    if (!response.ok) {
        throw new Error('Failed to fetch operators');
    }
    return response.json();
}

export const createOperator = async (operator: Omit<Operator, 'id'>): Promise<Operator> => {
    const response = await fetch(`${API_URL}/operators`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(operator),
    });
    if (!response.ok) {
        throw new Error('Failed to create operator');
    }
    return response.json();
}

export const updateOperator = async (id: string, operator: Omit<Operator, 'id'>): Promise<Operator> => {
    const response = await fetch(`${API_URL}/operators/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(operator),
    });
    if (!response.ok) {
        throw new Error('Failed to update operator');
    }
    return response.json();
}

export const deleteOperator = (id: string) => {
    return fetch(`${API_URL}/operators/${id}`, {
        method: 'DELETE',
    });
};

export const addSensorToMachine = async (machineId: string, sensor: Omit<Sensor, 'id'>): Promise<Sensor> => {
    const response = await fetch(`${API_URL}/machines/${machineId}/sensors`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(sensor),
    });
    if (!response.ok) {
        throw new Error('Failed to add sensor to machine');
    }
    return response.json();
};

export const removeSensorFromMachine = async (machineId: string, sensorId: string): Promise<void> => {
    const response = await fetch(`${API_URL}/machines/${machineId}/sensors/${sensorId}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error('Failed to remove sensor from machine');
    }
};