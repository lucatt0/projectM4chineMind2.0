
import React, { useEffect, useState } from 'react';
import { getUsedStockReport, getScheduledMaintenancesReport } from '../api';

interface ReportItem {
    type: 'usedStock' | 'scheduledMaintenance';
    date: string;
    description: string;
    details: string;
}

const Reports: React.FC = () => {
    const [reportData, setReportData] = useState<ReportItem[]>([]);
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    const fetchReports = async () => {
        try {
            const [usedStockRes, scheduledMaintenancesRes] = await Promise.all([
                getUsedStockReport(selectedMonth, selectedYear),
                getScheduledMaintenancesReport(selectedMonth, selectedYear),
            ]);

            const usedStockFormatted: ReportItem[] = usedStockRes.map((item: any) => ({
                type: 'usedStock',
                date: item.date,
                description: `Item: ${item.itemName}`,
                details: `Quantidade: ${item.quantity}`,
            }));

            const scheduledMaintenancesFormatted: ReportItem[] = scheduledMaintenancesRes.map((item: any) => ({
                type: 'scheduledMaintenance',
                date: item.date,
                description: `Máquina: ${item.machineName}`,
                details: item.description,
            }));

            const combinedData = [...usedStockFormatted, ...scheduledMaintenancesFormatted].sort(
                (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            setReportData(combinedData);
        } catch (error) {
            console.error('Error fetching reports:', error);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [selectedMonth, selectedYear]);

    const handlePrint = () => {
        const printContent = document.getElementById('reportTable')?.outerHTML;
        if (printContent) {
            const printWindow = window.open('', '', 'height=600,width=800');
            if (printWindow) {
                printWindow.document.write(`<html><head><title>Relatório Unificado</title></head><body>`);
                printWindow.document.write(printContent);
                printWindow.document.write('</body></html>');
                printWindow.document.close();
                printWindow.print();
            }
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Relatório Unificado</h1>

            <div className="flex items-end space-x-4 mb-4">
                <div>
                    <label htmlFor="month-select" className="block text-sm font-medium text-gray-700">Mês</label>
                    <select
                        id="month-select"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                        {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="year-select" className="block text-sm font-medium text-gray-700">Ano</label>
                    <input
                        type="number"
                        id="year-select"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    />
                </div>
                <button
                    onClick={fetchReports}
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                >
                    Filtrar
                </button>
            </div>

            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Relatório Consolidado</h2>
                    <button
                        onClick={handlePrint}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    >
                        Imprimir
                    </button>
                </div>
                <div id="reportTable">
                    <table className="min-w-full bg-white">
                        <thead>
                            <tr>
                                <th className="py-2 px-4 border-b">Data</th>
                                <th className="py-2 px-4 border-b">Tipo</th>
                                <th className="py-2 px-4 border-b">Descrição</th>
                                <th className="py-2 px-4 border-b">Detalhes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.map((item, index) => (
                                <tr key={index}>
                                    <td className="py-2 px-4 border-b">{new Date(item.date).toLocaleDateString()}</td>
                                    <td className="py-2 px-4 border-b">{item.type === 'usedStock' ? 'Uso de Estoque' : 'Manutenção Agendada'}</td>
                                    <td className="py-2 px-4 border-b">{item.description}</td>
                                    <td className="py-2 px-4 border-b">{item.details}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Reports;