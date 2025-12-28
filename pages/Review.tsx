
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Trash2, Plus, User, Check, Receipt, Share2, QrCode, ArrowLeft, X, UserPlus, AlertTriangle, Save, Minus, Copy, XCircle, CheckCircle, FileText, Download, ArrowRight, PenLine, Eye, HelpCircle, MousePointerClick } from 'lucide-react';
import { BillItem, Participant, Bill } from '../types';
import { Button } from '../components/Button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- PIX GENERATOR HELPERS (EMV Standard) ---

const formatEmvField = (id: string, value: string): string => {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
};

const crc16ccitt = (payload: string): string => {
  let crc = 0xFFFF; 
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
      crc ^= (payload.charCodeAt(i) << 8);
      for (let j = 0; j < 8; j++) {
          if ((crc & 0x8000) !== 0) {
              crc = ((crc << 1) ^ polynomial);
          } else {
              crc = (crc << 1);
          }
      }
  }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
};

const generateStaticPix = (key: string, name: string, city: string, amount: number, txtId: string = '***'): string => {
  const cleanKey = key.trim();
  const cleanName = name.substring(0, 25).normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const cleanCity = city.substring(0, 15).normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const amountStr = amount.toFixed(2);

  const merchantAccount = formatEmvField('00', 'br.gov.bcb.pix') + formatEmvField('01', cleanKey);
  
  let payload = 
    formatEmvField('00', '01') +
    formatEmvField('26', merchantAccount) +
    formatEmvField('52', '0000') +
    formatEmvField('53', '986') +
    formatEmvField('54', amountStr) +
    formatEmvField('58', 'BR') +
    formatEmvField('59', cleanName) +
    formatEmvField('60', cleanCity) +
    formatEmvField('62', formatEmvField('05', txtId));

  payload += '6304'; 

  const crc = crc16ccitt(payload);
  return payload + crc;
};

// Helper function to generate gender-aware avatars
const getAvatarUrl = (name: string): string => {
  const lowerName = name.toLowerCase().trim();
  const firstName = lowerName.split(' ')[0];
  const cleanName = firstName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const seed = encodeURIComponent(name);

  let isFemale = false;

  // 1. Explicit Female Exceptions
  const femaleExceptions = [
    'alice', 'beatriz', 'inês', 'ines', 'liz', 'kelly', 'raquel', 'ruth', 
    'simone', 'ester', 'miriam', 'carmen', 'rachel', 'isis', 'thais', 
    'lourdes', 'dolores', 'nicole', 'carol', 'caroline', 'michele', 
    'maite', 'sophie', 'gabi', 'gabriele', 'laryssa', 'ingrid'
  ];

  // 2. Explicit Male Exceptions
  const maleExceptions = [
    'luca', 'lucas', 'jonas', 'nicolas', 'mattia', 'elias', 'tobias', 
    'zacarias', 'joshua', 'jean', 'ryan', 'yan', 'cauã', 'kaique', 
    'felipe', 'andre', 'andré', 'daví', 'davi', 'levi', 'yuri', 'ari', 
    'alex', 'max', 'tom', 'noah', 'arthur', 'pedro', 'theo'
  ];

  if (femaleExceptions.includes(cleanName)) {
    isFemale = true;
  } else if (cleanName.endsWith('a') || cleanName.endsWith('ah') || cleanName.endsWith('elly')) {
    if (!maleExceptions.includes(cleanName)) {
      isFemale = true;
    }
  }

  // Using DiceBear 7.x for stability. 
  if (isFemale) {
    return `https://api.dicebear.com/7.x/lorelei/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,ffdfbf&flip=false`;
  } else {
    return `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}&backgroundColor=b6e3f4,d1d4f9,c0aede&flip=false`;
  }
};

// Mock participants for demo
const DEFAULT_PARTICIPANTS: Participant[] = [
  { 
    id: 'me', 
    name: 'Eu', 
    avatar: getAvatarUrl('Eu'), 
    isCurrentUser: true 
  },
];

export const Review: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Data State
  const [items, setItems] = useState<BillItem[]>([]);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [establishmentName, setEstablishmentName] = useState("Novo Estabelecimento");
  const [billDate, setBillDate] = useState(new Date().toLocaleDateString('pt-BR'));
  
  // Save ID State (to update existing history items instead of creating duplicates)
  const [existingId, setExistingId] = useState<string | null>(null);

  // Participant State
  const [participants, setParticipants] = useState<Participant[]>(DEFAULT_PARTICIPANTS);
  const [isAddingParticipant, setIsAddingParticipant] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState("");
  const newParticipantInputRef = useRef<HTMLInputElement>(null);
  
  // Tax & Tip State
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [tipType, setTipType] = useState<'0' | '10' | '15' | 'custom'>('10');
  const [customTip, setCustomTip] = useState<string>('');

  // Subtotal Editing State
  const [manualSubtotal, setManualSubtotal] = useState<string>('');

  // Pix Modal State
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixStep, setPixStep] = useState<'input' | 'display'>('input');
  const [userPixKey, setUserPixKey] = useState('');
  const [userPixName, setUserPixName] = useState('');
  const [pixCode, setPixCode] = useState('');
  const [pixCopied, setPixCopied] = useState(false);

  // Receipt Modal State (Mobile)
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Tutorial State
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  useEffect(() => {
    if (location.state) {
      const { items: parsedItems, image, establishment, date, participants: loadedParticipants, id, tax, tip } = location.state as any;
      
      if (parsedItems) setItems(parsedItems);
      if (image) setReceiptImage(image);
      if (establishment) setEstablishmentName(establishment);
      if (date) setBillDate(date);
      if (loadedParticipants) setParticipants(loadedParticipants);
      if (id) setExistingId(id);
      if (tax) setTaxAmount(tax);
      
      // Handle Tip Restoration if exists but simplistic
      if (tip) {
          // If needed, logic to restore tip percentage could go here, 
          // but usually keeping default or current logic is safer unless explicitly stored
      }

    } else {
        // Fallback for direct navigation
        setItems([
            { id: '1', name: 'Pizza Marguerita', price: 45.00, quantity: 1, assignments: {} },
            { id: '2', name: 'Água Mineral', price: 16.00, quantity: 4, assignments: {} }, 
            { id: '3', name: 'Sobremesa', price: 15.50, quantity: 1, assignments: {} },
        ]);
        // Trigger tutorial automatically if it's a fresh manual visit (mock) or user seems new
        // For now, we leave it manual via button
    }
  }, [location.state]);

  useEffect(() => {
    if (isAddingParticipant && newParticipantInputRef.current) {
        newParticipantInputRef.current.focus();
    }
  }, [isAddingParticipant]);

  // Update manual subtotal display when items change
  const calculatedSubtotal = items.reduce((sum, item) => sum + item.price, 0);
  
  const confirmAddParticipant = () => {
    if (newParticipantName && newParticipantName.trim()) {
        const cleanName = newParticipantName.trim();
        
        const newParticipant: Participant = {
            id: `p-${Date.now()}`,
            name: cleanName,
            avatar: getAvatarUrl(cleanName) 
        };
        setParticipants([...participants, newParticipant]);
        setNewParticipantName("");
        setIsAddingParticipant(false);
    } else {
        setIsAddingParticipant(false);
    }
  };

  const removeParticipant = (participantId: string) => {
    setParticipants(prev => prev.filter(p => p.id !== participantId));
    setItems(prev => prev.map(item => {
        const newAssignments = { ...item.assignments };
        delete newAssignments[participantId];
        return { ...item, assignments: newAssignments };
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        confirmAddParticipant();
    } else if (e.key === 'Escape') {
        setIsAddingParticipant(false);
        setNewParticipantName("");
    }
  };

  const updateAssignment = (itemId: string, participantId: string, change: number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      
      const currentQty = item.assignments[participantId] || 0;
      const totalAssigned = (Object.values(item.assignments) as number[]).reduce((a, b) => a + b, 0);
      
      let newQty = currentQty + change;
      if (newQty < 0) newQty = 0;
      
      if (change > 0) {
          if (item.quantity === 1) {
              newQty = currentQty > 0 ? 0 : 1;
          } else {
              const otherAssigned = totalAssigned - currentQty;
              if (otherAssigned + newQty > item.quantity) {
                  newQty = 0;
              }
          }
      }
      
      const newAssignments = { ...item.assignments };
      if (newQty === 0) {
          delete newAssignments[participantId];
      } else {
          newAssignments[participantId] = newQty;
      }

      return { ...item, assignments: newAssignments };
    }));
  };

  const assignAllToMe = () => {
    const currentUser = participants.find(p => p.isCurrentUser);
    if (!currentUser) return;

    setItems(prevItems => prevItems.map(item => {
        if (item.assignments[currentUser.id]) return item;
        return { 
            ...item, 
            assignments: { ...item.assignments, [currentUser.id]: 1 } 
        };
    }));
  };

  const deleteItem = (itemId: string) => {
      setItems(prev => prev.filter(i => i.id !== itemId));
  };

  const calculateTip = (subtotal: number) => {
    if (tipType === 'custom') {
      return parseFloat(customTip) || 0;
    }
    return subtotal * (parseInt(tipType) / 100);
  };

  const tipAmount = calculateTip(calculatedSubtotal);
  const total = calculatedSubtotal + taxAmount + tipAmount;

  // Calculate per-person split
  const personTotals = participants.map(p => {
    let myShare = 0;
    items.forEach(item => {
      const userQty = item.assignments[p.id] || 0;
      if (userQty === 0) return;

      const totalAssignedQty = (Object.values(item.assignments) as number[]).reduce((a, b) => a + b, 0);
      
      if (item.quantity === 1 && totalAssignedQty > 0) {
          myShare += item.price / totalAssignedQty;
      } 
      else if (item.quantity > 1) {
          const unitPrice = item.price / item.quantity;
          myShare += unitPrice * userQty;
      }
    });

    if (calculatedSubtotal > 0) {
        const ratio = myShare / calculatedSubtotal;
        myShare += (taxAmount * ratio) + (tipAmount * ratio);
    }
    return { ...p, amount: myShare };
  });

  const totalDistributed = personTotals.reduce((acc, curr) => acc + curr.amount, 0);
  const remainder = total - totalDistributed;
  const hasDiscrepancy = Math.abs(remainder) > 0.05; 

  const handleSubtotalBlur = () => {
    const userValue = parseFloat(manualSubtotal);
    if (!isNaN(userValue) && Math.abs(userValue - calculatedSubtotal) > 0.01) {
        const diff = userValue - calculatedSubtotal;
        const newItem: BillItem = {
            id: `adjustment-${Date.now()}`,
            name: 'Ajuste / Correção',
            price: diff,
            quantity: 1,
            assignments: {}
        };
        setItems([...items, newItem]);
        setManualSubtotal(''); 
    } else {
        setManualSubtotal(''); 
    }
  };

  const handleSaveHistory = () => {
    const currentUserShare = personTotals.find(p => p.isCurrentUser)?.amount || 0;
    
    // Use existing ID if we are editing, or create new
    const idToSave = existingId || Date.now().toString();

    // Save full detailed object
    const historyItem: Bill = {
        id: idToSave,
        name: establishmentName,
        date: billDate,
        total: total,
        share: currentUserShare,
        status: 'pending',
        items: items,
        participants: participants,
        tax: taxAmount,
        tip: tipAmount,
        image: receiptImage || undefined
    };

    const existingHistory = JSON.parse(localStorage.getItem('bill_history') || '[]');
    
    // If editing, remove old entry first
    const filteredHistory = existingHistory.filter((item: Bill) => item.id !== idToSave);
    
    const updatedHistory = [historyItem, ...filteredHistory];
    
    // Check local storage limits (simple check)
    try {
        localStorage.setItem('bill_history', JSON.stringify(updatedHistory));
        navigate('/history');
    } catch (e) {
        alert("Erro ao salvar: O histórico está muito cheio ou a imagem é muito grande. Tente remover itens antigos.");
    }
  };

  const handleShareWhatsApp = () => {
    let message = `🧾 *Conta Dividida - ${establishmentName}*\n\n`;
    message += `💰 *Total Geral:* R$ ${total.toFixed(2)}\n\n`;
    message += `*Detalhamento por Pessoa:*\n`;
    
    personTotals.forEach(p => {
        if (p.amount > 0) {
            const percentage = total > 0 ? ((p.amount / total) * 100).toFixed(1) : '0';
            message += `👤 *${p.name}:* R$ ${p.amount.toFixed(2)} _(${percentage}%)_\n`;
        }
    });

    message += `\nGerado por BillSplitter`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleGeneratePix = () => {
    setPixStep('input');
    setShowPixModal(true);
    setPixCopied(false);
    if (!userPixName) {
        const currentUser = participants.find(p => p.isCurrentUser);
        if (currentUser) setUserPixName(currentUser.name);
    }
  };

  const confirmPixGeneration = () => {
      if (!userPixKey.trim()) return;
      
      const payload = generateStaticPix(
          userPixKey,
          userPixName || 'BillSplitter User',
          'Brasilia', 
          total
      );
      
      setPixCode(payload);
      setPixStep('display');
  };

  const copyPixToClipboard = () => {
    navigator.clipboard.writeText(pixCode);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 2000);
  };

  // --- PDF GENERATION LOGIC ---

  // Returns the Data URL of the image and the colors used for mapping
  const generateChartData = (): { imageUrl: string, colors: string[] } => {
    const canvas = document.createElement('canvas');
    const scale = 3; 
    const size = 300;
    canvas.width = size * scale;
    canvas.height = size * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { imageUrl: '', colors: [] };

    ctx.scale(scale, scale);

    const radius = size / 2 - 20; // Slightly smaller to be less overwhelming
    const centerX = size / 2;
    const centerY = size / 2;
    const thickness = 50; // Thinner donut for a more "discreet" look
    
    const validData = personTotals.filter(p => p.amount > 0);
    const totalValue = validData.reduce((acc, curr) => acc + curr.amount, 0);
    
    // Pastel Palette (More discreet/professional)
    const colors = [
        '#86efac', // Light Green
        '#93c5fd', // Light Blue
        '#f9a8d4', // Light Pink
        '#fde047', // Light Yellow
        '#c4b5fd', // Light Purple
        '#5eead4', // Light Teal
        '#fdba74', // Light Orange
        '#d1d5db'  // Light Gray
    ];

    let startAngle = -0.5 * Math.PI; 

    // Draw Background Ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.lineWidth = thickness;
    ctx.strokeStyle = '#f3f4f6';
    ctx.stroke();

    validData.forEach((p, index) => {
        if (totalValue === 0) return;
        const sliceAngle = (p.amount / totalValue) * 2 * Math.PI;
        const color = colors[index % colors.length];
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
        ctx.lineWidth = thickness;
        ctx.strokeStyle = color;
        ctx.stroke();

        startAngle += sliceAngle;
    });

    return {
        imageUrl: canvas.toDataURL('image/png'),
        colors: colors
    };
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // --- STYLES & COLORS ---
    const primaryColor = [19, 236, 91] as [number, number, number]; // #13ec5b
    const darkColor = [20, 30, 25];
    const grayColor = [100, 100, 100];

    // --- 1. HEADER ---
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 15, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...darkColor);
    doc.text('BillSplitter', 14, 30);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...grayColor);
    doc.text('Relatório de Despesas', 14, 36);

    doc.setFontSize(10);
    const dateText = `Data: ${billDate}`;
    const estText = establishmentName.length > 35 ? establishmentName.substring(0, 35) + '...' : establishmentName;
    
    doc.text(dateText, pageWidth - 14, 30, { align: 'right' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkColor);
    doc.text(estText.toUpperCase(), pageWidth - 14, 36, { align: 'right' });

    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.5);
    doc.line(14, 42, pageWidth - 14, 42);

    let yPos = 55;

    // --- 2. FINANCIAL SUMMARY ---
    doc.setFillColor(250, 252, 250); 
    doc.roundedRect(14, yPos, pageWidth - 28, 25, 3, 3, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(...grayColor);
    doc.text('VALOR TOTAL', 20, yPos + 8);
    
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(`R$ ${total.toFixed(2)}`, 20, yPos + 19);

    doc.setFontSize(10); // Slightly larger
    doc.setTextColor(...grayColor);
    doc.setFont('helvetica', 'normal');
    doc.text(`Subtotal: R$ ${calculatedSubtotal.toFixed(2)}`, pageWidth - 20, yPos + 8, { align: 'right' });
    doc.text(`Taxas/Serviço: R$ ${(taxAmount + tipAmount).toFixed(2)}`, pageWidth - 20, yPos + 14, { align: 'right' });

    yPos += 35;

    // --- 3. CHART & LEGEND SECTION (More Readable/Discreet) ---
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkColor);
    doc.text('Distribuição de Custos', 14, yPos);
    
    yPos += 5;
    
    const { imageUrl, colors } = generateChartData();
    const validParticipants = personTotals.filter(p => p.amount > 0);

    if (validParticipants.length > 0 && imageUrl) {
        // Chart Image (Smaller for discretion)
        doc.addImage(imageUrl, 'PNG', 14, yPos, 50, 50);

        let legendY = yPos + 5;
        const legendX = 80; // More spacing

        validParticipants.forEach((p, i) => {
            const colorHex = colors[i % colors.length];
            const percent = total > 0 ? ((p.amount / total) * 100).toFixed(1) : '0';
            
            doc.setFillColor(colorHex);
            doc.rect(legendX, legendY - 3, 4, 4, 'F');

            doc.setFontSize(11); // Larger font for readability
            doc.setTextColor(30, 30, 30);
            doc.setFont('helvetica', 'bold');
            doc.text(p.name, legendX + 7, legendY);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...grayColor);
            doc.text(`R$ ${p.amount.toFixed(2)} (${percent}%)`, legendX + 70, legendY);

            doc.setDrawColor(245, 245, 245);
            doc.line(legendX, legendY + 4, pageWidth - 14, legendY + 4);

            legendY += 10; // More vertical spacing
        });

        const legendHeight = validParticipants.length * 10;
        yPos = Math.max(yPos + 55, yPos + legendHeight + 20);

    } else {
        yPos += 10;
        doc.setFontSize(10);
        doc.setTextColor(...grayColor);
        doc.text('Nenhum dado para exibir no gráfico.', 14, yPos);
        yPos += 20;
    }

    // --- 4. DETAILED ITEMS TABLE (More Readable) ---
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkColor);
    doc.text('Detalhamento dos Itens', 14, yPos);
    
    yPos += 5;

    const tableData = items.map(item => {
        const assignedNames = participants
            .filter(p => (item.assignments[p.id] || 0) > 0)
            .map(p => p.name.split(' ')[0])
            .join(', ');
        
        return [
            item.name,
            item.quantity.toString(),
            `R$ ${item.price.toFixed(2)}`,
            assignedNames || '-'
        ];
    });

    autoTable(doc, {
        startY: yPos,
        head: [['Item', 'Qtd', 'Valor', 'Consumido por']],
        body: tableData,
        theme: 'plain', 
        styles: {
            font: 'helvetica',
            fontSize: 10, // Larger text
            cellPadding: 4, // More breathing room
            textColor: [50, 50, 50],
            lineColor: [230, 230, 230],
            lineWidth: 0.1,
        },
        headStyles: {
            fillColor: [240, 240, 240], 
            textColor: [20, 20, 20],
            fontStyle: 'bold',
            halign: 'left'
        },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { halign: 'center', cellWidth: 15 },
            2: { halign: 'right', cellWidth: 35, fontStyle: 'bold' },
            3: { cellWidth: 60, textColor: [100, 100, 100] }
        },
        rowPageBreak: 'avoid'
    });

    // --- 5. FOOTER ---
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(230, 230, 230);
        doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Gerado em ${new Date().toLocaleDateString()}`, 14, pageHeight - 10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text('BillSplitter', pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
    }

    const safeName = establishmentName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`BillSplitter_${safeName}.pdf`);
  };

  const steps = [
    { 
        title: "Confira os Itens",
        desc: "Verifique se os preços e nomes estão corretos. Você pode editar tocando neles.",
        targetId: "items-section"
    },
    { 
        title: "Adicione Pessoas",
        desc: "Clique no botão '+' para adicionar todos os amigos que vão dividir a conta.",
        targetId: "participants-section"
    },
    { 
        title: "Distribua a Conta",
        desc: "Toque na foto da pessoa ao lado de cada item para dizer que ela consumiu aquilo.",
        targetId: "items-section" // Re-focus on items for assignment
    },
    {
        title: "Finalize",
        desc: "Role até o final para salvar, gerar Pix ou baixar o PDF.",
        targetId: "summary-section"
    }
  ];

  const handleNextTutorial = () => {
    if (tutorialStep < steps.length - 1) {
        setTutorialStep(prev => prev + 1);
    } else {
        setShowTutorial(false);
        setTutorialStep(0);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 flex flex-col gap-6 relative">
      
      {/* --- TUTORIAL OVERLAY --- */}
      {showTutorial && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
             <div className="bg-surface-dark border border-primary rounded-2xl max-w-sm w-full p-6 shadow-2xl relative">
                 <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-primary text-background-dark px-4 py-1 rounded-full font-bold text-sm shadow-[0_0_15px_rgba(19,236,91,0.5)]">
                    Passo {tutorialStep + 1} de {steps.length}
                 </div>
                 
                 <h3 className="text-xl font-bold text-white mb-2 text-center">{steps[tutorialStep].title}</h3>
                 <p className="text-gray-300 text-center mb-6">{steps[tutorialStep].desc}</p>
                 
                 {/* Visual Hint Icon */}
                 <div className="flex justify-center mb-6">
                    {tutorialStep === 0 && <PenLine className="size-12 text-primary animate-bounce" />}
                    {tutorialStep === 1 && <UserPlus className="size-12 text-primary animate-bounce" />}
                    {tutorialStep === 2 && <MousePointerClick className="size-12 text-primary animate-bounce" />}
                    {tutorialStep === 3 && <CheckCircle className="size-12 text-primary animate-bounce" />}
                 </div>

                 <div className="flex gap-3">
                     <Button 
                        variant="secondary" 
                        fullWidth 
                        onClick={() => setShowTutorial(false)}
                     >
                        Pular
                     </Button>
                     <Button 
                        fullWidth 
                        onClick={handleNextTutorial}
                     >
                        {tutorialStep === steps.length - 1 ? 'Entendi!' : 'Próximo'}
                     </Button>
                 </div>
             </div>
        </div>
      )}

      {/* Pix Modal */}
      {showPixModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
           <div className="bg-surface-dark border border-border-dark rounded-2xl p-6 max-w-sm w-full shadow-2xl relative animate-in fade-in zoom-in duration-200">
               <button 
                  onClick={() => setShowPixModal(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white"
               >
                  <X className="size-6" />
               </button>
               
               {pixStep === 'input' ? (
                   <div className="text-center space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-white">Gerar Cobrança Pix</h3>
                            <p className="text-gray-400 text-sm">Insira sua chave Pix para gerar o QR Code com o valor total.</p>
                        </div>

                        <div className="space-y-4 text-left">
                             <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Chave Pix</label>
                                <input 
                                    type="text"
                                    value={userPixKey}
                                    onChange={(e) => setUserPixKey(e.target.value)}
                                    className="w-full bg-background-dark border border-border-dark rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    placeholder="CPF, Email, Celular ou Aleatória"
                                />
                             </div>
                             
                             <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Nome do Beneficiário</label>
                                <input 
                                    type="text"
                                    value={userPixName}
                                    onChange={(e) => setUserPixName(e.target.value)}
                                    className="w-full bg-background-dark border border-border-dark rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    placeholder="Seu Nome Completo"
                                />
                             </div>
                        </div>

                        <Button 
                            onClick={confirmPixGeneration} 
                            fullWidth
                            disabled={!userPixKey}
                            icon={<QrCode className="size-5" />}
                        >
                            Gerar QR Code
                        </Button>
                   </div>
               ) : (
                   <div className="text-center space-y-6">
                       <div className="space-y-2">
                           <h3 className="text-xl font-bold text-white">Pagamento via Pix</h3>
                           <p className="text-gray-400 text-sm">Escaneie o QR Code ou copie o código.</p>
                       </div>

                       <div className="bg-white p-4 rounded-xl mx-auto w-fit relative">
                           <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixCode)}`} 
                              alt="Pix QR Code" 
                              className="size-48"
                           />
                           <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="bg-white p-1 rounded-full">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo%E2%80%94pix_powered_by_Banco_Central_%28Brazil%2C_2020%29.svg" className="w-8 h-8" alt="Pix Logo" />
                                </div>
                           </div>
                       </div>

                       <div className="space-y-3">
                           <div className="bg-background-dark p-3 rounded-lg border border-border-dark">
                                <p className="text-gray-400 text-xs uppercase font-bold mb-1">Valor Total</p>
                                <p className="text-white font-bold text-xl">R$ {total.toFixed(2)}</p>
                                <p className="text-gray-500 text-xs mt-1">Destino: {userPixName}</p>
                           </div>
                           
                           <button 
                              onClick={copyPixToClipboard}
                              className={`w-full py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${pixCopied ? 'bg-green-500 text-white' : 'bg-primary text-background-dark hover:bg-primary-hover'}`}
                           >
                              {pixCopied ? (
                                  <>
                                    <Check className="size-5" />
                                    Copiado!
                                  </>
                              ) : (
                                  <>
                                    <Copy className="size-5" />
                                    Copiar Código Pix
                                  </>
                              )}
                           </button>

                           <button 
                              onClick={() => setPixStep('input')}
                              className="text-sm text-gray-500 hover:text-white underline decoration-gray-600 underline-offset-4"
                           >
                              Editar Chave Pix
                           </button>
                       </div>
                   </div>
               )}
           </div>
        </div>
      )}

      {/* Mobile Receipt Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-[100] bg-background-dark flex flex-col animate-in fade-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border-dark bg-surface-dark">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Receipt className="size-5" /> Recibo
                </h3>
                <button 
                    onClick={() => setShowReceiptModal(false)}
                    className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
                >
                    <X className="size-6" />
                </button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/50">
                {receiptImage ? (
                    <img src={receiptImage} alt="Receipt" className="max-w-full h-auto object-contain rounded-lg shadow-2xl" />
                ) : (
                    <div className="text-center text-gray-500 space-y-2">
                        <Receipt className="size-12 mx-auto opacity-50" />
                        <p>Nenhuma imagem disponível</p>
                    </div>
                )}
            </div>
            <div className="p-4 border-t border-border-dark bg-surface-dark">
                <Button fullWidth onClick={() => setShowReceiptModal(false)}>
                    Voltar para Edição
                </Button>
            </div>
        </div>
      )}

      <header className="flex flex-col gap-6 pb-6 border-b border-border-dark">
         <div className="flex items-start justify-between gap-4">
             <div className="flex items-center gap-4">
                 <button 
                    onClick={() => navigate(-1)} 
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    title="Voltar"
                 >
                     <ArrowLeft className="size-5" />
                 </button>
                 
                 {/* Editable Title */}
                 <div className="space-y-1">
                    <div className="group flex items-center gap-2">
                        <input 
                            type="text"
                            value={establishmentName}
                            onChange={(e) => setEstablishmentName(e.target.value)}
                            className="bg-transparent text-2xl font-bold text-white outline-none border-b-2 border-transparent focus:border-primary hover:border-gray-600 transition-all w-full md:w-auto max-w-[300px]"
                            placeholder="Nome do Local"
                        />
                        <PenLine className="size-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-gray-400 text-sm flex items-center gap-2">
                        <input 
                             type="text"
                             value={billDate}
                             onChange={(e) => setBillDate(e.target.value)}
                             className="bg-transparent outline-none w-24 hover:text-white transition-colors"
                        />
                    </div>
                 </div>
             </div>

             <div className="flex items-center gap-3">
                 <button 
                    onClick={() => setShowTutorial(true)}
                    className="h-10 w-10 md:w-auto md:px-4 rounded-lg bg-primary/20 text-primary font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/30 transition-colors border border-primary/20"
                    title="Ajuda e Passo a Passo"
                >
                    <HelpCircle className="size-5" />
                    <span className="hidden md:inline">Como Usar</span>
                </button>
                <button 
                    onClick={() => setShowReceiptModal(true)}
                    className="h-10 px-4 rounded-lg bg-white/10 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/20 transition-colors border border-white/5"
                    title="Ver Nota Original"
                >
                    <Eye className="size-4" />
                    <span className="hidden sm:inline">Ver Nota</span>
                </button>
             </div>
         </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Receipt Image (Desktop only) */}
        <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24 bg-surface-dark rounded-xl p-4 border border-border-dark">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Receipt className="size-5 text-gray-400" />
                    Recibo Digitalizado
                </h3>
                <div 
                    className="aspect-[3/4] bg-black rounded-lg overflow-hidden border border-border-dark relative cursor-pointer group"
                    onClick={() => setShowReceiptModal(true)}
                >
                    {receiptImage ? (
                        <>
                            <img src={receiptImage} alt="Receipt" className="w-full h-full object-contain transition-transform group-hover:scale-105" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <span className="text-white font-bold flex items-center gap-2"><Eye className="size-5"/> Expandir</span>
                            </div>
                        </>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                            Sem imagem disponível
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Middle Column: Items List */}
        <div className="lg:col-span-2 space-y-8">
            {/* Participants List */}
            <div id="participants-section" className={`bg-surface-dark p-6 rounded-xl border transition-colors space-y-4 ${showTutorial && tutorialStep === 1 ? 'border-primary shadow-[0_0_20px_rgba(19,236,91,0.2)]' : 'border-border-dark'}`}>
                 <h2 className="text-lg font-bold text-white">Participantes</h2>
                 <div className="flex items-center gap-3 flex-wrap">
                    {participants.map(p => (
                        <div key={p.id} className="group flex items-center gap-2 bg-background-dark pl-2 pr-3 py-1.5 rounded-full border border-border-dark relative hover:border-primary/50 transition-colors">
                            {/* Unified Avatar Rendering: Everyone gets an image now */}
                            <img src={p.avatar} alt={p.name} className="size-6 rounded-full bg-white/10 object-cover" />
                            
                            <span className="text-sm font-medium text-gray-200">{p.name}</span>
                            {p.isCurrentUser && <span className="text-[10px] font-bold bg-primary/20 text-primary px-1.5 rounded ml-1">EU</span>}
                            
                            {!p.isCurrentUser && (
                                <button 
                                    onClick={() => removeParticipant(p.id)}
                                    className="ml-1 p-0.5 rounded-full text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-60 group-hover:opacity-100"
                                    title="Remover participante"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>
                    ))}
                    
                    {isAddingParticipant ? (
                        <div className="flex items-center gap-1 bg-background-dark rounded-full border border-primary/50 pl-3 pr-1 py-1 animate-fade-in">
                            <input 
                                ref={newParticipantInputRef}
                                type="text"
                                value={newParticipantName}
                                onChange={(e) => setNewParticipantName(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Nome..."
                                className="bg-transparent border-none outline-none text-sm text-white w-24 placeholder:text-gray-500"
                            />
                            <button 
                                onClick={confirmAddParticipant}
                                className="p-1 rounded-full bg-primary text-background-dark hover:bg-primary-hover"
                            >
                                <Check className="size-3.5 stroke-[3]" />
                            </button>
                             <button 
                                onClick={() => setIsAddingParticipant(false)}
                                className="p-1 rounded-full bg-white/10 text-gray-400 hover:text-white hover:bg-white/20"
                            >
                                <X className="size-3.5 stroke-[3]" />
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setIsAddingParticipant(true)}
                            className="size-9 rounded-full border border-dashed border-gray-500 flex items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition-colors"
                            title="Adicionar Participante"
                        >
                            <Plus className="size-5" />
                        </button>
                    )}
                 </div>
            </div>

            {/* Items Section */}
            <div id="items-section" className={`space-y-4 rounded-xl p-2 transition-all ${showTutorial && (tutorialStep === 0 || tutorialStep === 2) ? 'ring-2 ring-primary bg-white/5' : ''}`}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2 px-2">
                    <h2 className="text-xl font-bold text-white">Itens</h2>
                    <div className="flex gap-4">
                         <button 
                            className="text-sm text-primary hover:text-primary-hover hover:underline transition-colors flex items-center gap-1"
                            onClick={assignAllToMe}
                        >
                            <UserPlus className="size-4" /> Atribuir Todos a Mim
                        </button>
                        <button 
                            className="text-sm text-primary hover:text-primary-hover hover:underline transition-colors flex items-center gap-1"
                            onClick={() => {
                                const newItem: BillItem = {
                                    id: `manual-${Date.now()}`,
                                    name: 'Novo Item',
                                    price: 0,
                                    quantity: 1,
                                    assignments: {}
                                };
                                setItems([...items, newItem]);
                            }}
                        >
                            <Plus className="size-4" /> Adicionar Item
                        </button>
                    </div>
                </div>

                {/* DESKTOP TABLE VIEW (Hidden on Mobile) */}
                <div className="hidden md:block bg-surface-dark border border-border-dark rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-background-dark text-left">
                            <tr>
                                <th className="px-4 py-3 text-sm font-medium text-gray-400 w-[35%]">Item</th>
                                <th className="px-4 py-3 text-sm font-medium text-gray-400 w-[10%] text-center">Qtd</th>
                                <th className="px-4 py-3 text-sm font-medium text-gray-400 w-[15%]">Total (R$)</th>
                                <th className="px-4 py-3 text-sm font-medium text-primary w-[35%]">Atribuir</th>
                                <th className="px-4 py-3 text-sm font-medium text-gray-400 w-[5%]"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-dark">
                            {items.map((item) => (
                                <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-4 py-3">
                                        <input 
                                            value={item.name}
                                            onChange={(e) => setItems(items.map(i => i.id === item.id ? {...i, name: e.target.value} : i))}
                                            className="bg-transparent text-white w-full outline-none focus:text-primary font-medium placeholder-gray-600"
                                            placeholder="Nome do item"
                                        />
                                        {item.quantity > 1 && item.price > 0 && (
                                            <div className="text-[10px] text-gray-500 mt-0.5">
                                                R$ {(item.price / item.quantity).toFixed(2)} / un
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <input 
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 1;
                                                setItems(items.map(i => i.id === item.id ? {...i, quantity: val} : i));
                                            }}
                                            className="bg-transparent w-12 outline-none focus:text-primary text-center text-gray-300 border-b border-transparent focus:border-primary"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center text-gray-300">
                                            <span className="text-xs mr-1">R$</span>
                                            <input 
                                                type="number"
                                                value={item.price}
                                                onChange={(e) => setItems(items.map(i => i.id === item.id ? {...i, price: parseFloat(e.target.value) || 0} : i))}
                                                className="bg-transparent w-20 outline-none focus:text-primary font-medium"
                                            />
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1 flex-wrap">
                                            {participants.map(p => {
                                                const count = item.assignments[p.id] || 0;
                                                return (
                                                    <button 
                                                        key={p.id}
                                                        onClick={() => updateAssignment(item.id, p.id, 1)}
                                                        onContextMenu={(e) => {
                                                            e.preventDefault();
                                                            updateAssignment(item.id, p.id, -1);
                                                        }}
                                                        title={`${p.name}: ${count} itens`}
                                                        className={`
                                                            relative size-8 rounded-full border-2 transition-all flex items-center justify-center overflow-hidden
                                                            ${count > 0 ? 'border-primary ring-2 ring-primary/20 z-10' : 'border-transparent opacity-40 hover:opacity-100 hover:scale-110 grayscale'}
                                                        `}
                                                    >
                                                        {/* Render Avatar for Everyone */}
                                                        <img src={p.avatar} alt={p.name} className="w-full h-full object-cover bg-white/10" />
                                                        
                                                        {p.isCurrentUser && (
                                                            <div className="absolute top-0 right-0 left-0 bottom-0 border-2 border-primary rounded-full opacity-20 pointer-events-none"></div>
                                                        )}

                                                        {count > 0 && (
                                                            <div className={`absolute -bottom-1 -right-1 bg-primary text-background-dark rounded-full flex items-center justify-center ${count > 9 ? 'w-5 h-4' : 'size-4'}`}>
                                                                <span className="text-[9px] font-bold leading-none">
                                                                    {item.quantity === 1 ? <Check className="size-2.5 stroke-[4]" /> : `x${count}`}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button 
                                            onClick={() => deleteItem(item.id)}
                                            className="text-gray-600 hover:text-red-500 transition-colors p-1 rounded hover:bg-white/5 opacity-0 group-hover:opacity-100"
                                            title="Excluir item"
                                        >
                                            <Trash2 className="size-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* MOBILE CARD VIEW (Visible on Mobile) */}
                <div className="md:hidden space-y-4">
                    {items.map((item) => {
                        const totalAssigned = (Object.values(item.assignments) as number[]).reduce((a, b) => a + b, 0);
                        // FIX: If quantity is 1, any assignment >= 1 counts as fully assigned (shared item)
                        // If quantity > 1, total assigned must match exactly
                        const isFullyAssigned = item.quantity === 1 
                            ? totalAssigned >= 1 
                            : totalAssigned === item.quantity;
                        
                        return (
                        <div 
                            key={item.id} 
                            className={`
                                p-4 rounded-xl border transition-all duration-300 space-y-4
                                ${isFullyAssigned 
                                    ? 'bg-primary/5 border-primary shadow-[0_0_15px_-3px_rgba(19,236,91,0.4)] scale-[1.01]' 
                                    : 'bg-surface-dark border-border-dark'
                                }
                            `}
                        >
                            {/* Top: Name & Delete */}
                            <div className="flex items-start gap-3">
                                <input 
                                    value={item.name}
                                    onChange={(e) => setItems(items.map(i => i.id === item.id ? {...i, name: e.target.value} : i))}
                                    className="flex-1 bg-transparent text-lg font-medium text-white outline-none placeholder-gray-600 border-b border-transparent focus:border-primary transition-colors pb-1"
                                    placeholder="Nome do item"
                                />
                                {isFullyAssigned && (
                                    <div className="text-primary animate-in fade-in zoom-in duration-300">
                                        <CheckCircle className="size-5 fill-primary/20" />
                                    </div>
                                )}
                                <button 
                                    onClick={() => deleteItem(item.id)}
                                    className="text-gray-500 hover:text-red-500 p-2 -mr-2"
                                >
                                    <Trash2 className="size-5" />
                                </button>
                            </div>

                            {/* Middle: Specs */}
                            <div className={`flex items-center gap-4 p-3 rounded-lg border ${isFullyAssigned ? 'bg-background-dark/50 border-primary/20' : 'bg-background-dark border-white/5'}`}>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase">Qtd</span>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => {
                                                const val = Math.max(1, item.quantity - 1);
                                                setItems(items.map(i => i.id === item.id ? {...i, quantity: val} : i));
                                            }}
                                            className="size-6 rounded bg-white/10 flex items-center justify-center text-white active:scale-95"
                                        >
                                            <Minus className="size-3" />
                                        </button>
                                        <span className="font-medium w-4 text-center">{item.quantity}</span>
                                        <button 
                                            onClick={() => {
                                                setItems(items.map(i => i.id === item.id ? {...i, quantity: item.quantity + 1} : i));
                                            }}
                                            className="size-6 rounded bg-white/10 flex items-center justify-center text-white active:scale-95"
                                        >
                                            <Plus className="size-3" />
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="w-px h-8 bg-white/10 mx-2"></div>

                                <div className="flex-1 flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase">Preço Total</span>
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs text-gray-500">R$</span>
                                        <input 
                                            type="number"
                                            value={item.price}
                                            onChange={(e) => setItems(items.map(i => i.id === item.id ? {...i, price: parseFloat(e.target.value) || 0} : i))}
                                            className="bg-transparent text-white font-bold text-lg outline-none w-full"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Bottom: Assignments */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-gray-400 uppercase">Quem consumiu?</span>
                                    <span className={`text-xs font-bold ${isFullyAssigned ? 'text-primary' : 'text-gray-500'}`}>
                                        {totalAssigned}/{item.quantity}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                    {participants.map(p => {
                                        const count = item.assignments[p.id] || 0;
                                        return (
                                            <button 
                                                key={p.id}
                                                onClick={() => updateAssignment(item.id, p.id, 1)}
                                                className={`
                                                    relative flex-shrink-0 size-12 rounded-full border-2 transition-all flex items-center justify-center overflow-hidden
                                                    ${count > 0 ? 'border-primary ring-2 ring-primary/20' : 'border-transparent bg-white/5 grayscale opacity-60'}
                                                `}
                                            >
                                                <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                                                
                                                {count > 0 && (
                                                    <div className="absolute -bottom-1 -right-1 bg-primary text-background-dark rounded-full size-5 flex items-center justify-center shadow-sm z-10">
                                                        <span className="text-[10px] font-bold">
                                                            {item.quantity === 1 ? <Check className="size-3 stroke-[3]" /> : count}
                                                        </span>
                                                    </div>
                                                )}
                                                <span className="absolute -bottom-5 text-[10px] text-gray-400 w-full text-center truncate px-1">{p.name.split(' ')[0]}</span>
                                            </button>
                                        );
                                    })}
                                    <button 
                                        onClick={() => setIsAddingParticipant(true)}
                                        className="flex-shrink-0 size-12 rounded-full border border-dashed border-gray-600 flex items-center justify-center text-gray-500 hover:border-primary hover:text-primary"
                                    >
                                        <Plus className="size-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )})}
                    {/* Add Item Button Mobile */}
                    <button 
                        className="w-full py-4 rounded-xl border border-dashed border-gray-600 text-gray-400 font-medium flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors"
                        onClick={() => {
                            const newItem: BillItem = {
                                id: `manual-${Date.now()}`,
                                    name: 'Novo Item',
                                    price: 0,
                                    quantity: 1,
                                    assignments: {}
                            };
                            setItems([...items, newItem]);
                        }}
                    >
                        <Plus className="size-5" /> Adicionar Item
                    </button>
                </div>
            </div>

            {/* Summary Section */}
            <div id="summary-section" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Payment Details */}
                 <div className="bg-surface-dark p-6 rounded-xl border border-border-dark space-y-4 h-fit">
                    <h3 className="font-bold text-white">Detalhes do Pagamento</h3>
                    
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-gray-400 text-sm">
                            <span>Subtotal</span>
                            <div className="flex items-center w-28 justify-end border-b border-transparent hover:border-gray-500 focus-within:border-primary transition-colors">
                                <span className="text-gray-500 mr-1">R$</span>
                                <input 
                                    type="number"
                                    value={manualSubtotal !== '' ? manualSubtotal : calculatedSubtotal.toFixed(2)}
                                    onChange={(e) => setManualSubtotal(e.target.value)}
                                    onBlur={handleSubtotalBlur}
                                    className="bg-transparent text-right w-full text-white font-medium outline-none"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        
                        <div className="flex justify-between items-center text-gray-400 text-sm">
                            <span>Taxas Extras</span>
                            <div className="flex items-center bg-background-dark rounded px-2 border border-border-dark w-24">
                                <span className="text-gray-500">R$</span>
                                <input 
                                    type="number" 
                                    value={taxAmount} 
                                    onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
                                    className="bg-transparent text-right w-full text-white outline-none py-1"
                                />
                            </div>
                        </div>

                        <div className="space-y-2 pt-2">
                            <span className="text-sm text-gray-400">Serviço / Gorjeta</span>
                            <div className="flex gap-2">
                                {['0', '10', '15'].map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => { setTipType(t as any); setCustomTip(''); }}
                                        className={`flex-1 py-1.5 rounded text-xs font-bold transition-colors ${tipType === t ? 'bg-primary text-background-dark' : 'bg-background-dark border border-border-dark hover:bg-white/5'}`}
                                    >
                                        {t}%
                                    </button>
                                ))}
                                <input 
                                    placeholder="Outro"
                                    value={customTip}
                                    onChange={(e) => { setCustomTip(e.target.value); setTipType('custom'); }}
                                    className={`w-20 px-2 text-xs rounded bg-background-dark border ${tipType === 'custom' ? 'border-primary text-primary' : 'border-border-dark text-white'} outline-none text-center`}
                                />
                            </div>
                        </div>

                        <div className="border-t border-border-dark my-4 pt-4">
                            <div className="flex justify-between items-end">
                                <span className="text-xl font-bold text-white">Total</span>
                                <span className="text-2xl font-black text-primary">R$ {total.toFixed(2)}</span>
                            </div>
                            
                            {hasDiscrepancy && (
                                <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-3 animate-pulse">
                                    <AlertTriangle className="size-5 text-yellow-500 shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-yellow-500">
                                            {remainder > 0 ? 'Faltam' : 'Passou'} R$ {Math.abs(remainder).toFixed(2)}
                                        </p>
                                        <p className="text-xs text-yellow-500/70">
                                            {remainder > 0 ? 'Verifique as quantidades atribuídas.' : 'Total distribuído excede a conta.'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                 </div>

                 {/* Per Person Breakdown */}
                 <div className="bg-surface-dark p-6 rounded-xl border border-border-dark space-y-4 h-fit">
                    <h3 className="font-bold text-white">Total por Pessoa</h3>
                    <div className="space-y-3">
                        {personTotals.map(p => {
                             const percentage = total > 0 ? ((p.amount / total) * 100).toFixed(1) : '0';
                             return (
                                <div key={p.id} className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <img src={p.avatar} className="size-8 rounded-full bg-white/10 object-cover" alt={p.name} />
                                            {p.isCurrentUser && (
                                                <div className="absolute -bottom-1 -right-1 bg-primary text-[8px] font-bold text-background-dark px-1 rounded">EU</div>
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-gray-300 text-sm font-medium">{p.name}</span>
                                            <span className="text-xs text-gray-500">{percentage}% do total</span>
                                        </div>
                                    </div>
                                    <span className="font-bold text-white">R$ {p.amount.toFixed(2)}</span>
                                </div>
                             );
                        })}
                    </div>

                    <div className="pt-4 space-y-3 border-t border-border-dark mt-4">
                        <Button 
                            fullWidth 
                            icon={<QrCode className="size-5" />}
                            onClick={handleGeneratePix}
                        >
                            Gerar PIX/QR Code
                        </Button>
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <Button 
                                    fullWidth 
                                    variant="secondary" 
                                    icon={<Share2 className="size-5" />}
                                    onClick={handleShareWhatsApp}
                                >
                                    WhatsApp
                                </Button>
                            </div>
                            <div className="flex-1">
                                <Button 
                                    fullWidth 
                                    variant="secondary" 
                                    icon={<FileText className="size-5" />}
                                    onClick={handleDownloadPDF}
                                    title="Baixar Relatório PDF"
                                >
                                    PDF
                                </Button>
                            </div>
                        </div>
                        
                        {/* Prominent Save Button at the Bottom for All Screens */}
                         <Button 
                            fullWidth 
                            icon={<Save className="size-5" />}
                            onClick={handleSaveHistory}
                            className="mt-2"
                        >
                            Salvar Conta
                        </Button>
                    </div>
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
};
