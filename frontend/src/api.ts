const API_URL = 'http://localhost:8080/api';

export interface Machine {
  id: string;
  name: string;
  status: string;
}

export interface Maintenance {
  id: string;
  machineId: string;
  date: string; // YYYY-MM-DD
  observations: string;
  stockItemId?: string;
  quantityUsed?: number;
}

export interface StockItem {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    value: number;
    location: string;
}

// Machine API calls
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

export const updateMachine = async (machine: Machine): Promise<Machine> => {
  const response = await fetch(`${API_URL}/machines/${machine.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(machine),
  });
  if (!response.ok) {
    throw new Error('Failed to update machine');
  }
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

// Maintenance API calls
export const getMaintenances = async (): Promise<Maintenance[]> => {
    const response = await fetch(`${API_URL}/maintenances`);
    if (!response.ok) {
        throw new Error('Failed to fetch maintenances');
    }
    return response.json();
}

export const createMaintenance = async (maintenance: Omit<Maintenance, 'id'>): Promise<Maintenance> => {
    const response = await fetch(`${API_URL}/maintenances`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(maintenance),
    });
    if (!response.ok) {
        throw new Error('Failed to create maintenance');
    }
    return response.json();
}

export const deleteMaintenance = async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/maintenances/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error('Failed to delete maintenance');
    }
}

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
