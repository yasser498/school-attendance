import React, { useState, useEffect, useRef } from 'react';
import { getStudents, getWalletTransactions, getStudentWallet, addWalletTransaction, createNotification } from '../../services/storage';
import { Student, WalletTransaction } from '../../types';
import { Search, Wallet, Plus, Minus, Printer, Loader2, ArrowUpRight, ArrowDownRight, Coffee, QrCode, ScanLine, X, CheckCircle, AlertCircle, Camera, RefreshCw } from 'lucide-react';

declare var Html5Qrcode: any;

const CanteenManager: React.FC = () => {
    // --- Tabs & Flow State ---
    const [activeTab, setActiveTab] = useState<'purchase' | 'recharge' | 'inquiry'>('purchase');

    // --- Data State ---
    const [students, setStudents] = useState<Student[]>([]);
    const [allTransactions, setAllTransactions] = useState<WalletTransaction[]>([]);
    const [loading, setLoading] = useState(false);

    // --- Input State ---
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');

    // --- Scanner State ---
    const [isScanning, setIsScanning] = useState(false);
    const [scanLoading, setScanLoading] = useState(false);
    const [scanError, setScanError] = useState<string | null>(null);
    const scannerRef = useRef<any>(null);
    const isScannerRunning = useRef<boolean>(false);
    const isProcessingScan = useRef<boolean>(false);
    const scannerLock = useRef<boolean>(false);

    // --- Result State ---
    const [scanStatus, setScanStatus] = useState<'success' | 'error' | 'inquiry' | null>(null);
    const [scanMessage, setScanMessage] = useState<string | null>(null);
    const [processedStudent, setProcessedStudent] = useState<Student | null>(null);
    const [processedBalance, setProcessedBalance] = useState<number>(0);
    const [processedTxs, setProcessedTxs] = useState<WalletTransaction[]>([]);

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

    // --- Scanner Logic ---
    const stopScanner = async () => {
        if (scannerLock.current) return;
        scannerLock.current = true;
        try {
            if (scannerRef.current) {
                if (isScannerRunning.current) {
                    try { await scannerRef.current.stop(); } catch (e) { }
                }
                try { await scannerRef.current.clear(); } catch (e) { }
            }
        } catch (err) { }
        finally {
            isScannerRunning.current = false;
            scannerRef.current = null;
            scannerLock.current = false;
        }
    };

    const startScanner = async () => {
        if (scannerLock.current || isScannerRunning.current) return;
        scannerLock.current = true;
        setScanError(null);
        setIsScanning(true);

        try {
            if (scannerRef.current) {
                try { await scannerRef.current.stop(); } catch (e) { }
                try { await scannerRef.current.clear(); } catch (e) { }
                scannerRef.current = null;
            }

            await new Promise(r => setTimeout(r, 100)); // Delay for DOM
            if (!document.getElementById('canteen-reader')) {
                scannerLock.current = false;
                setIsScanning(false);
                return;
            }

            const html5QrCode = new Html5Qrcode("canteen-reader");
            scannerRef.current = html5QrCode;

            const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };

            await html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText: string) => {
                    if (!isProcessingScan.current) {
                        handleScan(decodedText);
                    }
                },
                () => { /* ignore frame errors */ }
            );

            isScannerRunning.current = true;
        } catch (err: any) {
            console.error(err);
            setScanError("تعذر تشغيل الكاميرا. يرجى التأكد من الصلاحيات.");
            isScannerRunning.current = false;
        } finally {
            scannerLock.current = false;
        }
    };

    const closeScanner = async () => {
        await stopScanner();
        setIsScanning(false);
    };

    const handleStartScan = () => {
        // Validate inputs before scanning
        if (activeTab === 'purchase' || activeTab === 'recharge') {
            if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
                alert('يرجى إدخال مبلغ صحيح أولاً.');
                return;
            }
        }
        startScanner();
    };

    const handleScan = async (decodedText: string) => {
        isProcessingScan.current = true;
        setScanLoading(true);
        await stopScanner();
        setIsScanning(false); // Hide scanner UI

        try {
            const studentId = decodedText;
            const student = students.find(s => s.studentId === studentId);

            if (!student) {
                setScanStatus('error');
                setScanMessage('الطالب غير مسجل في النظام.');
                return;
            }

            const currentBalance = await getStudentWallet(studentId);
            setProcessedStudent(student);

            if (activeTab === 'inquiry') {
                const txs = await getWalletTransactions(studentId);
                setProcessedBalance(currentBalance);
                setProcessedTxs(txs);
                setScanStatus('inquiry');
            }
            else if (activeTab === 'purchase') {
                const numAmount = Number(amount);
                if (currentBalance < numAmount) {
                    setScanStatus('error');
                    setScanMessage(`رصيد الطالب غير كافٍ. الرصيد الحالي: ${currentBalance} ريال.`);
                    setProcessedBalance(currentBalance);
                } else {
                    const tx: WalletTransaction = {
                        id: crypto.randomUUID(),
                        studentId: studentId,
                        type: 'purchase',
                        amount: numAmount,
                        description: description || 'شراء من المقصف',
                        timestamp: new Date().toISOString(),
                        createdBy: 'موظف المقصف'
                    };
                    await addWalletTransaction(tx);
                    const newBalance = currentBalance - numAmount;
                    setProcessedBalance(newBalance);
                    setScanStatus('success');
                    setScanMessage(`تم الخصم بنجاح بمبلغ ${numAmount} ريال. الرصيد المتبقي: ${newBalance} ريال`);
                    await createNotification(studentId, 'info', 'عملية شراء (المقصف)', `تم خصم ${numAmount} ريال من المحفظة لمشتريات المقصف. الرصيد المتبقي: ${newBalance} ريال`);
                    setAmount('');
                    setDescription('');
                    loadData(); // refresh global data
                }
            }
            else if (activeTab === 'recharge') {
                const numAmount = Number(amount);
                const tx: WalletTransaction = {
                    id: crypto.randomUUID(),
                    studentId: studentId,
                    type: 'recharge',
                    amount: numAmount,
                    description: 'شحن رصيد (نقدي)',
                    timestamp: new Date().toISOString(),
                    createdBy: 'موظف المقصف'
                };
                await addWalletTransaction(tx);
                const newBalance = currentBalance + numAmount;
                setProcessedBalance(newBalance);
                setScanStatus('success');
                setScanMessage(`تم إضافة الرصيد بنجاح بمبلغ ${numAmount} ريال. الرصيد الجديد: ${newBalance} ريال`);
                await createNotification(studentId, 'success', 'شحن المحفظة (إيصال)', `تم بنجاح شحن محفظة المقصف بمبلغ ${numAmount} ريال. الرصيد الجديد: ${newBalance} ريال`);
                setAmount('');
                loadData(); // refresh global data
            }

        } catch (e) {
            setScanStatus('error');
            setScanMessage('حدث خطأ أثناء معالجة العملية.');
        } finally {
            setScanLoading(false);
            isProcessingScan.current = false;
        }
    };

    const resetFlow = () => {
        setScanStatus(null);
        setScanMessage(null);
        setProcessedStudent(null);
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
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-24 animate-fade-in pt-4">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-600 to-amber-500 rounded-3xl p-6 md:p-8 border border-orange-400 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden text-white">
                <div className="absolute right-[-10%] top-[-50%] w-64 h-64 bg-yellow-400 rounded-full blur-3xl opacity-30 z-0"></div>
                <div className="relative z-10 flex-1">
                    <h1 className="text-3xl font-extrabold flex items-center gap-3 mb-2">
                        <Wallet className="bg-white/20 p-2 rounded-xl" size={48} />
                        المقصف الإلكتروني
                    </h1>
                    <p className="text-orange-100 text-sm font-bold">بوابة الشحن المباشر ونقاط البيع السريعة للمقصف المدرسي.</p>
                </div>
                <button
                    onClick={handlePrintDailyReport}
                    className="relative z-10 bg-white/10 hover:bg-white/20 border border-white/30 text-white px-6 py-3 rounded-2xl font-bold shadow-sm flex items-center gap-2 transition-all w-full md:w-auto justify-center"
                >
                    <Printer size={20} /> تقرير إيرادات اليوم
                </button>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-2 md:p-4 overflow-hidden relative">

                {/* Custom Tabs */}
                <div className="flex bg-slate-50 p-2 rounded-3xl mb-6 border border-slate-100 shadow-inner relative z-10">
                    <button
                        onClick={() => { setActiveTab('purchase'); resetFlow(); setAmount(''); setDescription(''); }}
                        className={`flex-1 py-3 px-2 md:px-6 rounded-2xl font-extrabold text-sm md:text-base flex items-center justify-center gap-2 transition-all ${activeTab === 'purchase' ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 -translate-y-1' : 'text-slate-500 hover:bg-slate-200/50'}`}
                    >
                        <Coffee size={20} /> شراء
                    </button>
                    <button
                        onClick={() => { setActiveTab('recharge'); resetFlow(); setAmount(''); }}
                        className={`flex-1 py-3 px-2 md:px-6 rounded-2xl font-extrabold text-sm md:text-base flex items-center justify-center gap-2 transition-all ${activeTab === 'recharge' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 -translate-y-1' : 'text-slate-500 hover:bg-slate-200/50'}`}
                    >
                        <Plus size={20} className="stroke-[3]" /> شحن الرصيد
                    </button>
                    <button
                        onClick={() => { setActiveTab('inquiry'); resetFlow(); }}
                        className={`flex-1 py-3 px-2 md:px-6 rounded-2xl font-extrabold text-sm md:text-base flex items-center justify-center gap-2 transition-all ${activeTab === 'inquiry' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 -translate-y-1' : 'text-slate-500 hover:bg-slate-200/50'}`}
                    >
                        <Search size={20} /> استعلام
                    </button>
                </div>

                {/* --- FLOW MODES --- */}
                {scanLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center">
                        <Loader2 className="animate-spin text-orange-500 mb-4" size={48} />
                        <h3 className="font-bold text-slate-500">جاري المعالجة...</h3>
                    </div>
                ) : scanStatus ? (
                    /* RESULT MODE */
                    <div className="py-8 px-4 animate-fade-in-up md:px-12">
                        {scanStatus === 'success' && (
                            <div className="text-center">
                                <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-emerald-50">
                                    <CheckCircle size={48} />
                                </div>
                                <h2 className="text-3xl font-extrabold text-slate-800 mb-2">تمت العملية بنجاح</h2>
                                <p className="text-lg font-bold text-emerald-600 mb-8">{scanMessage}</p>
                            </div>
                        )}
                        {scanStatus === 'error' && (
                            <div className="text-center">
                                <div className="w-24 h-24 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-red-50">
                                    <AlertCircle size={48} />
                                </div>
                                <h2 className="text-3xl font-extrabold text-slate-800 mb-2">{activeTab === 'purchase' && processedStudent ? 'عذراً الرصيد غير كافٍ!' : 'خطأ'}</h2>
                                <p className="text-lg font-bold text-red-600 mb-8">{scanMessage}</p>
                            </div>
                        )}
                        {scanStatus === 'inquiry' && processedStudent && (
                            <div className="text-center">
                                <div className="w-20 h-20 bg-indigo-100 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                                    <Wallet size={36} />
                                </div>
                                <h2 className="text-2xl font-extrabold text-slate-800 mb-1">استعلام المحفظة</h2>
                            </div>
                        )}

                        {processedStudent && (
                            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 text-center max-w-lg mx-auto shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-200/40 rounded-full blur-3xl -z-0"></div>
                                <div className="relative z-10 flex flex-col items-center gap-3">
                                    <span className="bg-white/80 backdrop-blur-sm text-slate-800 font-extrabold text-xl px-4 py-2 rounded-xl shadow-sm border border-slate-200/50 block">متبقي: {processedBalance} ر.س</span>
                                    <h4 className="font-extrabold text-lg text-slate-900">{processedStudent.name}</h4>
                                    <p className="text-slate-500 text-sm font-bold">{processedStudent.grade} - الهوية: {processedStudent.studentId}</p>
                                </div>

                                {scanStatus === 'inquiry' && (
                                    <div className="mt-6 pt-6 border-t border-slate-200 h-64 overflow-y-auto custom-scrollbar text-right">
                                        <h5 className="font-extrabold text-slate-700 mb-4 text-sm px-2">سجل العمليات الأخير:</h5>
                                        {processedTxs.length === 0 ? <p className="text-center text-slate-400 text-sm py-4">لا توجد عمليات مسبقة.</p> : (
                                            <div className="space-y-3">
                                                {processedTxs.map(tx => (
                                                    <div key={tx.id} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="font-bold text-sm text-slate-800">{tx.description}</span>
                                                            <span className="text-[10px] text-slate-400 font-mono">{new Date(tx.timestamp).toLocaleString('ar-SA')}</span>
                                                        </div>
                                                        <span className={`font-extrabold text-sm ${tx.type === 'recharge' ? 'text-emerald-600' : 'text-red-500'}`}>
                                                            {tx.type === 'recharge' ? '+' : '-'}{tx.amount} ر.س
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <button onClick={resetFlow} className="mt-8 bg-slate-900 text-white font-bold text-lg py-4 w-full md:w-auto md:px-16 rounded-2xl mx-auto block hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20">
                            تنفيذ عملية جديدة
                        </button>
                    </div>
                ) : (
                    /* INPUT MODE */
                    <div className="py-6 px-4 md:px-12 animate-fade-in relative z-10">
                        {activeTab !== 'inquiry' && (
                            <div className="max-w-md mx-auto mb-10">
                                <label className="text-center block text-slate-500 font-bold mb-4">أدخل المبلغ (ر.س) أولاً</label>
                                <input
                                    autoFocus
                                    inputMode="decimal"
                                    type="number"
                                    min="1"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    className={`w-full text-center text-4xl font-black p-6 border-2 rounded-[2rem] outline-none transition-all shadow-inner bg-slate-50 focus:bg-white ${activeTab === 'purchase' ? 'focus:border-red-400 text-red-600 border-slate-200/80 shadow-red-500/5' : 'focus:border-emerald-400 text-emerald-600 border-slate-200/80 shadow-emerald-500/5'}`}
                                    placeholder="0"
                                />
                                {activeTab === 'purchase' && (
                                    <div className="mt-4">
                                        <input
                                            type="text"
                                            placeholder="ملاحظة العملية (فيس، عصير... الخ) اختياري"
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                            className="w-full text-center p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm text-slate-700 focus:border-red-300"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="text-center">
                            <button
                                onClick={handleStartScan}
                                className={`${activeTab === 'inquiry' ? 'w-full max-w-sm mx-auto' : 'w-full max-w-sm mx-auto'} py-5 px-6 rounded-3xl font-extrabold text-white text-xl flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-xl ${activeTab === 'purchase' ? 'bg-gradient-to-r from-red-600 to-rose-500 shadow-red-500/30 border-b-4 border-red-700' : activeTab === 'recharge' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/30 border-b-4 border-teal-700' : 'bg-gradient-to-r from-indigo-600 to-blue-600 shadow-indigo-600/30 border-b-4 border-indigo-800'}`}
                            >
                                <ScanLine size={28} /> مسح الباركود للطالب
                            </button>
                            <p className="mt-4 text-slate-400 text-sm font-bold">يتم المسح تلقائياً عند قراءة الكاميرا لبطاقة الطالب.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* SCANNER MODAL OVERLAY */}
            {isScanning && (
                <div className="fixed inset-0 z-50 bg-black/95 flex flex-col animate-fade-in backdrop-blur-sm">
                    {/* Header */}
                    <div className="flex justify-between items-center p-6 text-white pb-2 relative z-10 w-full max-w-md mx-auto">
                        <button onClick={closeScanner} className="p-3 bg-white/20 rounded-full backdrop-blur-md hover:bg-white/30"><X size={24} /></button>
                        <h3 className="font-extrabold text-lg flex items-center gap-2"><Camera size={20} /> مسح البطاقة</h3>
                        <div className="w-12"></div> {/* Spacer */}
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-0 w-full max-w-md mx-auto">
                        {/* Display Intended Amount if not Inquiry */}
                        {activeTab !== 'inquiry' && (
                            <div className={`absolute top-10 w-11/12 z-20 py-3 rounded-2xl text-center font-extrabold text-lg backdrop-blur-md border border-white/20 ${activeTab === 'purchase' ? 'bg-red-500/80 text-white' : 'bg-emerald-500/80 text-white'}`}>
                                {activeTab === 'purchase' ? `قيمة الشراء: ${amount} ريال` : `قيمة الشحن: ${amount} ريال`}
                            </div>
                        )}

                        <div className="w-full aspect-square relative rounded-[2rem] overflow-hidden border-2 border-slate-700 bg-black shadow-2xl">
                            <div id="canteen-reader" className="w-full h-full object-cover"></div>

                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                                <div className="w-64 h-64 border-[3px] border-white/40 rounded-3xl relative">
                                    <div className="absolute top-[-2px] left-[-2px] w-10 h-10 border-t-4 border-l-4 border-emerald-400 rounded-tl-[1.3rem]"></div>
                                    <div className="absolute top-[-2px] right-[-2px] w-10 h-10 border-t-4 border-r-4 border-emerald-400 rounded-tr-[1.3rem]"></div>
                                    <div className="absolute bottom-[-2px] left-[-2px] w-10 h-10 border-b-4 border-l-4 border-emerald-400 rounded-bl-[1.3rem]"></div>
                                    <div className="absolute bottom-[-2px] right-[-2px] w-10 h-10 border-b-4 border-r-4 border-emerald-400 rounded-br-[1.3rem]"></div>

                                    {/* Scan Line Animation */}
                                    {!scanError && <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-400/80 shadow-[0_0_15px_rgba(52,211,153,1)] animate-scan"></div>}
                                </div>
                            </div>

                            {/* Camera Error Message */}
                            {scanError && (
                                <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center text-white z-30 p-6 text-center backdrop-blur-md">
                                    <AlertCircle size={48} className="text-red-500 mb-4" />
                                    <p className="font-bold mb-6 text-sm leading-relaxed">{scanError}</p>
                                    <button onClick={() => { setScanError(null); startScanner(); }} className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-200 transition-colors"><RefreshCw size={18} /> المحاولة مجدداً</button>
                                </div>
                            )}
                        </div>
                        <p className="mt-8 text-white/50 text-sm font-bold text-center">وجّه الكاميرا نحو الرمز الشريطي للطالب</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CanteenManager;
