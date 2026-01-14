export interface Machine {
    id: string;
    name: string;
    status: string;
    operatorId?: string;
    sensors?: Sensor[];
}

export interface StockItem {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    value: number;
    location: string;
}

export interface Operator {
    id: string;
    name: string;
}

export interface Sensor {
    id: string;
    name: string;
    type: string;
}

export interface Maintenance {
    id: string;
    machineId: string;
    date: string;
    description: string;
    usedStock: UsedStockItem[];
}

export interface UsedStockItem {
    stockItemId: string;
    quantity: number;
}