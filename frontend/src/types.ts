export interface Machine {
    id: string;
    name: string;
    status: string;
    operatorId?: string;
}

export interface Maintenance {
    id: string;
    machineId: string;
    date: string;
    observations: string;
    stockItemId: string;
    quantityUsed: number;
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