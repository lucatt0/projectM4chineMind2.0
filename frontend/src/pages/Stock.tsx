import { useState, useEffect, FormEvent } from 'react';
import { getStockItems, createStockItem, updateStockItem, deleteStockItem, StockItem } from '../api';

function Stock() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [formData, setFormData] = useState({ name: '', quantity: 0, unit: '', value: 0, location: '' });
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.location || !formData.unit) {
      setError("Item name, unit, and location are required.");
      return;
    }

    try {
      if (editingItem) {
        const updated = await updateStockItem({ ...editingItem, ...formData });
        setItems(items.map(i => i.id === updated.id ? updated : i));
        setEditingItem(null);
      } else {
        const newItem = await createStockItem(formData);
        setItems([...items, newItem]);
      }
      setFormData({ name: '', quantity: 0, unit: '', value: 0, location: '' });
      setError(null);
    } catch (error) {
       console.error(error);
       setError("Failed to save stock item. Please try again.");
    }
  };

  const handleEdit = (item: StockItem) => {
    setEditingItem(item);
    setFormData({ name: item.name, quantity: item.quantity, unit: item.unit, value: item.value, location: item.location });
  };

  const handleDelete = async (id: string) => {
    if(confirm('Are you sure you want to delete this stock item?')) {
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
  
  const cancelEdit = () => {
    setEditingItem(null);
    setFormData({ name: '', quantity: 0, unit: '', value: 0, location: '' });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  return (
    <>
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Stock Management</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4">{editingItem ? 'Edit Item' : 'Add New Item'}</h2>
              <form onSubmit={handleSubmit}>
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
                <div className="flex items-center justify-between">
                    <button type="submit" className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        {editingItem ? 'Update Item' : 'Add Item'}
                    </button>
                    {editingItem && (
                        <button type="button" onClick={cancelEdit} className="text-sm text-gray-600 hover:text-gray-900">
                            Cancel
                        </button>
                    )}
                </div>
              </form>
            </div>
          </div>

          <div className="md:col-span-2">
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
          </div>
        </div>
    </>
  );
}

export default Stock;