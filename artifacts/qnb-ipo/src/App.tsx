import { useState, useMemo } from "react";
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
} from "lucide-react";

// -------------------------------------------------------
// Types
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

// -------------------------------------------------------
// Constants
// -------------------------------------------------------
const PAR_VALUE = 1.0;
const ISSUE_FEES = 0.25;
const TOTAL_PER_SHARE = PAR_VALUE + ISSUE_FEES;

const SUBSCRIPTION_EVENTS = [
  { value: "SOO", label: "Sinawy Olive Oil IPO (SOO)" },
  { value: "CAP-ABC", label: "زيادة رأس مال - بنك التكنولوجيا المتقدمة" },
  { value: "RIGHTS-DELTA", label: "أسهم أولوية - دلتا للتأمين" },
];

const MOCK_CLIENTS: Record<string, { name: string; unifiedCode: string; account: string }> = {
  "111": { name: "حسين سليم محمد علي", unifiedCode: "8800318", account: "100003456" },
  "29001011234567": { name: "أحمد محمد علي", unifiedCode: "7700123", account: "100234567" },
  "29505051234568": { name: "سارة محمود حسن", unifiedCode: "7700456", account: "100234568" },
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

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------
const queryClient = new QueryClient();

const subscriptionFormSchema = z.object({
  requestedShares: z.coerce.number().min(1, "يجب إدخال عدد أسهم صحيح"),
  paymentMethod: z.string().min(1),
});

function getStatusBadge(status: Subscription["status"]) {
  switch (status) {
    case "Pending Payment":
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 whitespace-nowrap">
          قيد الدفع
        </Badge>
      );
    case "Verified":
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
          موثق
        </Badge>
      );
    case "Shortfall":
      return (
        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
          عجز
        </Badge>
      );
    case "Allocated":
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
          مخصص
        </Badge>
      );
    case "Refunded":
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
          مرتد فائض
        </Badge>
      );
  }
}

// -------------------------------------------------------
// Front Office
// -------------------------------------------------------
const STEPS = ["التعريف بالعميل", "تفاصيل الاكتتاب", "المستندات", "الإيصال النهائي"];

function FrontOffice({ onNewSubscription }: { onNewSubscription: (s: Subscription) => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [nationalIdInput, setNationalIdInput] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(SUBSCRIPTION_EVENTS[0].value);
  const [foundClient, setFoundClient] = useState<{ name: string; unifiedCode: string; account: string } | null>(null);
  const [pendingSubscription, setPendingSubscription] = useState<Subscription | null>(null);

  const form = useForm<z.infer<typeof subscriptionFormSchema>>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: { requestedShares: 0, paymentMethod: "Direct Debit" },
  });

  const watchedShares = form.watch("requestedShares");
  const totalDue = (Number(watchedShares) || 0) * TOTAL_PER_SHARE;

  const handleIdChange = (value: string) => {
    setNationalIdInput(value);
    setFoundClient(MOCK_CLIENTS[value] ?? null);
  };

  const onSubmitStep2 = (values: z.infer<typeof subscriptionFormSchema>) => {
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
    toast({
      title: "تم الإرسال للمقاصة",
      description: `تم تسجيل الاكتتاب ${pendingSubscription.id} بنجاح.`,
    });
    setStep(1);
    setNationalIdInput("");
    setFoundClient(null);
    setPendingSubscription(null);
    form.reset();
  };

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
                  className={`text-[10px] font-bold tracking-wide text-center max-w-[72px] leading-tight ${
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

      {/* Step 1 — Identification */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>KYC العميل واختيار الحدث</CardTitle>
            <CardDescription>أدخل الرقم القومي للبحث في قاعدة بيانات MCDR</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">
                  الرقم القومي (14 رقم)
                </label>
                <Input
                  data-testid="input-national-id"
                  value={nationalIdInput}
                  onChange={(e) => handleIdChange(e.target.value)}
                  placeholder="أدخل الرقم القومي..."
                  maxLength={14}
                />
                <p className="text-xs text-muted-foreground">للتجربة: 111 أو 29001011234567</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">
                  حدث الاكتتاب
                </label>
                <select
                  data-testid="select-subscription-event"
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-ring outline-none"
                >
                  {SUBSCRIPTION_EVENTS.map((ev) => (
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
                    مستثمر موثق — MCDR
                  </p>
                  <h3 className="text-2xl font-bold">{foundClient.name}</h3>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-primary-foreground/80">
                    <span>الكود الموحد: <span className="font-mono text-primary-foreground">{foundClient.unifiedCode}</span></span>
                    <span>الحساب: <span className="font-mono text-primary-foreground">{foundClient.account}</span></span>
                    <span className="bg-white/20 px-2 py-0.5 rounded font-bold text-xs">نشط</span>
                  </div>
                </div>
                <Button
                  data-testid="button-next-step-1"
                  variant="secondary"
                  className="shrink-0 font-bold"
                  onClick={() => setStep(2)}
                >
                  الخطوة التالية
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2 — Subscription Entry */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>تفاصيل الاكتتاب (Ektitab)</CardTitle>
            <CardDescription>أدخل عدد الأسهم وطريقة الدفع</CardDescription>
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
                          <FormLabel>عدد الأسهم المطلوبة</FormLabel>
                          <FormControl>
                            <Input data-testid="input-shares" type="number" placeholder="0" {...field} />
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
                          <FormLabel>طريقة الدفع</FormLabel>
                          <FormControl>
                            <select
                              data-testid="select-payment-method"
                              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-ring outline-none"
                              {...field}
                            >
                              <option value="Direct Debit">خصم مباشر (تجميد حساب)</option>
                              <option value="Cash Deposit">إيداع نقدي</option>
                              <option value="Certified Check">شيك معتمد</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Card className="bg-muted/50 border-dashed">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">ملخص الأمر</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">القيمة الاسمية</span>
                        <span className="font-bold">{PAR_VALUE} ج.م</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">مصاريف الإصدار</span>
                        <span className="font-bold">{ISSUE_FEES} ج.م</span>
                      </div>
                      <div className="border-t pt-3 flex justify-between items-center">
                        <span className="font-bold">إجمالي المستحق</span>
                        <span data-testid="text-total-due" className="text-xl font-black text-primary">
                          {totalDue.toLocaleString("ar-EG")} ج.م
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Button data-testid="button-confirm-docs" type="submit" className="px-10">
                  تأكيد ورفع المستندات
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Step 3 — Documentation */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>المستندات المطلوبة</CardTitle>
            <CardDescription>ارفع نسخ المستندات اللازمة لاستكمال الاكتتاب</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                "نسخة البطاقة القومية",
                "نموذج الاكتتاب الموقع",
                "إيصال التحويل البنكي",
                "توكيل رسمي (إن وجد)",
              ].map((doc) => (
                <div
                  key={doc}
                  className="border-2 border-dashed border-border p-5 rounded-xl flex items-center justify-between hover:border-primary/40 transition-colors"
                >
                  <span className="font-bold text-sm">{doc}</span>
                  <label className="cursor-pointer">
                    <input data-testid={`file-${doc}`} type="file" className="hidden" />
                    <span className="flex items-center gap-1.5 bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      رفع
                    </span>
                  </label>
                </div>
              ))}
            </div>
            <Button
              data-testid="button-review-receipt"
              className="mt-2 px-10"
              onClick={() => setStep(4)}
            >
              مراجعة الملخص النهائي
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 4 — Final Receipt */}
      {step === 4 && pendingSubscription && (
        <Card>
          <CardContent className="pt-8">
            <div className="max-w-xl mx-auto text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h2 data-testid="text-subscription-prepared" className="text-2xl font-black">
                  تم تجهيز الاكتتاب
                </h2>
                <p className="text-muted-foreground mt-1">
                  رقم العملية:{" "}
                  <span data-testid="text-tx-id" className="font-mono font-bold text-foreground">
                    {pendingSubscription.id}
                  </span>
                </p>
              </div>

              <Card className="text-right bg-muted/50">
                <CardContent className="pt-5 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">العميل</p>
                    <p className="font-bold">{pendingSubscription.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">الأسهم</p>
                    <p className="font-bold text-primary">
                      {pendingSubscription.requestedShares.toLocaleString("ar-EG")} سهم
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">إجمالي المبلغ</p>
                    <p className="font-bold">{pendingSubscription.amountDue.toLocaleString("ar-EG")} ج.م</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">الحالة</p>
                    <p className="font-bold text-amber-500">في انتظار التحقق</p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3 justify-center">
                <Button variant="outline" data-testid="button-print-receipt">
                  <Printer className="w-4 h-4 ml-2" />
                  طباعة الإيصال
                </Button>
                <Button data-testid="button-submit-hq" onClick={handleFinalSubmit}>
                  <Send className="w-4 h-4 ml-2" />
                  إرسال للمقاصة
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
const RECON_FILTERS = [
  { key: "All", label: "الكل" },
  { key: "Verified", label: "موثق" },
  { key: "Shortfall", label: "عجز" },
  { key: "Pending Payment", label: "قيد الدفع" },
  { key: "Allocated", label: "مخصص" },
  { key: "Refunded", label: "مرتد فائض" },
];

function BackOffice({
  subscriptions,
  onAllocate,
  onRefund,
}: {
  subscriptions: Subscription[];
  onAllocate: () => void;
  onRefund: () => void;
}) {
  const { toast } = useToast();
  const [reconFilter, setReconFilter] = useState("All");

  const filteredRecon = useMemo(() => {
    if (reconFilter === "All") return subscriptions;
    return subscriptions.filter((s) => s.status === reconFilter);
  }, [reconFilter, subscriptions]);

  const totalCash = subscriptions.reduce((sum, s) => sum + s.amountPaid, 0);
  const exceptions = subscriptions.filter((s) => s.status === "Shortfall").length;
  const totalCashDisplay =
    totalCash >= 1_000_000
      ? `${(totalCash / 1_000_000).toFixed(2)}M`
      : totalCash.toLocaleString("ar-EG");

  const STATS = [
    { label: "إجمالي الاكتتابات", value: subscriptions.length, color: "text-foreground" },
    { label: "نسبة التغطية", value: "3.2x", color: "text-green-600" },
    { label: "استثناءات", value: exceptions, color: "text-red-500" },
    { label: "إجمالي النقدية (ج.م)", value: totalCashDisplay, color: "text-primary" },
  ];

  const handleAllocate = () => {
    onAllocate();
    toast({ title: "تم التخصيص", description: "تم معالجة ملف MCDR وتخصيص الأسهم بنسبة 40%." });
  };

  const handleRefund = () => {
    onRefund();
    toast({ title: "رد الفائض", description: "تم تنفيذ رد الفائض لجميع الحسابات المخصصة." });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">مركز العمليات</h2>
          <p className="text-muted-foreground text-sm">المقاصة المركزية والمطابقة — مدير النظام</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" data-testid="button-export-mcdr">
            <FileSpreadsheet className="w-4 h-4 ml-2" />
            تصدير ملف MCDR
          </Button>
          <Button size="sm" data-testid="button-execute-allocation" onClick={handleAllocate}>
            <ArrowLeftRight className="w-4 h-4 ml-2" />
            تنفيذ التخصيص
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-green-500 text-green-600 hover:bg-green-50"
            data-testid="button-process-refund"
            onClick={handleRefund}
          >
            رد الفائض
          </Button>
        </div>
      </div>

      {/* Stats */}
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

      {/* Reconciliation Queue */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <CardTitle>قائمة المطابقة</CardTitle>
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
                  <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-muted-foreground">المستثمر / الرقم القومي</TableHead>
                  <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-muted-foreground">الفرع</TableHead>
                  <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-muted-foreground">المستحق (ج.م)</TableHead>
                  <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-muted-foreground">المدفوع (ج.م)</TableHead>
                  <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-muted-foreground">المخصص</TableHead>
                  <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-muted-foreground">رد الفائض</TableHead>
                  <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-muted-foreground">الحالة</TableHead>
                  <TableHead className="text-center font-black text-[10px] uppercase tracking-widest text-muted-foreground">إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecon.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      لا توجد عمليات
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
                        {sub.amountDue.toLocaleString("ar-EG")}
                      </TableCell>
                      <TableCell className="text-sm text-right font-black text-primary">
                        {sub.amountPaid.toLocaleString("ar-EG")}
                      </TableCell>
                      <TableCell className="text-sm text-right font-bold">
                        {sub.allocatedShares > 0 ? sub.allocatedShares.toLocaleString("ar-EG") : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-right font-bold text-green-600">
                        {sub.refundAmount > 0 ? `${sub.refundAmount.toLocaleString("ar-EG")} ج.م` : "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(sub.status)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-3">
                          <button
                            data-testid={`button-manual-match-${sub.id}`}
                            className="text-primary font-black text-[10px] uppercase hover:underline"
                          >
                            مطابقة يدوية
                          </button>
                          <button
                            data-testid={`button-refund-${sub.id}`}
                            className="text-red-500 font-black text-[10px] uppercase hover:underline"
                          >
                            رد
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Bank Statement Integration */}
          <div className="p-6 bg-foreground text-background rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-primary-foreground">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="font-black text-base">تكامل كشف الحساب البنكي</p>
                <p className="text-background/60 text-sm max-w-xs">
                  ارفع ملف MT940 أو Excel لمطابقة الأرصدة تلقائيًا مع الاكتتابات.
                </p>
              </div>
            </div>
            <button
              data-testid="button-upload-statement"
              className="bg-background text-foreground px-8 py-3 rounded-xl font-black text-sm hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              رفع كشف الحساب
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
  const [userRole, setUserRole] = useState<"FrontOffice" | "BackOffice">("FrontOffice");
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(INITIAL_SUBSCRIPTIONS);

  const handleNewSubscription = (sub: Subscription) => {
    setSubscriptions((prev) => [sub, ...prev]);
  };

  const handleAllocate = () => {
    setSubscriptions((prev) =>
      prev.map((s) => {
        if (s.status !== "Verified") return s;
        return {
          ...s,
          allocatedShares: Math.floor(s.requestedShares * 0.4),
          status: "Allocated" as const,
        };
      })
    );
  };

  const handleRefund = () => {
    setSubscriptions((prev) =>
      prev.map((s) => {
        if (s.status !== "Allocated") return s;
        return {
          ...s,
          refundAmount: (s.requestedShares - s.allocatedShares) * PAR_VALUE,
          status: "Refunded" as const,
        };
      })
    );
  };

  return (
    <div dir="rtl" className="min-h-[100dvh] bg-background font-sans">
      <header className="bg-card border-b px-6 py-4 sticky top-0 z-10 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground p-2 rounded-md">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              QNB نظام إدارة الاكتتابات
            </h1>
            <p className="text-xs text-muted-foreground">
              شركة التكنولوجيا المتقدمة — اكتتاب زيادة رأس مال
            </p>
          </div>
        </div>

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
            الفرع (Front Office)
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
            المقاصة (Back Office)
          </button>
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
