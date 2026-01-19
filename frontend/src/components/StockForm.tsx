import React, { useState, useEffect, FormEvent } from 'react';
import { StockItem } from '../api';

interface StockFormProps {
    item: StockItem | null;
    onSave: (item: Omit<StockItem, 'id'> | StockItem) => void;
    onCancel: () => void;
}

const StockForm: React.FC<StockFormProps> = ({ item, onSave, onCancel }) => {
    const [formData, setFormData] = useState({ name: '', quantity: 0, unit: '', value: 0, location: '' });

    useEffect(() => {
        if (item) {
            setFormData({ name: item.name, quantity: item.quantity, unit: item.unit, value: item.value, location: item.location });
        } else {
            setFormData({ name: '', quantity: 0, unit: '', value: 0, location: '' });
        }
    }, [item]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let parsedValue: string | number = value;
        if (name === 'quantity') {
            parsedValue = parseInt(value, 10) || 0;
        } else if (name === 'value') {
            parsedValue = parseFloat(value) || 0;
        }
        setFormData(prev => ({ ...prev, [name]: parsedValue }));
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (item) {
            onSave({ ...item, ...formData });
        } else {
            onSave(formData);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <h2 className="text-xl font-bold mb-4">{item ? 'Edit Item' : 'Add New Item'}</h2>
            <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                <input
                    type="text" id="name" name="name" value={formData.name} onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="e.g., Filter F-10"
                />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Quantity</label>
                    <input
                        type="number" id="quantity" name="quantity" value={formData.quantity} onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                </div>
                <div>
                    <label htmlFor="unit" className="block text-sm font-medium text-gray-700">Unit</label>
                    <input
                        type="text" id="unit" name="unit" value={formData.unit} onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="e.g., piece, kg, liter"
                    />
                </div>
            </div>
            <div className="mb-4">
                <label htmlFor="value" className="block text-sm font-medium text-gray-700">Value (Price)</label>
                <input
                    type="number" id="value" name="value" value={formData.value} onChange={handleInputChange} step="0.01"
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
            </div>
            <div className="mb-4">
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
                <input
                    type="text" id="location" name="location" value={formData.location} onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="e.g., Shelf A-3"
                />
            </div>
            <div className="flex items-center justify-end space-x-4">
                <button type="button" onClick={onCancel} className="text-sm text-gray-600 hover:text-gray-900">
                    Cancel
                </button>
                <button type="submit" className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    {item ? 'Update Item' : 'Add Item'}
                </button>
            </div>
        </form>
    );
};

export default StockForm;