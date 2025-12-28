
import React, { useEffect, useState } from 'react';
import { Search, ChevronRight, Calendar, MapPin, ChevronLeft, ArrowUpDown, CheckCircle, Clock, Trash2, Eye, X, Receipt, Users, PenBox, ArrowLeft } from 'lucide-react';
import { Button } from '../components/Button';
import { Bill, BillItem, Participant } from '../types';
import { useNavigate } from 'react-router-dom';

// Helper to parse dates like "28 Out, 2023" or "28/10/2023"
const parseDate = (dateStr: string): number => {
  try {
    // Handle "DD/MM/YYYY" format (from new entries)
    if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/');
        return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
    }
    
    // Handle "DD MMM, YYYY" format (mock data)
    const months: {[key: string]: number} = {
        'Jan': 0, 'Fev': 1, 'Mar': 2, 'Abr': 3, 'Mai': 4, 'Jun': 5,
        'Jul': 6, 'Ago': 7, 'Set': 8, 'Out': 9, 'Nov': 10, 'Dez': 11
    };
    
    // Remove commas and split
    const parts = dateStr.replace(',', '').split(' ');
    if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const monthStr = parts[1];
        const year = parseInt(parts[2]);
        const month = months[monthStr] !== undefined ? months[monthStr] : 0;
        return new Date(year, month, day).getTime();
    }
    
    return 0;
  } catch (e) {
    return 0;
  }
};

const MOCK_HISTORY: Bill[] = [
  { id: '1', name: 'Pizzaria Napoli', date: '28 Out, 2023', total: 85.50, share: 28.50, status: 'paid', items: [], participants: [], tax: 0, tip: 0 },
  { id: '2', name: 'Bar do Zé', date: '25 Out, 2023', total: 32.00, share: 16.00, status: 'pending', items: [], participants: [], tax: 0, tip: 0 },
  { id: '3', name: 'Supermercado Central', date: '22 Out, 2023', total: 112.30, share: 56.15, status: 'overdue', items: [], participants: [], tax: 0, tip: 0 },
];

interface HistoryProps {
  userLocation?: string;
}

type FilterStatus = 'all' | 'paid' | 'pending' | 'overdue';
type SortOrder = 'desc' | 'asc';

export const History: React.FC<HistoryProps> = ({ userLocation }) => {
  const navigate = useNavigate();
  // Raw Data
  const [rawData, setRawData] = useState<Bill[]>([]);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [detailsTab, setDetailsTab] = useState<'division' | 'receipt'>('division');
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const savedHistory = localStorage.getItem('bill_history');
    
    if (savedHistory) {
        try {
            setRawData(JSON.parse(savedHistory));
        } catch (e) {
            console.error("Error parsing history", e);
            setRawData(MOCK_HISTORY);
        }
    } else {
        setRawData(MOCK_HISTORY);
        localStorage.setItem('bill_history', JSON.stringify(MOCK_HISTORY));
    }
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const updateStatus = (id: string, newStatus: 'paid' | 'pending') => {
      const updatedData = rawData.map(item => 
          item.id === id ? { ...item, status: newStatus } : item
      );
      setRawData(updatedData);
      localStorage.setItem('bill_history', JSON.stringify(updatedData));
  };

  const deleteItem = (id: string) => {
      if (window.confirm("Tem certeza que deseja excluir este registro?")) {
          const updatedData = rawData.filter(item => item.id !== id);
          setRawData(updatedData);
          localStorage.setItem('bill_history', JSON.stringify(updatedData));
          
          if (currentPage > 1 && updatedData.length <= (currentPage - 1) * itemsPerPage) {
              setCurrentPage(currentPage - 1);
          }
      }
  };

  const handleEditBill = (bill: Bill) => {
    navigate('/review', { 
        state: { 
            items: bill.items, 
            image: bill.image,
            establishment: bill.name,
            date: bill.date,
            participants: bill.participants,
            id: bill.id,
            tax: bill.tax,
            tip: bill.tip
        } 
    });
  };

  // Filter and Sort Logic
  const filteredData = rawData.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
  }).sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
      (currentPage - 1) * itemsPerPage, 
      currentPage * itemsPerPage
  );

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        if (currentPage <= 3) {
            pages.push(1, 2, 3, '...', totalPages);
        } else if (currentPage >= totalPages - 2) {
            pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
        } else {
            pages.push(1, '...', currentPage, '...', totalPages);
        }
    }
    return pages;
  };

  // Helper to calculate totals for the modal view (re-using logic)
  const calculateBillDetails = (bill: Bill) => {
     if (!bill.items || !bill.participants) return [];
     
     const subtotal = bill.items.reduce((sum, item) => sum + item.price, 0);
     const taxAmount = bill.tax || 0;
     const tipAmount = bill.tip || 0;

     return bill.participants.map(p => {
        let myShare = 0;
        bill.items.forEach(item => {
            const userQty = item.assignments[p.id] || 0;
            if (userQty === 0) return;
            const totalAssignedQty = (Object.values(item.assignments) as number[]).reduce((a, b) => a + b, 0);
            
            if (item.quantity === 1 && totalAssignedQty > 0) {
                myShare += item.price / totalAssignedQty;
            } else if (item.quantity > 1) {
                const unitPrice = item.price / item.quantity;
                myShare += unitPrice * userQty;
            }
        });

        if (subtotal > 0) {
            const ratio = myShare / subtotal;
            myShare += (taxAmount * ratio) + (tipAmount * ratio);
        }
        return { ...p, amount: myShare };
     }).sort((a, b) => b.amount - a.amount);
  };

  return (
    <div className="container mx-auto px-4 py-12 flex-1">
      {/* DETAILS MODAL */}
      {selectedBill && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-surface-dark border border-border-dark rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                  {/* Modal Header */}
                  <div className="flex items-center justify-between p-6 border-b border-border-dark">
                      <div>
                          <h2 className="text-2xl font-bold text-white">{selectedBill.name}</h2>
                          <p className="text-gray-400 text-sm">{selectedBill.date} • Total: <span className="text-primary font-bold">R$ {selectedBill.total.toFixed(2)}</span></p>
                      </div>
                      <div className="flex gap-2">
                          {selectedBill.status !== 'paid' && (
                              <button 
                                onClick={() => handleEditBill(selectedBill)}
                                className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-sm font-bold transition-colors"
                              >
                                  <PenBox className="size-4" />
                                  <span className="hidden sm:inline">Editar</span>
                              </button>
                          )}
                          <button onClick={() => setSelectedBill(null)} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                              <X className="size-6" />
                          </button>
                      </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b border-border-dark">
                      <button 
                        onClick={() => setDetailsTab('division')}
                        className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors border-b-2 ${detailsTab === 'division' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'}`}
                      >
                          <Users className="size-4" /> Divisão
                      </button>
                      <button 
                        onClick={() => setDetailsTab('receipt')}
                        className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors border-b-2 ${detailsTab === 'receipt' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'}`}
                      >
                          <Receipt className="size-4" /> Nota Original
                      </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-auto p-6">
                      {detailsTab === 'division' ? (
                          <div className="space-y-6">
                              {(selectedBill.participants && selectedBill.items) ? (
                                  <>
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-bold text-gray-500 uppercase">Resumo por Pessoa</h3>
                                        {calculateBillDetails(selectedBill).map(p => (
                                            <div key={p.id} className="flex justify-between items-center p-3 rounded-lg bg-background-dark border border-border-dark">
                                                <div className="flex items-center gap-3">
                                                    <img src={p.avatar} alt={p.name} className="size-8 rounded-full bg-white/10 object-cover" />
                                                    <span className="font-medium text-white">{p.name} {p.isCurrentUser && '(Você)'}</span>
                                                </div>
                                                <span className="font-bold text-white">R$ {p.amount.toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-bold text-gray-500 uppercase">Itens da Conta</h3>
                                        <div className="bg-background-dark rounded-lg border border-border-dark divide-y divide-border-dark">
                                            {selectedBill.items.map(item => (
                                                <div key={item.id} className="p-3 flex justify-between items-center">
                                                    <div>
                                                        <p className="text-sm font-medium text-white">{item.quantity}x {item.name}</p>
                                                        <p className="text-xs text-gray-500">
                                                            Consumido por: {selectedBill.participants.filter(p => item.assignments[p.id]).map(p => p.name.split(' ')[0]).join(', ')}
                                                        </p>
                                                    </div>
                                                    <span className="text-sm text-gray-400">R$ {item.price.toFixed(2)}</span>
                                                </div>
                                            ))}
                                            {(selectedBill.tax > 0 || selectedBill.tip > 0) && (
                                                <div className="p-3 bg-white/5 flex justify-between items-center">
                                                    <span className="text-sm font-medium text-gray-400">Taxas e Gorjeta</span>
                                                    <span className="text-sm text-gray-400">R$ {(selectedBill.tax + selectedBill.tip).toFixed(2)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                  </>
                              ) : (
                                  <div className="text-center py-10 text-gray-500">
                                      <p>Detalhes não disponíveis para registros antigos.</p>
                                  </div>
                              )}
                          </div>
                      ) : (
                          <div className="flex items-center justify-center min-h-[300px]">
                              {selectedBill.image ? (
                                  <img src={selectedBill.image} alt="Nota Fiscal" className="max-w-full h-auto rounded-lg shadow-lg border border-border-dark" />
                              ) : (
                                  <div className="text-center text-gray-500">
                                      <Receipt className="size-16 mx-auto opacity-20 mb-4" />
                                      <p>Imagem da nota não disponível.</p>
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
                  
                  {/* Modal Footer with Edit Action */}
                   <div className="p-4 border-t border-border-dark flex justify-end gap-3 bg-surface-dark rounded-b-2xl">
                        <Button 
                            variant="secondary"
                            onClick={() => setSelectedBill(null)}
                        >
                            Fechar
                        </Button>
                        <Button 
                            onClick={() => handleEditBill(selectedBill)}
                            icon={<PenBox className="size-4" />}
                        >
                            Editar / Corrigir Divisão
                        </Button>
                   </div>
              </div>
          </div>
      )}

      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col gap-4">
           {/* Back Button */}
           <div>
               <button
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
               >
                   <ArrowLeft className="size-5" />
                   <span className="font-medium">Voltar</span>
               </button>
           </div>

           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <h1 className="text-4xl font-black text-white">Histórico de Contas</h1>
            <button 
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="flex items-center gap-2 bg-surface-dark border border-border-dark px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-colors active:scale-95"
            >
                <Calendar className="size-4" />
                <span className="text-sm font-medium">
                    {sortOrder === 'desc' ? 'Mais Recentes' : 'Mais Antigos'}
                </span>
                <ArrowUpDown className="size-3 ml-1 opacity-50" />
            </button>
          </div>
          
          {/* Location Indicator */}
          <div className="flex items-center gap-2 text-primary">
            <MapPin className="size-4" />
            <span className="text-sm font-bold uppercase tracking-wide">
              Localização Atual: <span className="text-white">{userLocation || "..."}</span>
            </span>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="size-5 text-gray-500" />
            </div>
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface-dark border border-border-dark rounded-lg pl-10 pr-4 py-3 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="Buscar por estabelecimento..."
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {[
                { id: 'all', label: 'Todos' },
                { id: 'paid', label: 'Pagos' },
                { id: 'pending', label: 'Pendentes' },
                { id: 'overdue', label: 'Atrasados' }
            ].map((filter) => (
                <button 
                    key={filter.id}
                    onClick={() => setStatusFilter(filter.id as FilterStatus)}
                    className={`
                        px-6 py-3 rounded-lg font-bold text-sm whitespace-nowrap transition-colors border
                        ${statusFilter === filter.id 
                            ? 'bg-primary/20 text-primary border-primary/50' 
                            : 'bg-surface-dark text-gray-300 border-border-dark hover:bg-white/5 hover:text-white'
                        }
                    `}
                >
                    {filter.label}
                </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface-dark border border-border-dark rounded-xl overflow-hidden min-h-[300px]">
          {paginatedData.length > 0 ? (
            <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                <thead className="bg-background-dark border-b border-border-dark">
                    <tr>
                    <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Estabelecimento</th>
                    <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Data</th>
                    <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Valor Total</th>
                    <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Sua Parte</th>
                    <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-right px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border-dark">
                    {paginatedData.map((bill, idx) => (
                    <tr key={`${bill.id}-${idx}`} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4 text-sm font-medium text-white">{bill.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-400">{bill.date}</td>
                        <td className="px-6 py-4 text-sm text-gray-400">R$ {Number(bill.total).toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm font-bold text-white">R$ {Number(bill.share).toFixed(2)}</td>
                        <td className="px-6 py-4">
                        {bill.status === 'paid' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-500/10 text-green-400">
                            <span className="size-1.5 rounded-full bg-green-400" /> Pago
                            </span>
                        )}
                        {(bill.status === 'pending' || !bill.status) && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/10 text-orange-400">
                            <span className="size-1.5 rounded-full bg-orange-400" /> Pendente
                            </span>
                        )}
                        {bill.status === 'overdue' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-400">
                            <span className="size-1.5 rounded-full bg-red-400" /> Atrasado
                            </span>
                        )}
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => setSelectedBill(bill)}
                                    className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                                    title="Ver Detalhes e Nota"
                                >
                                    <Eye className="size-4" />
                                </button>
                                <button 
                                    onClick={() => handleEditBill(bill)}
                                    className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                                    title="Editar"
                                >
                                    <PenBox className="size-4" />
                                </button>

                                <div className="w-px h-4 bg-white/10 mx-1"></div>

                                {bill.status === 'paid' ? (
                                    <button 
                                        onClick={() => updateStatus(bill.id, 'pending')}
                                        className="p-2 rounded-lg hover:bg-orange-500/20 text-gray-500 hover:text-orange-400 transition-colors"
                                        title="Marcar como Pendente"
                                    >
                                        <Clock className="size-4" />
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => updateStatus(bill.id, 'paid')}
                                        className="p-2 rounded-lg hover:bg-green-500/20 text-gray-500 hover:text-green-400 transition-colors"
                                        title="Marcar como Pago"
                                    >
                                        <CheckCircle className="size-4" />
                                    </button>
                                )}
                                
                                <button 
                                    onClick={() => deleteItem(bill.id)}
                                    className="p-2 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
                                    title="Excluir Histórico"
                                >
                                    <Trash2 className="size-4" />
                                </button>
                            </div>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
          ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <Search className="size-12 mb-4 opacity-20" />
                  <p className="text-lg font-medium">Nenhum histórico encontrado</p>
                  <p className="text-sm">Tente alterar os filtros ou escaneie uma nova conta.</p>
              </div>
          )}
        </div>

        {/* Pagination */}
        {filteredData.length > 0 && (
            <div className="flex items-center justify-between">
                <Button 
                    variant="secondary" 
                    className="h-10 px-4 gap-2" 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                    <ChevronLeft className="size-4" />
                    <span className="hidden sm:inline">Anterior</span>
                </Button>
                
                <div className="flex gap-2">
                    {getPageNumbers().map((page, idx) => (
                        <button 
                            key={idx}
                            onClick={() => typeof page === 'number' && setCurrentPage(page)}
                            disabled={typeof page !== 'number'}
                            className={`
                                size-10 rounded-lg text-sm font-bold transition-colors
                                ${page === currentPage 
                                    ? 'bg-primary text-background-dark shadow-lg shadow-primary/20' 
                                    : typeof page === 'number' 
                                        ? 'bg-white/5 hover:bg-white/10 text-white' 
                                        : 'text-gray-500 cursor-default'
                                }
                            `}
                        >
                            {page}
                        </button>
                    ))}
                </div>

                <Button 
                    variant="secondary" 
                    className="h-10 px-4 gap-2"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                >
                    <span className="hidden sm:inline">Próximo</span>
                    <ChevronRight className="size-4" />
                </Button>
            </div>
        )}
      </div>
    </div>
  );
};
