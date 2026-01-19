import { useState, useEffect } from 'react';
import { getStockItems, createStockItem, updateStockItem, deleteStockItem, StockItem } from '../api';
import Modal from '../components/Modal';
import StockForm from '../components/StockForm';

function Stock() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const data = await getStockItems();
      setItems(data);
      setError(null);
    } catch (error) {
      console.error(error);
      setError("Failed to fetch stock items. Is the backend server running?");
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: StockItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleSave = async (item: Omit<StockItem, 'id'> | StockItem) => {
    try {
      if ('id' in item) {
        const updated = await updateStockItem(item);
        setItems(items.map(i => i.id === updated.id ? updated : i));
      } else {
        const newItem = await createStockItem(item);
        setItems([...items, newItem]);
      }
      setIsModalOpen(false);
      setError(null);
    } catch (error) {
      console.error(error);
      setError("Failed to save stock item. Please try again.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this stock item?')) {
      try {
        await deleteStockItem(id);
        setItems(items.filter(i => i.id !== id));
        setError(null);
      } catch (error) {
        console.error(error);
        setError("Failed to delete stock item. Please try again.");
      }
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Stock Management</h1>
      <div className="mb-4">
        <button
          onClick={handleCreate}
          className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Add New Item
        </button>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <StockForm
          item={editingItem}
          onSave={handleSave}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <div className="bg-white shadow overflow-hidden rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.length > 0 ? items.map(item => (
              <tr key={item.id}>
                <td className="px-6 py-4 whitespace-nowrap">{item.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-center">{item.quantity}</td>
                <td className="px-6 py-4 whitespace-nowrap">{item.unit}</td>
                <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(item.value)}</td>
                <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(item.value * item.quantity)}</td>
                <td className="px-6 py-4 whitespace-nowrap">{item.location}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => handleEdit(item)} className="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
                  <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-500">
                  No stock items found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default Stock;