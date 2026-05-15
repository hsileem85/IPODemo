import { useState, useMemo, createContext, useContext } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Landmark,
  FileSpreadsheet,
  ArrowLeftRight,
  Printer,
  Send,
  Upload,
  CheckCircle2,
  Globe,
} from "lucide-react";

// -------------------------------------------------------
// Translations
// -------------------------------------------------------
type Lang = "ar" | "en";

const T = {
  ar: {
    appTitle: "QNB نظام إدارة الاكتتابات",
    appSubtitle: "شركة التكنولوجيا المتقدمة — اكتتاب زيادة رأس مال",
    roleFront: "الفرع (Front Office)",
    roleBack: "المقاصة (Back Office)",

    // Steps
    step1: "التعريف بالعميل",
    step2: "تفاصيل الاكتتاب",
    step3: "المستندات",
    step4: "الإيصال النهائي",

    // Step 1
    kycTitle: "KYC العميل واختيار الحدث",
    kycDesc: "أدخل الرقم القومي للبحث في قاعدة بيانات MCDR",
    nationalIdLabel: "الرقم القومي (14 رقم)",
    nationalIdPlaceholder: "أدخل الرقم القومي...",
    nationalIdHint: "للتجربة: 111 أو 29001011234567",
    eventLabel: "حدث الاكتتاب",
    mcdrVerified: "مستثمر موثق — MCDR",
    unifiedCode: "الكود الموحد",
    accountNo: "الحساب",
    activeStatus: "نشط",
    nextStep: "الخطوة التالية",

    // Step 2
    ektitabTitle: "تفاصيل الاكتتاب (Ektitab)",
    ektitabDesc: "أدخل عدد الأسهم وطريقة الدفع",
    sharesLabel: "عدد الأسهم المطلوبة",
    paymentLabel: "طريقة الدفع",
    payDirect: "خصم مباشر (تجميد حساب)",
    payCash: "إيداع نقدي",
    payCheck: "شيك معتمد",
    orderSummary: "ملخص الأمر",
    parValue: "القيمة الاسمية",
    issueFees: "مصاريف الإصدار",
    totalDue: "إجمالي المستحق",
    confirmDocs: "تأكيد ورفع المستندات",

    // Step 3
    docsTitle: "المستندات المطلوبة",
    docsDesc: "ارفع نسخ المستندات اللازمة لاستكمال الاكتتاب",
    doc1: "نسخة البطاقة القومية",
    doc2: "نموذج الاكتتاب الموقع",
    doc3: "إيصال التحويل البنكي",
    doc4: "توكيل رسمي (إن وجد)",
    uploadBtn: "رفع",
    reviewReceipt: "مراجعة الملخص النهائي",

    // Step 4
    subPrepared: "تم تجهيز الاكتتاب",
    txPrefix: "رقم العملية",
    clientLabel: "العميل",
    sharesCol: "الأسهم",
    totalAmtLabel: "إجمالي المبلغ",
    statusLabel: "الحالة",
    awaitingVerif: "في انتظار التحقق",
    printReceipt: "طباعة الإيصال",
    submitHQ: "إرسال للمقاصة",

    // Back Office
    opsHubTitle: "مركز العمليات",
    opsHubDesc: "المقاصة المركزية والمطابقة — مدير النظام",
    exportMCDR: "تصدير ملف MCDR",
    executeAlloc: "تنفيذ التخصيص",
    processRefund: "رد الفائض",

    stat0: "إجمالي الاكتتابات",
    stat1: "نسبة التغطية",
    stat2: "استثناءات",
    stat3: "إجمالي النقدية (ج.م)",

    reconTitle: "قائمة المطابقة",
    filterAll: "الكل",
    filterVerified: "موثق",
    filterShortfall: "عجز",
    filterPending: "قيد الدفع",
    filterAllocated: "مخصص",
    filterRefunded: "مرتد فائض",

    colInvestor: "المستثمر / الرقم القومي",
    colBranch: "الفرع",
    colDue: "المستحق (ج.م)",
    colPaid: "المدفوع (ج.م)",
    colAllocated: "المخصص",
    colRefund: "رد الفائض",
    colStatus: "الحالة",
    colAction: "إجراء",
    noRecords: "لا توجد عمليات",
    manualMatch: "مطابقة يدوية",
    refundAction: "رد",

    bankTitle: "تكامل كشف الحساب البنكي",
    bankDesc: "ارفع ملف MT940 أو Excel لمطابقة الأرصدة تلقائيًا مع الاكتتابات.",
    uploadStatement: "رفع كشف الحساب",

    // Status labels
    statusPending: "قيد الدفع",
    statusVerified: "موثق",
    statusShortfall: "عجز",
    statusAllocated: "مخصص",
    statusRefunded: "مرتد فائض",

    // Toast
    toastSentTitle: "تم الإرسال للمقاصة",
    toastSentDesc: (id: string) => `تم تسجيل الاكتتاب ${id} بنجاح.`,
    toastAllocTitle: "تم التخصيص",
    toastAllocDesc: "تم معالجة ملف MCDR وتخصيص الأسهم بنسبة 40%.",
    toastRefundTitle: "رد الفائض",
    toastRefundDesc: "تم تنفيذ رد الفائض لجميع الحسابات المخصصة.",

    // Validation
    sharesError: "يجب إدخال عدد أسهم صحيح",

    // Events
    eventSOO: "Sinawy Olive Oil IPO (SOO)",
    eventCAP: "زيادة رأس مال - بنك التكنولوجيا المتقدمة",
    eventRIGHTS: "أسهم أولوية - دلتا للتأمين",

    egp: "ج.م",
    shares: "سهم",
    tryHint: "للتجربة",
  },
  en: {
    appTitle: "QNB IPO Management System",
    appSubtitle: "Advanced Technology Co. — Capital Increase IPO",
    roleFront: "Branch (Front Office)",
    roleBack: "Clearing (Back Office)",

    step1: "Identification",
    step2: "Ektitab Entry",
    step3: "Documentation",
    step4: "Final Receipt",

    kycTitle: "Client KYC & Event Selection",
    kycDesc: "Enter the national ID to look up the client in the MCDR database",
    nationalIdLabel: "National ID (14 digits)",
    nationalIdPlaceholder: "Enter national ID...",
    nationalIdHint: "Try: 111 or 29001011234567",
    eventLabel: "Subscription Event",
    mcdrVerified: "MCDR Verified Shareholder",
    unifiedCode: "Unified Code",
    accountNo: "Account",
    activeStatus: "Active",
    nextStep: "Next Step",

    ektitabTitle: "Subscription (Ektitab) Details",
    ektitabDesc: "Enter the number of shares and payment method",
    sharesLabel: "Shares Requested",
    paymentLabel: "Payment Method",
    payDirect: "Direct Debit (Account Block)",
    payCash: "Cash Deposit",
    payCheck: "Certified Check",
    orderSummary: "Order Summary",
    parValue: "Par Value",
    issueFees: "Issue Fees",
    totalDue: "Total Due",
    confirmDocs: "Confirm & Upload Docs",

    docsTitle: "Required Documentation",
    docsDesc: "Upload copies of the required documents to complete the subscription",
    doc1: "National ID Copy",
    doc2: "Signed Subscription Form",
    doc3: "Bank Transfer Receipt",
    doc4: "POA (if applicable)",
    uploadBtn: "Upload",
    reviewReceipt: "Review Final Summary",

    subPrepared: "Subscription Prepared",
    txPrefix: "Transaction ID",
    clientLabel: "Client",
    sharesCol: "Shares",
    totalAmtLabel: "Total Amount",
    statusLabel: "Status",
    awaitingVerif: "Awaiting Verification",
    printReceipt: "Print Receipt",
    submitHQ: "Submit to HQ",

    opsHubTitle: "Operations Hub",
    opsHubDesc: "Central Clearing & Reconciliation — System Admin",
    exportMCDR: "Export MCDR File",
    executeAlloc: "Execute Allocation",
    processRefund: "Process Refund",

    stat0: "Total Subscriptions",
    stat1: "Coverage Ratio",
    stat2: "Exceptions",
    stat3: "Total Cash (EGP)",

    reconTitle: "Reconciliation Queue",
    filterAll: "All",
    filterVerified: "Verified",
    filterShortfall: "Shortfall",
    filterPending: "Pending Payment",
    filterAllocated: "Allocated",
    filterRefunded: "Refunded",

    colInvestor: "Investor / National ID",
    colBranch: "Branch",
    colDue: "Due (EGP)",
    colPaid: "Paid (EGP)",
    colAllocated: "Allocated",
    colRefund: "Refund",
    colStatus: "Status",
    colAction: "Action",
    noRecords: "No records found",
    manualMatch: "Manual Match",
    refundAction: "Refund",

    bankTitle: "Bank Statement Integration",
    bankDesc: "Upload MT940 or Excel to auto-match funds against subscriptions.",
    uploadStatement: "Upload Statement",

    statusPending: "Pending Payment",
    statusVerified: "Verified",
    statusShortfall: "Shortfall",
    statusAllocated: "Allocated",
    statusRefunded: "Refunded",

    toastSentTitle: "Submitted to Clearing",
    toastSentDesc: (id: string) => `Subscription ${id} registered successfully.`,
    toastAllocTitle: "Allocation Complete",
    toastAllocDesc: "MCDR file processed — 40% allocation applied.",
    toastRefundTitle: "Refunds Processed",
    toastRefundDesc: "Excess refunds executed for all allocated accounts.",

    sharesError: "Please enter a valid number of shares",

    eventSOO: "Sinawy Olive Oil IPO (SOO)",
    eventCAP: "Capital Increase — Advanced Technology Bank",
    eventRIGHTS: "Rights Issue — Delta Insurance",

    egp: "EGP",
    shares: "shares",
    tryHint: "Try",
  },
} as const;

type Translations = typeof T.ar;

// -------------------------------------------------------
// Language Context
// -------------------------------------------------------
const LangContext = createContext<{ lang: Lang; t: Translations; isRTL: boolean }>({
  lang: "ar",
  t: T.ar,
  isRTL: true,
});

function useLang() {
  return useContext(LangContext);
}

// -------------------------------------------------------
// Types & Constants
// -------------------------------------------------------
interface Subscription {
  id: string;
  name: string;
  nationalId: string;
  account: string;
  unifiedCode: string;
  requestedShares: number;
  amountDue: number;
  amountPaid: number;
  allocatedShares: number;
  refundAmount: number;
  status: "Pending Payment" | "Verified" | "Shortfall" | "Allocated" | "Refunded";
  branch: string;
}

const PAR_VALUE = 1.0;
const ISSUE_FEES = 0.25;
const TOTAL_PER_SHARE = PAR_VALUE + ISSUE_FEES;

const MOCK_CLIENTS: Record<string, { name: string; unifiedCode: string; account: string }> = {
  "111": { name: "حسين سليم محمد علي / Hussein Salim Mohamed", unifiedCode: "8800318", account: "100003456" },
  "29001011234567": { name: "أحمد محمد علي / Ahmed Mohamed Ali", unifiedCode: "7700123", account: "100234567" },
  "29505051234568": { name: "سارة محمود حسن / Sara Mahmoud Hassan", unifiedCode: "7700456", account: "100234568" },
};

const INITIAL_SUBSCRIPTIONS: Subscription[] = [
  {
    id: "TX-9901",
    name: "أحمد محمد علي",
    nationalId: "29001011234567",
    account: "100234567",
    unifiedCode: "7700123",
    requestedShares: 10000,
    amountDue: 12500,
    amountPaid: 12500,
    allocatedShares: 0,
    refundAmount: 0,
    status: "Verified",
    branch: "Cairo-Main",
  },
  {
    id: "TX-9902",
    name: "سارة محمود حسن",
    nationalId: "29505051234568",
    account: "100234568",
    unifiedCode: "7700456",
    requestedShares: 4000,
    amountDue: 5000,
    amountPaid: 4500,
    allocatedShares: 0,
    refundAmount: 0,
    status: "Shortfall",
    branch: "Alex-Branch",
  },
  {
    id: "TX-9903",
    name: "حسين سليم محمد",
    nationalId: "111",
    account: "100003456",
    unifiedCode: "8800318",
    requestedShares: 15000,
    amountDue: 18750,
    amountPaid: 0,
    allocatedShares: 0,
    refundAmount: 0,
    status: "Pending Payment",
    branch: "Giza-Hub",
  },
];

const queryClient = new QueryClient();

// -------------------------------------------------------
// Status Badge
// -------------------------------------------------------
function StatusBadge({ status }: { status: Subscription["status"] }) {
  const { t } = useLang();
  const map: Record<Subscription["status"], { label: string; cls: string }> = {
    "Pending Payment": { label: t.statusPending, cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    Verified: { label: t.statusVerified, cls: "bg-green-500/10 text-green-600 border-green-500/20" },
    Shortfall: { label: t.statusShortfall, cls: "bg-red-500/10 text-red-600 border-red-500/20" },
    Allocated: { label: t.statusAllocated, cls: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    Refunded: { label: t.statusRefunded, cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  };
  const { label, cls } = map[status];
  return <Badge variant="outline" className={`${cls} whitespace-nowrap`}>{label}</Badge>;
}

// -------------------------------------------------------
// Front Office
// -------------------------------------------------------
function FrontOffice({ onNewSubscription }: { onNewSubscription: (s: Subscription) => void }) {
  const { t, lang, isRTL } = useLang();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [nationalIdInput, setNationalIdInput] = useState("");
  const [foundClient, setFoundClient] = useState<{ name: string; unifiedCode: string; account: string } | null>(null);
  const [pendingSubscription, setPendingSubscription] = useState<Subscription | null>(null);

  const STEPS = [t.step1, t.step2, t.step3, t.step4];
  const DOCS = [t.doc1, t.doc2, t.doc3, t.doc4];
  const EVENTS = [
    { value: "SOO", label: t.eventSOO },
    { value: "CAP", label: t.eventCAP },
    { value: "RIGHTS", label: t.eventRIGHTS },
  ];

  const sharesSchema = z.object({
    requestedShares: z.coerce.number().min(1, t.sharesError),
    paymentMethod: z.string().min(1),
  });

  const form = useForm<z.infer<typeof sharesSchema>>({
    resolver: zodResolver(sharesSchema),
    defaultValues: { requestedShares: 0, paymentMethod: "Direct Debit" },
  });

  const watchedShares = form.watch("requestedShares");
  const totalDue = (Number(watchedShares) || 0) * TOTAL_PER_SHARE;

  const handleIdChange = (value: string) => {
    setNationalIdInput(value);
    setFoundClient(MOCK_CLIENTS[value] ?? null);
  };

  const onSubmitStep2 = (values: z.infer<typeof sharesSchema>) => {
    if (!foundClient) return;
    const sub: Subscription = {
      id: "TX-" + Math.floor(1000 + Math.random() * 9000),
      name: foundClient.name,
      nationalId: nationalIdInput,
      account: foundClient.account,
      unifiedCode: foundClient.unifiedCode,
      requestedShares: values.requestedShares,
      amountDue: values.requestedShares * TOTAL_PER_SHARE,
      amountPaid: values.requestedShares * TOTAL_PER_SHARE,
      allocatedShares: 0,
      refundAmount: 0,
      status: "Verified",
      branch: "Cairo-Main",
    };
    setPendingSubscription(sub);
    setStep(3);
  };

  const handleFinalSubmit = () => {
    if (!pendingSubscription) return;
    onNewSubscription(pendingSubscription);
    toast({ title: t.toastSentTitle, description: t.toastSentDesc(pendingSubscription.id) });
    setStep(1);
    setNationalIdInput("");
    setFoundClient(null);
    setPendingSubscription(null);
    form.reset();
  };

  const numLocale = lang === "ar" ? "ar-EG" : "en-US";

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {STEPS.map((label, i) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  data-testid={`step-button-${i + 1}`}
                  onClick={() => { if (i + 1 < step) setStep(i + 1); }}
                  className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm transition-all border-2 ${
                    step === i + 1
                      ? "bg-primary border-primary/20 text-primary-foreground scale-110 shadow-md"
                      : step > i + 1
                      ? "bg-green-500 border-green-200 text-white"
                      : "bg-muted border-transparent text-muted-foreground"
                  }`}
                >
                  {step > i + 1 ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                </button>
                <span
                  className={`text-[10px] font-bold tracking-wide text-center max-w-[80px] leading-tight ${
                    step === i + 1 ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 1 */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>{t.kycTitle}</CardTitle>
            <CardDescription>{t.kycDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">
                  {t.nationalIdLabel}
                </label>
                <Input
                  data-testid="input-national-id"
                  value={nationalIdInput}
                  onChange={(e) => handleIdChange(e.target.value)}
                  placeholder={t.nationalIdPlaceholder}
                  maxLength={14}
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">{t.nationalIdHint}</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">
                  {t.eventLabel}
                </label>
                <select
                  data-testid="select-subscription-event"
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-ring outline-none"
                >
                  {EVENTS.map((ev) => (
                    <option key={ev.value} value={ev.value}>{ev.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {foundClient && (
              <div
                data-testid="panel-client-kyc"
                className="bg-primary text-primary-foreground p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg"
              >
                <div>
                  <p className="text-primary-foreground/70 text-xs font-bold uppercase tracking-widest mb-1">
                    {t.mcdrVerified}
                  </p>
                  <h3 className="text-xl font-bold leading-snug">{foundClient.name}</h3>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-primary-foreground/80">
                    <span>{t.unifiedCode}: <span className="font-mono text-primary-foreground">{foundClient.unifiedCode}</span></span>
                    <span>{t.accountNo}: <span className="font-mono text-primary-foreground">{foundClient.account}</span></span>
                    <span className="bg-white/20 px-2 py-0.5 rounded font-bold text-xs">{t.activeStatus}</span>
                  </div>
                </div>
                <Button
                  data-testid="button-next-step-1"
                  variant="secondary"
                  className="shrink-0 font-bold"
                  onClick={() => setStep(2)}
                >
                  {t.nextStep}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>{t.ektitabTitle}</CardTitle>
            <CardDescription>{t.ektitabDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitStep2)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-4">
                    <FormField
                      control={form.control}
                      name="requestedShares"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.sharesLabel}</FormLabel>
                          <FormControl>
                            <Input data-testid="input-shares" type="number" placeholder="0" dir="ltr" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.paymentLabel}</FormLabel>
                          <FormControl>
                            <select
                              data-testid="select-payment-method"
                              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-ring outline-none"
                              {...field}
                            >
                              <option value="Direct Debit">{t.payDirect}</option>
                              <option value="Cash Deposit">{t.payCash}</option>
                              <option value="Certified Check">{t.payCheck}</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Card className="bg-muted/50 border-dashed">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">{t.orderSummary}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t.parValue}</span>
                        <span className="font-bold">{PAR_VALUE} {t.egp}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t.issueFees}</span>
                        <span className="font-bold">{ISSUE_FEES} {t.egp}</span>
                      </div>
                      <div className="border-t pt-3 flex justify-between items-center">
                        <span className="font-bold">{t.totalDue}</span>
                        <span data-testid="text-total-due" className="text-xl font-black text-primary">
                          {totalDue.toLocaleString(numLocale)} {t.egp}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Button data-testid="button-confirm-docs" type="submit" className="px-10">
                  {t.confirmDocs}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>{t.docsTitle}</CardTitle>
            <CardDescription>{t.docsDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DOCS.map((doc) => (
                <div
                  key={doc}
                  className="border-2 border-dashed border-border p-5 rounded-xl flex items-center justify-between hover:border-primary/40 transition-colors"
                >
                  <span className="font-bold text-sm">{doc}</span>
                  <label className="cursor-pointer">
                    <input data-testid={`file-${doc}`} type="file" className="hidden" />
                    <span className={`flex items-center gap-1.5 bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${isRTL ? "flex-row-reverse" : ""}`}>
                      <Upload className="w-3.5 h-3.5" />
                      {t.uploadBtn}
                    </span>
                  </label>
                </div>
              ))}
            </div>
            <Button data-testid="button-review-receipt" className="mt-2 px-10" onClick={() => setStep(4)}>
              {t.reviewReceipt}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 4 */}
      {step === 4 && pendingSubscription && (
        <Card>
          <CardContent className="pt-8">
            <div className="max-w-xl mx-auto text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h2 data-testid="text-subscription-prepared" className="text-2xl font-black">
                  {t.subPrepared}
                </h2>
                <p className="text-muted-foreground mt-1">
                  {t.txPrefix}:{" "}
                  <span data-testid="text-tx-id" className="font-mono font-bold text-foreground">
                    {pendingSubscription.id}
                  </span>
                </p>
              </div>

              <Card className={`bg-muted/50 ${isRTL ? "text-right" : "text-left"}`}>
                <CardContent className="pt-5 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{t.clientLabel}</p>
                    <p className="font-bold">{pendingSubscription.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{t.sharesCol}</p>
                    <p className="font-bold text-primary">
                      {pendingSubscription.requestedShares.toLocaleString(numLocale)} {t.shares}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{t.totalAmtLabel}</p>
                    <p className="font-bold">{pendingSubscription.amountDue.toLocaleString(numLocale)} {t.egp}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{t.statusLabel}</p>
                    <p className="font-bold text-amber-500">{t.awaitingVerif}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3 justify-center">
                <Button variant="outline" data-testid="button-print-receipt">
                  <Printer className={`w-4 h-4 ${isRTL ? "ml-2" : "mr-2"}`} />
                  {t.printReceipt}
                </Button>
                <Button data-testid="button-submit-hq" onClick={handleFinalSubmit}>
                  <Send className={`w-4 h-4 ${isRTL ? "ml-2" : "mr-2"}`} />
                  {t.submitHQ}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// -------------------------------------------------------
// Back Office
// -------------------------------------------------------
function BackOffice({
  subscriptions,
  onAllocate,
  onRefund,
}: {
  subscriptions: Subscription[];
  onAllocate: () => void;
  onRefund: () => void;
}) {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [reconFilter, setReconFilter] = useState("All");
  const numLocale = lang === "ar" ? "ar-EG" : "en-US";

  const RECON_FILTERS = [
    { key: "All", label: t.filterAll },
    { key: "Verified", label: t.filterVerified },
    { key: "Shortfall", label: t.filterShortfall },
    { key: "Pending Payment", label: t.filterPending },
    { key: "Allocated", label: t.filterAllocated },
    { key: "Refunded", label: t.filterRefunded },
  ];

  const filteredRecon = useMemo(() => {
    if (reconFilter === "All") return subscriptions;
    return subscriptions.filter((s) => s.status === reconFilter);
  }, [reconFilter, subscriptions]);

  const totalCash = subscriptions.reduce((sum, s) => sum + s.amountPaid, 0);
  const exceptions = subscriptions.filter((s) => s.status === "Shortfall").length;
  const totalCashDisplay =
    totalCash >= 1_000_000
      ? `${(totalCash / 1_000_000).toFixed(2)}M`
      : totalCash.toLocaleString(numLocale);

  const STATS = [
    { label: t.stat0, value: subscriptions.length, color: "text-foreground" },
    { label: t.stat1, value: "3.2x", color: "text-green-600" },
    { label: t.stat2, value: exceptions, color: "text-red-500" },
    { label: t.stat3, value: totalCashDisplay, color: "text-primary" },
  ];

  const handleAllocate = () => {
    onAllocate();
    toast({ title: t.toastAllocTitle, description: t.toastAllocDesc });
  };

  const handleRefund = () => {
    onRefund();
    toast({ title: t.toastRefundTitle, description: t.toastRefundDesc });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">{t.opsHubTitle}</h2>
          <p className="text-muted-foreground text-sm">{t.opsHubDesc}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" data-testid="button-export-mcdr">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            {t.exportMCDR}
          </Button>
          <Button size="sm" data-testid="button-execute-allocation" onClick={handleAllocate}>
            <ArrowLeftRight className="w-4 h-4 mr-2" />
            {t.executeAlloc}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-green-500 text-green-600 hover:bg-green-50"
            data-testid="button-process-refund"
            onClick={handleRefund}
          >
            {t.processRefund}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATS.map((stat, i) => (
          <Card key={i}>
            <CardContent className="pt-5 pb-5 text-center">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </p>
              <p data-testid={`stat-${i}`} className={`text-3xl font-black mt-1 ${stat.color}`}>
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <CardTitle>{t.reconTitle}</CardTitle>
            <div className="flex bg-muted p-1 rounded-xl gap-1 flex-wrap">
              {RECON_FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  data-testid={`filter-${key}`}
                  onClick={() => setReconFilter(key)}
                  className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
                    reconFilter === key
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  {[t.colInvestor, t.colBranch, t.colDue, t.colPaid, t.colAllocated, t.colRefund, t.colStatus, t.colAction].map((col, i) => (
                    <TableHead
                      key={i}
                      className={`font-black text-[10px] uppercase tracking-widest text-muted-foreground ${i === 7 ? "text-center" : "text-right"}`}
                    >
                      {col}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecon.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      {t.noRecords}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecon.map((sub) => (
                    <TableRow
                      key={sub.id}
                      data-testid={`row-sub-${sub.id}`}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <TableCell>
                        <p className="font-bold text-sm leading-tight">{sub.name}</p>
                        <p className="text-xs font-mono text-muted-foreground mt-0.5">{sub.nationalId}</p>
                      </TableCell>
                      <TableCell className="text-sm font-bold text-muted-foreground">{sub.branch}</TableCell>
                      <TableCell className="text-sm text-right font-bold text-muted-foreground">
                        {sub.amountDue.toLocaleString(numLocale)}
                      </TableCell>
                      <TableCell className="text-sm text-right font-black text-primary">
                        {sub.amountPaid.toLocaleString(numLocale)}
                      </TableCell>
                      <TableCell className="text-sm text-right font-bold">
                        {sub.allocatedShares > 0 ? sub.allocatedShares.toLocaleString(numLocale) : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-right font-bold text-green-600">
                        {sub.refundAmount > 0 ? `${sub.refundAmount.toLocaleString(numLocale)} ${t.egp}` : "-"}
                      </TableCell>
                      <TableCell><StatusBadge status={sub.status} /></TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-3">
                          <button
                            data-testid={`button-manual-match-${sub.id}`}
                            className="text-primary font-black text-[10px] uppercase hover:underline"
                          >
                            {t.manualMatch}
                          </button>
                          <button
                            data-testid={`button-refund-${sub.id}`}
                            className="text-red-500 font-black text-[10px] uppercase hover:underline"
                          >
                            {t.refundAction}
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="p-6 bg-foreground text-background rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-primary-foreground">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="font-black text-base">{t.bankTitle}</p>
                <p className="text-background/60 text-sm max-w-xs">{t.bankDesc}</p>
              </div>
            </div>
            <button
              data-testid="button-upload-statement"
              className="bg-background text-foreground px-8 py-3 rounded-xl font-black text-sm hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              {t.uploadStatement}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// -------------------------------------------------------
// Root
// -------------------------------------------------------
function IPOSystem() {
  const [lang, setLang] = useState<Lang>("ar");
  const [userRole, setUserRole] = useState<"FrontOffice" | "BackOffice">("FrontOffice");
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(INITIAL_SUBSCRIPTIONS);

  const t = T[lang];
  const isRTL = lang === "ar";

  const handleNewSubscription = (sub: Subscription) => {
    setSubscriptions((prev) => [sub, ...prev]);
  };

  const handleAllocate = () => {
    setSubscriptions((prev) =>
      prev.map((s) => {
        if (s.status !== "Verified") return s;
        return { ...s, allocatedShares: Math.floor(s.requestedShares * 0.4), status: "Allocated" as const };
      })
    );
  };

  const handleRefund = () => {
    setSubscriptions((prev) =>
      prev.map((s) => {
        if (s.status !== "Allocated") return s;
        return { ...s, refundAmount: (s.requestedShares - s.allocatedShares) * PAR_VALUE, status: "Refunded" as const };
      })
    );
  };

  return (
    <LangContext.Provider value={{ lang, t, isRTL }}>
      <div dir={isRTL ? "rtl" : "ltr"} className="min-h-[100dvh] bg-background font-sans">
        <header className="bg-card border-b px-6 py-4 sticky top-0 z-10 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-2 rounded-md">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">{t.appTitle}</h1>
              <p className="text-xs text-muted-foreground">{t.appSubtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <button
              data-testid="button-toggle-lang"
              onClick={() => setLang((l) => (l === "ar" ? "en" : "ar"))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-bold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              title={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
            >
              <Globe className="w-4 h-4" />
              {lang === "ar" ? "EN" : "عر"}
            </button>

            {/* Role Switcher */}
            <div className="bg-muted p-1 rounded-xl flex gap-1 shadow-inner">
              <button
                data-testid="role-front-office"
                onClick={() => setUserRole("FrontOffice")}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  userRole === "FrontOffice"
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.roleFront}
              </button>
              <button
                data-testid="role-back-office"
                onClick={() => setUserRole("BackOffice")}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  userRole === "BackOffice"
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.roleBack}
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto p-6">
          {userRole === "FrontOffice" ? (
            <FrontOffice onNewSubscription={handleNewSubscription} />
          ) : (
            <BackOffice
              subscriptions={subscriptions}
              onAllocate={handleAllocate}
              onRefund={handleRefund}
            />
          )}
        </main>
      </div>
    </LangContext.Provider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <IPOSystem />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
