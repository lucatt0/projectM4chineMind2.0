import React, { useState, useEffect } from 'react';
import { getOperators, createOperator, updateOperator, deleteOperator } from '../api';
import { Operator } from '../types';
import OperatorForm from '../components/OperatorForm';
import Modal from '../components/Modal';

const Operators: React.FC = () => {
    const [operators, setOperators] = useState<Operator[]>([]);
    const [editingOperator, setEditingOperator] = useState<Operator | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchOperators();
    }, []);

    const fetchOperators = async () => {
        const data = await getOperators();
        setOperators(data);
    };

    const handleCreate = () => {
        setEditingOperator(null);
        setIsModalOpen(true);
    };

    const handleEdit = (operator: Operator) => {
        setEditingOperator(operator);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        await deleteOperator(id);
        fetchOperators();
    };

    const handleSave = async (operator: Omit<Operator, 'id'> | Operator) => {
        if ('id' in operator) {
            await updateOperator(operator.id, operator);
        } else {
            await createOperator(operator);
        }
        fetchOperators();
        setIsModalOpen(false);
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Operators</h1>
            <button
                onClick={handleCreate}
                className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
            >
                Add Operator
            </button>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <OperatorForm
                    operator={editingOperator}
                    onSave={handleSave}
                    onCancel={() => setIsModalOpen(false)}
                />
            </Modal>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {operators.map((operator) => (
                    <div key={operator.id} className="bg-white p-4 rounded shadow">
                        <h2 className="text-xl font-semibold">{operator.name}</h2>
                        <div className="mt-4 flex justify-end space-x-2">
                            <button
                                onClick={() => handleEdit(operator)}
                                className="bg-yellow-500 text-white px-3 py-1 rounded"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => handleDelete(operator.id)}
                                className="bg-red-500 text-white px-3 py-1 rounded"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Operators;