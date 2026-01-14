import React, { useState, useEffect } from 'react';
import { Operator } from '../types';

interface OperatorFormProps {
    operator: Operator | null;
    onSave: (operator: Omit<Operator, 'id'> | Operator) => void;
    onCancel: () => void;
}

const OperatorForm: React.FC<OperatorFormProps> = ({ operator, onSave, onCancel }) => {
    const [name, setName] = useState('');

    useEffect(() => {
        if (operator) {
            setName(operator.name);
        } else {
            setName('');
        }
    }, [operator]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...operator, name });
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow mb-4">
            <h2 className="text-xl font-bold mb-4">{operator ? 'Edit Operator' : 'Add Operator'}</h2>
            <div className="mb-4">
                <label className="block text-gray-700">Name</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                    required
                />
            </div>
            <div className="flex justify-end space-x-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="bg-gray-500 text-white px-4 py-2 rounded"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                    Save
                </button>
            </div>
        </form>
    );
};

export default OperatorForm;