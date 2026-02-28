import React, { useState, useEffect } from 'react';
import { getStudents, getWalletTransactions, getStudentWallet, addWalletTransaction, createNotification } from '../../services/storage';
import { Student, WalletTransaction } from '../../types';
import { Search, Wallet, Plus, Minus, Printer, Loader2, ArrowUpRight, ArrowDownRight, Coffee, QrCode } from 'lucide-react';

const CanteenManager: React.FC = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);

    // Global Transactions
    const [allTransactions, setAllTransactions] = useState<WalletTransaction[]>([]);

    const [loading, setLoading] = useState(false);

    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [actionType, setActionType] = useState<'recharge' | 'purchase'>('recharge');
    const [showActionModal, setShowActionModal] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const stds = await getStudents();
        setStudents(stds);
        const allTxs = await getWalletTransactions();
        setAllTransactions(allTxs);
        setLoading(false);
    };

    const handleSelectStudent = async (student: Student) => {
        setSelectedStudent(student);
        const balance = await getStudentWallet(student.studentId);
        setWalletBalance(balance);
        const txs = await getWalletTransactions(student.studentId);
        setTransactions(txs);
        setSearchQuery('');
    };

    const handleTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent || !amount || isNaN(Number(amount)) || Number(amount) <= 0) return;

        const numAmount = Number(amount);

        if (actionType === 'purchase' && walletBalance < numAmount) {
            alert('الرصيد غير كافٍ لهذه العملية.');
            return;
        }

        const tx: WalletTransaction = {
            id: crypto.randomUUID(),
            studentId: selectedStudent.studentId,
            type: actionType,
            amount: numAmount,
            description: actionType === 'recharge' ? 'شحن رصيد (نقدي)' : description || 'شراء من المقصف',
            timestamp: new Date().toISOString(),
            createdBy: 'موظف المقصف'
        };

        try {
            await addWalletTransaction(tx);
            if (actionType === 'recharge') {
                await createNotification(selectedStudent.studentId, 'success', 'شحن المحفظة (إيصال)', `تم بنجاح شحن محفظة المقصف بمبلغ ${numAmount} ريال. الرصيد الجديد: ${walletBalance + numAmount} ريال`);
            } else {
                await createNotification(selectedStudent.studentId, 'info', 'عملية شراء (المقصف)', `تم خصم ${numAmount} ريال من المحفظة لمشتريات المقصف. الرصيد المتبقي: ${walletBalance - numAmount} ريال`);
            }
            await handleSelectStudent(selectedStudent); // Refresh
            setShowActionModal(false);
            setAmount('');
            setDescription('');
            loadData(); // Update globals
        } catch (error) {
            alert("حدث خطأ");
        }
    };

    const handlePrintDailyReport = () => {
        const printWindow = window.open('', '', 'width=800,height=800');
        if (!printWindow) return alert('يرجى السماح بالنوافذ المنبثقة');

        const today = new Date().toISOString().split('T')[0];
        const dailyTxs = allTransactions.filter(t => t.timestamp.startsWith(today));

        const totalRecharge = dailyTxs.filter(t => t.type === 'recharge').reduce((sum, t) => sum + t.amount, 0);
        const totalPurchase = dailyTxs.filter(t => t.type === 'purchase').reduce((sum, t) => sum + t.amount, 0);

        const html = `
      <html dir="rtl">
        <head>
          <title>تقرير المقصف اليومي</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #ea580c; padding-bottom: 20px; margin-bottom: 30px; }
            h1 { color: #9a3412; margin: 0; font-size: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 10px; text-align: right; }
            th { background-color: #f8fafc; font-weight: bold; }
            .summary { display: flex; justify-content: space-around; font-size: 20px; font-weight: bold; margin: 30px 0; padding: 20px; background: #fff7ed; border-radius: 10px; }
            .footer { margin-top: 50px; display: flex; justify-content: space-between; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>تقرير المقصف المدرسي وتغذية البطاقات</h1>
            <p>التاريخ: ${new Date().toLocaleDateString('ar-SA')}</p>
          </div>
          
          <div class="summary">
            <div style="color: green">إجمالي الشحن (المقبوضات): ${totalRecharge} ريال</div>
            <div style="color: red">إجمالي المبيعات (المخصومات): ${totalPurchase} ريال</div>
          </div>

          <table>
            <thead>
                <tr>
                    <th>القيمة</th>
                    <th>نوع العملية</th>
                    <th>رقم/هوية الطالب</th>
                    <th>الوقت</th>
                </tr>
            </thead>
            <tbody>
                ${dailyTxs.map((t) => `
                    <tr>
                        <td style="color: ${t.type === 'recharge' ? 'green' : 'red'}; font-weight:bold;">
                            ${t.type === 'recharge' ? '+' : '-'}${t.amount} ر.س
                        </td>
                        <td>${t.type === 'recharge' ? 'شحن رصيد' : 'شراء'} - ${t.description}</td>
                        <td>${t.studentId}</td>
                        <td>${new Date(t.timestamp).toLocaleTimeString('ar-SA')}</td>
                    </tr>
                `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <div>موظف المقصف:<br>....................</div>
            <div>مدير المدرسة:<br>....................</div>
          </div>

          <script>
            window.onload = () => { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;
        printWindow.document.write(html);
        printWindow.document.close();
    };


    const filteredStudents = searchQuery.length >= 2
        ? students.filter(s => s.name.includes(searchQuery) || s.studentId.includes(searchQuery))
        : [];

    return (
        <div className="space-y-6 pb-12 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-600 to-amber-500 rounded-3xl p-8 border border-orange-400 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden text-white">
                <div className="absolute right-[-10%] top-[-50%] w-64 h-64 bg-yellow-400 rounded-full blur-3xl opacity-30 z-0"></div>
                <div className="relative z-10 flex-1">
                    <h1 className="text-3xl font-extrabold flex items-center gap-3 mb-2">
                        <Wallet className="bg-white/20 p-2 rounded-xl" size={48} />
                        المقصف الإلكتروني (المحفظة)
                    </h1>
                    <p className="text-orange-100 text-sm font-bold">إدارة شحن وتفريغ وحركات محافظ الطلاب الرقمية لعمليات المقصف.</p>
                </div>
                <button
                    onClick={handlePrintDailyReport}
                    className="relative z-10 bg-white/10 hover:bg-white/20 border border-white/30 text-white px-6 py-3 rounded-2xl font-bold shadow-sm flex items-center gap-2 transition-all w-full md:w-auto justify-center"
                >
                    <Printer size={20} /> طباعة التقرير اليومي
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Search & Student List */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4">
                        <div className="relative">
                            <input
                                autoFocus
                                type="text"
                                placeholder="ابحث برقم الهوية أو اسم الطالب..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-4 pr-12 text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                            />
                            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        </div>
                    </div>

                    {searchQuery.length >= 2 && (
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm max-h-96 overflow-y-auto custom-scrollbar p-2">
                            {filteredStudents.length === 0 ? (
                                <p className="text-center text-slate-500 py-4 text-sm font-bold">لم يتم العثور على طالب.</p>
                            ) : (
                                <div className="space-y-2">
                                    {filteredStudents.map(student => (
                                        <div
                                            key={student.id}
                                            onClick={() => handleSelectStudent(student)}
                                            className="p-3 bg-slate-50 hover:bg-orange-50 border border-slate-100 hover:border-orange-200 rounded-2xl cursor-pointer flex items-center justify-between transition-colors"
                                        >
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-sm">{student.name}</h4>
                                                <p className="text-[10px] text-slate-500">{student.studentId} | {student.grade}</p>
                                            </div>
                                            <QrCode className="text-slate-300" size={20} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Wallet Details & Actions */}
                <div className="lg:col-span-2 space-y-6">
                    {selectedStudent ? (
                        <>
                            {/* Balance Card */}
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-50 flex items-center justify-center rounded-bl-full shadow-inner opacity-50 z-0"></div>
                                <div className="relative z-10 flex items-center gap-4 w-full md:w-auto">
                                    <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-extrabold text-2xl shadow-lg">
                                        {selectedStudent.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-extrabold text-slate-900">{selectedStudent.name}</h2>
                                        <p className="text-slate-500 font-bold text-sm">{selectedStudent.grade} - {selectedStudent.className}</p>
                                    </div>
                                </div>
                                <div className="relative z-10 bg-slate-50 border border-slate-100 px-8 py-4 rounded-3xl text-center min-w-[200px]">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">الرصيد المتاح</p>
                                    <h3 className={`text-4xl font-extrabold ${walletBalance > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        {walletBalance}
                                        <span className="text-sm font-bold mr-1">ر.س</span>
                                    </h3>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => { setActionType('recharge'); setShowActionModal(true); }}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white p-4 rounded-2xl shadow-lg flex flex-col items-center justify-center gap-2 transition-transform active:scale-95 group"
                                >
                                    <div className="bg-white/20 p-3 rounded-full group-hover:scale-110 transition-transform"><Plus size={24} /></div>
                                    <span className="font-extrabold">شحن المحفظة (إيداع نقد)</span>
                                </button>
                                <button
                                    onClick={() => { setActionType('purchase'); setShowActionModal(true); }}
                                    className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-2xl shadow-lg flex flex-col items-center justify-center gap-2 transition-transform active:scale-95 group"
                                >
                                    <div className="bg-white/20 p-3 rounded-full group-hover:scale-110 transition-transform"><Coffee size={24} /></div>
                                    <span className="font-extrabold">شراء مقصف (خصم)</span>
                                </button>
                            </div>

                            {/* Transactions History */}
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 max-h-96 overflow-y-auto custom-scrollbar">
                                <h3 className="font-extrabold text-slate-800 border-b border-slate-100 pb-4 mb-4 text-sm">سجل العمليات الأخير</h3>
                                {transactions.length === 0 ? (
                                    <p className="text-slate-400 text-sm text-center py-4 font-bold">لا توجد عمليات مسجلة.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {transactions.map(tx => (
                                            <div key={tx.id} className="flex justify-between items-center p-3 border border-slate-50 bg-slate-50/50 hover:bg-slate-50 rounded-2xl">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-xl ${tx.type === 'recharge' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                                                        {tx.type === 'recharge' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-sm">{tx.description}</p>
                                                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{new Date(tx.timestamp).toLocaleString('ar-SA')}</p>
                                                    </div>
                                                </div>
                                                <div className={`font-extrabold ${tx.type === 'recharge' ? 'text-emerald-600' : 'text-slate-800'}`}>
                                                    {tx.type === 'recharge' ? '+' : '-'}{tx.amount} ر.س
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="bg-white rounded-3xl border border-dashed border-slate-200 h-full min-h-[500px] flex flex-col items-center justify-center text-slate-400">
                            <QrCode size={64} className="mb-4 text-slate-200" />
                            <p className="font-bold text-lg">ابحث عن الطالب واختره للبدء بالشحن والمبيعات</p>
                        </div>
                    )
                    }
                </div >
            </div >

            {/* Action Modal */}
            {
                showActionModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white rounded-3xl p-6 w-full max-w-sm relative shadow-2xl animate-fade-in-up">
                            <button onClick={() => setShowActionModal(false)} className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white/20 text-white p-2 rounded-full hover:bg-white/30"><Plus className="rotate-45" size={24} /></button>

                            <div className="text-center mb-6">
                                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3 shadow-inner ${actionType === 'recharge' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                                    {actionType === 'recharge' ? <ArrowUpRight size={32} /> : <Coffee size={32} />}
                                </div>
                                <h3 className="font-bold text-xl text-slate-900">{actionType === 'recharge' ? 'شحن المحفظة نقدًا' : 'خصم شراء من المقصف'}</h3>
                            </div>

                            <form onSubmit={handleTransaction} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 block mb-2">المبلغ (ر.س)</label>
                                    <input
                                        autoFocus
                                        required
                                        type="number"
                                        min="1"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        className={`w-full text-center text-2xl font-extrabold p-4 border rounded-2xl outline-none ${actionType === 'recharge' ? 'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-emerald-700' : 'focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-red-700'}`}
                                        placeholder="0"
                                    />
                                </div>

                                {actionType === 'purchase' && (
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 block mb-2">الصنف (اختياري)</label>
                                        <input
                                            type="text"
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                            className="w-full bg-slate-50 p-3 border border-slate-200 rounded-xl outline-none focus:border-red-400 font-bold text-sm"
                                            placeholder="عصير الساحة، فطور..."
                                        />
                                    </div>
                                )}

                                <div className="flex gap-2 pt-2">
                                    <button type="submit" className={`flex-1 text-white py-3.5 rounded-xl font-extrabold shadow-lg transition-colors ${actionType === 'recharge' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}>تأكيد {actionType === 'recharge' ? 'الشحن' : 'الخصم'}</button>
                                    <button type="button" onClick={() => setShowActionModal(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-3.5 rounded-xl font-bold">إلغاء</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default CanteenManager;
