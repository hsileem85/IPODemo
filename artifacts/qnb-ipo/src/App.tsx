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
  Users,
  ShieldCheck,
  ClipboardList,
  UserPlus,
  ScrollText,
  LogIn,
  LockKeyhole,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Translations
// ─────────────────────────────────────────────────────────────────────────────
type Lang = "ar" | "en";
type AuthMode = "login" | "forgot";

const T = {
  ar: {
    appTitle: "QNB نظام إدارة الاكتتابات",
    appSubtitle: "شركة التكنولوجيا المتقدمة — اكتتاب زيادة رأس مال",
    roleFront: "الفرع",
    roleBack: "المقاصة",
    roleSysAdmin: "مدير النظام",
    loginTitle: "تسجيل الدخول",
    loginDesc: "استخدم بيانات الاعتماد الافتراضية للدخول إلى النظام",
    usernameLabelLogin: "اسم المستخدم",
    passwordLabelLogin: "كلمة المرور",
    usernamePlaceholderLogin: "admin",
    passwordPlaceholderLogin: "12345678",
    loginBtn: "دخول",
    forgotPassword: "نسيت كلمة المرور؟",
    forgotTitle: "استعادة كلمة المرور",
    forgotDesc: "ادخل اسم المستخدم لعرض كلمة المرور الافتراضية",
    showPassword: "عرض كلمة المرور",
    backToLogin: "العودة لتسجيل الدخول",
    authHint: "البيانات الافتراضية: admin / 12345678",
    loginError: "اسم المستخدم أو كلمة المرور غير صحيحة",

    // Stepper
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

    // Back Office header
    opsHubTitle: "مركز العمليات",
    opsHubDesc: "المقاصة المركزية والمطابقة — مدير العمليات",
    exportData: "تصدير البيانات",
    executeAlloc: "تنفيذ التخصيص",
    exportBankFile: "تصدير ملف التحويلات",

    // Back Office sub-tabs
    boTabRecon: "المطابقة",
    boTabMCDR: "أهلية MCDR",
    boTabAlloc: "نتائج التخصيص",
    boTabRefunds: "إعادة الأموال",

    // Reconciliation
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
    bankDesc: "ارفع ملف MT940 أو Excel لمطابقة الأرصدة تلقائيًا.",
    uploadStatement: "رفع كشف الحساب",

    // MCDR
    mcdrTitle: "سجل أهلية المستثمرين (MCDR)",
    colName: "اسم المستثمر",
    colNatId: "الرقم القومي",
    colUnified: "الكود الموحد",
    colEligible: "الأسهم المؤهلة",
    colSubscribed: "الأسهم المكتتبة",
    colBalance: "الرصيد (ج.م)",
    mcdrStatusPartial: "جزئي",
    mcdrStatusFull: "كامل",

    // Allocation
    allocTitle: "نتائج التخصيص",
    allocBanner: "تم تنفيذ التخصيص بنجاح",
    allocRatio: "نسبة التخصيص الإجمالية",
    proceedRefunds: "الانتقال لإعادة الأموال",
    colRequested: "الأسهم المطلوبة",
    colAllocShares: "الأسهم المخصصة",
    colRatioPct: "النسبة %",
    colTotalPaid: "المدفوع (ج.م)",
    colRefundable: "المسترد (ج.م)",

    // Refunds
    refundsTitle: "معالجة استرداد الأموال",
    colRefundAmt: "مبلغ الاسترداد (ج.م)",
    colMethod: "طريقة الصرف",
    colIBAN: "IBAN",
    refStatusTransferred: "تم التحويل",
    refStatusPendingPickup: "في انتظار الاستلام",
    refStatusPending: "قيد المعالجة",

    // Stats
    stat0: "إجمالي الاكتتابات",
    stat1: "نسبة التغطية",
    stat2: "استثناءات",
    stat3: "إجمالي النقدية (ج.م)",

    // Status badges
    statusPending: "قيد الدفع",
    statusVerified: "موثق",
    statusShortfall: "عجز",
    statusAllocated: "مخصص",
    statusRefunded: "مرتد فائض",

    // System Admin
    adminTitle: "إدارة النظام",
    adminDesc: "إدارة المستخدمين والصلاحيات (RBAC)",
    adminTabUsers: "المستخدمون",
    adminTabCreate: "إنشاء مستخدم",
    adminTabAudit: "سجل التدقيق",
    backToUsers: "العودة للمستخدمين",
    addNewUser: "إضافة مستخدم جديد",

    // Users list
    usersTitle: "قائمة المستخدمين والصلاحيات",
    searchPlaceholder: "بحث بالاسم أو اسم المستخدم...",
    allRoles: "كل الأدوار والحالات",
    colUserDetails: "بيانات المستخدم",
    colRole: "الدور المحدد",
    colBranchUser: "الفرع",
    editAction: "تعديل",
    suspendAction: "تعليق",
    userStatusActive: "نشط",
    userStatusSuspended: "موقوف",
    roleFA: "موظف الفرع",
    roleBO: "موظف المقاصة",
    roleSA: "مدير النظام",

    // Create User
    createUserTitle: "إنشاء مستخدم جديد",
    createUserDesc: "أدخل بيانات المستخدم الجديد وحدد صلاحياته",
    fullNameLabel: "الاسم الكامل",
    fullNamePlaceholder: "مثال: علي محمود",
    usernameLabel: "اسم المستخدم",
    usernamePlaceholder: "مثال: ali.m",
    emailLabel: "البريد الإلكتروني",
    emailPlaceholder: "مثال: ali@qnb.com",
    systemRoleLabel: "الدور في النظام",
    branchDeptLabel: "الفرع / القسم",
    branchCairoMain: "Cairo-Main",
    branchAlex: "Alex-Branch",
    branchHQ: "HQ Operations",
    saveUser: "حفظ المستخدم",
    cancel: "إلغاء",
    requiredField: "هذا الحقل مطلوب",

    // Audit Logs
    auditTitle: "سجل أحداث النظام",
    auditDesc: "تتبع كامل لأفعال المستخدمين والتغييرات في النظام",
    colTimestamp: "التوقيت",
    colUser: "المستخدم",
    colUserRole: "الدور",
    colActionAudit: "الإجراء",
    colDetails: "التفاصيل",
    colIP: "عنوان IP",

    // Toast
    toastSentTitle: "تم الإرسال للمقاصة",
    toastSentDesc: (id: string) => `تم تسجيل الاكتتاب ${id} بنجاح.`,
    toastAllocTitle: "تم التخصيص",
    toastAllocDesc: "تم معالجة ملف MCDR وتخصيص الأسهم بنسبة 45%.",
    toastRefundTitle: "رد الفائض",
    toastRefundDesc: "تم تنفيذ رد الفائض لجميع الحسابات المخصصة.",
    toastUserCreated: "تم إنشاء المستخدم بنجاح.",
    toastUserCreatedDesc: (name: string) => `تمت إضافة ${name} إلى النظام.`,

    sharesError: "يجب إدخال عدد أسهم صحيح",
    eventSOO: "Sinawy Olive Oil IPO (SOO)",
    eventCAP: "زيادة رأس مال - بنك التكنولوجيا المتقدمة",
    eventRIGHTS: "أسهم أولوية - دلتا للتأمين",
    egp: "ج.م",
    shares: "سهم",
  },
  en: {
    appTitle: "QNB IPO Management System",
    appSubtitle: "Advanced Technology Co. — Capital Increase IPO",
    roleFront: "Branch",
    roleBack: "Clearing",
    roleSysAdmin: "SysAdmin",
    loginTitle: "Sign In",
    loginDesc: "Use the default credentials to enter the system",
    usernameLabelLogin: "Username",
    passwordLabelLogin: "Password",
    usernamePlaceholderLogin: "admin",
    passwordPlaceholderLogin: "12345678",
    loginBtn: "Login",
    forgotPassword: "Forgot password?",
    forgotTitle: "Password Recovery",
    forgotDesc: "Enter the username to reveal the default password",
    showPassword: "Show Password",
    backToLogin: "Back to Login",
    authHint: "Default credentials: admin / 12345678",
    loginError: "Invalid username or password",

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
    opsHubDesc: "Central Clearing & Reconciliation — Operations Manager",
    exportData: "Export Current Data",
    executeAlloc: "Execute Allocation",
    exportBankFile: "Export Bank Transfer File",

    boTabRecon: "Reconciliation",
    boTabMCDR: "MCDR Eligibility",
    boTabAlloc: "Allocation Results",
    boTabRefunds: "Refunds Processing",

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

    mcdrTitle: "MCDR Investor Eligibility Register",
    colName: "Investor Name",
    colNatId: "National ID",
    colUnified: "Unified Code",
    colEligible: "Eligible Shares",
    colSubscribed: "Subscribed Shares",
    colBalance: "Balance (EGP)",
    mcdrStatusPartial: "Partial",
    mcdrStatusFull: "Full",

    allocTitle: "Client Allocation Results",
    allocBanner: "Allocation Executed Successfully",
    allocRatio: "Overall Allocation Ratio",
    proceedRefunds: "Proceed to Refunds →",
    colRequested: "Requested Shares",
    colAllocShares: "Allocated Shares",
    colRatioPct: "% Ratio",
    colTotalPaid: "Total Paid (EGP)",
    colRefundable: "Refundable (EGP)",

    refundsTitle: "Post-Allocation Refunds Processing",
    colRefundAmt: "Refund Amount (EGP)",
    colMethod: "Disbursement Method",
    colIBAN: "Bank Details (IBAN)",
    refStatusTransferred: "Transferred",
    refStatusPendingPickup: "Pending Pickup",
    refStatusPending: "Pending Processing",

    stat0: "Total Subscriptions",
    stat1: "Coverage Ratio",
    stat2: "Exceptions",
    stat3: "Total Cash (EGP)",

    statusPending: "Pending Payment",
    statusVerified: "Verified",
    statusShortfall: "Shortfall",
    statusAllocated: "Allocated",
    statusRefunded: "Refunded",

    adminTitle: "System Administration",
    adminDesc: "User Management & Role-Based Access Control (RBAC)",
    adminTabUsers: "Users",
    adminTabCreate: "Create User",
    adminTabAudit: "Audit Logs",
    backToUsers: "← Back to Users",
    addNewUser: "+ Add New User",

    usersTitle: "Access Control & Users List",
    searchPlaceholder: "Search name or username...",
    allRoles: "All Roles & Status",
    colUserDetails: "User Details",
    colRole: "Assigned Role",
    colBranchUser: "Branch",
    editAction: "Edit",
    suspendAction: "Suspend",
    userStatusActive: "Active",
    userStatusSuspended: "Suspended",
    roleFA: "Front Office Agent",
    roleBO: "Back Office Ops",
    roleSA: "System Admin",

    createUserTitle: "Create New User Profile",
    createUserDesc: "Enter the new user's details and assign their system role",
    fullNameLabel: "Full Name",
    fullNamePlaceholder: "e.g. Ali Mahmoud",
    usernameLabel: "Username",
    usernamePlaceholder: "e.g. ali.m",
    emailLabel: "Email",
    emailPlaceholder: "e.g. ali@qnb.com",
    systemRoleLabel: "System Role",
    branchDeptLabel: "Branch / Department",
    branchCairoMain: "Cairo-Main",
    branchAlex: "Alex-Branch",
    branchHQ: "HQ Operations",
    saveUser: "Save User",
    cancel: "Cancel",
    requiredField: "This field is required",

    auditTitle: "System Event Audit Log",
    auditDesc: "Full audit trail of user actions and system changes",
    colTimestamp: "Timestamp",
    colUser: "User",
    colUserRole: "Role",
    colActionAudit: "Action",
    colDetails: "Details",
    colIP: "IP Address",

    toastSentTitle: "Submitted to Clearing",
    toastSentDesc: (id: string) => `Subscription ${id} registered successfully.`,
    toastAllocTitle: "Allocation Complete",
    toastAllocDesc: "MCDR file processed — 45% allocation applied.",
    toastRefundTitle: "Refunds Processed",
    toastRefundDesc: "Excess refunds executed for all allocated accounts.",
    toastUserCreated: "User created successfully.",
    toastUserCreatedDesc: (name: string) => `${name} has been added to the system.`,

    sharesError: "Please enter a valid number of shares",
    eventSOO: "Sinawy Olive Oil IPO (SOO)",
    eventCAP: "Capital Increase — Advanced Technology Bank",
    eventRIGHTS: "Rights Issue — Delta Insurance",
    egp: "EGP",
    shares: "shares",
  },
} as const;

type Translations = typeof T.ar;

// ─────────────────────────────────────────────────────────────────────────────
// Language Context
// ─────────────────────────────────────────────────────────────────────────────
const LangContext = createContext<{ lang: Lang; t: Translations; isRTL: boolean }>({
  lang: "ar",
  t: T.ar,
  isRTL: true,
});
function useLang() { return useContext(LangContext); }

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Subscription {
  id: string; name: string; nationalId: string; account: string;
  unifiedCode: string; requestedShares: number; amountDue: number;
  amountPaid: number; allocatedShares: number; refundAmount: number;
  status: "Pending Payment" | "Verified" | "Shortfall" | "Allocated" | "Refunded";
  branch: string;
}
interface MCDRClient {
  id: number; name: string; unifiedCode: string; nationalId: string;
  eligibleShares: number; subscribedShares: number; balanceEGP: number;
  status: "Partial" | "Full";
}
interface AllocationResult {
  id: string; name: string; requested: number; allocated: number;
  allocationPct: string; paidEGP: number; refundEGP: number;
}
interface Refund {
  id: string; name: string; amount: number; method: string; iban: string;
  status: "Pending Processing" | "Transferred" | "Pending Pickup";
}
interface SystemUser {
  id: string; name: string; username: string;
  role: "Front Office Agent" | "Back Office Ops" | "System Admin";
  branch: string; status: "Active" | "Suspended";
}
interface AuditLog {
  id: number; timestamp: string; user: string; role: string;
  action: string; details: string; ip: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const PAR_VALUE = 1.0;
const ISSUE_FEES = 0.25;
const TOTAL_PER_SHARE = PAR_VALUE + ISSUE_FEES;

const MOCK_CLIENTS: Record<string, { name: string; unifiedCode: string; account: string }> = {
  "111": { name: "حسين سليم محمد علي / Hussein Salim Mohamed", unifiedCode: "8800318", account: "100003456" },
  "29001011234567": { name: "أحمد محمد علي / Ahmed Mohamed Ali", unifiedCode: "7700123", account: "100234567" },
  "29505051234568": { name: "سارة محمود حسن / Sara Mahmoud Hassan", unifiedCode: "7700456", account: "100234568" },
};

const INITIAL_SUBSCRIPTIONS: Subscription[] = [
  { id: "TX-9901", name: "أحمد محمد علي", nationalId: "29001011234567", account: "100234567", unifiedCode: "7700123", requestedShares: 10000, amountDue: 12500, amountPaid: 12500, allocatedShares: 0, refundAmount: 0, status: "Verified", branch: "Cairo-Main" },
  { id: "TX-9902", name: "سارة محمود حسن", nationalId: "29505051234568", account: "100234568", unifiedCode: "7700456", requestedShares: 4000, amountDue: 5000, amountPaid: 4500, allocatedShares: 0, refundAmount: 0, status: "Shortfall", branch: "Alex-Branch" },
  { id: "TX-9903", name: "حسين سليم محمد", nationalId: "111", account: "100003456", unifiedCode: "8800318", requestedShares: 15000, amountDue: 18750, amountPaid: 0, allocatedShares: 0, refundAmount: 0, status: "Pending Payment", branch: "Giza-Hub" },
];

const INITIAL_MCDR: MCDRClient[] = [
  { id: 1, name: "حسين سليم محمد علي", unifiedCode: "8800318", nationalId: "28512111234567", eligibleShares: 10000, subscribedShares: 5000, balanceEGP: 150000, status: "Partial" },
  { id: 2, name: "رنا الشافعي إبراهيم", unifiedCode: "7744312", nationalId: "28805051234568", eligibleShares: 2000, subscribedShares: 2000, balanceEGP: 50000, status: "Full" },
];

const INITIAL_ALLOCATION: AllocationResult[] = [
  { id: "AL-001", name: "حسين سليم محمد علي", requested: 10000, allocated: 4500, allocationPct: "45%", paidEGP: 12500, refundEGP: 6875 },
  { id: "AL-002", name: "رنا الشافعي إبراهيم", requested: 2000, allocated: 900, allocationPct: "45%", paidEGP: 2500, refundEGP: 1375 },
  { id: "AL-003", name: "أحمد محمد علي", requested: 5000, allocated: 2250, allocationPct: "45%", paidEGP: 6250, refundEGP: 3437.5 },
];

const INITIAL_REFUNDS: Refund[] = [
  { id: "RF-001", name: "حسين سليم محمد علي", amount: 6875, method: "Bank Transfer", iban: "EG290011...", status: "Pending Processing" },
  { id: "RF-002", name: "رنا الشافعي إبراهيم", amount: 1375, method: "Bank Transfer", iban: "EG993321...", status: "Transferred" },
  { id: "RF-003", name: "أحمد محمد علي", amount: 3437.5, method: "Cash at Branch", iban: "N/A", status: "Pending Pickup" },
];

const INITIAL_USERS: SystemUser[] = [
  { id: "USR-001", name: "أحمد حسن", username: "ahmed.h", role: "Front Office Agent", branch: "Cairo-Main", status: "Active" },
  { id: "USR-002", name: "محمود سعد", username: "mahmoud.s", role: "Back Office Ops", branch: "HQ", status: "Active" },
  { id: "USR-003", name: "حسين سليم", username: "hsileem", role: "System Admin", branch: "HQ", status: "Active" },
];

const INITIAL_AUDIT: AuditLog[] = [
  { id: 1, timestamp: "2026-05-13 09:30:12", user: "hsileem", role: "System Admin", action: "System Backup", details: "Triggered manual DB backup", ip: "192.168.1.10" },
  { id: 2, timestamp: "2026-05-13 10:15:00", user: "ahmed.h", role: "Front Office Agent", action: "Create Subscription", details: "Created TX-9904 for client ID 290...", ip: "10.0.5.21" },
  { id: 3, timestamp: "2026-05-13 11:45:33", user: "mahmoud.s", role: "Back Office Ops", action: "MCDR Upload", details: "Uploaded daily MCDR excel file (240 records)", ip: "10.0.1.55" },
  { id: 4, timestamp: "2026-05-13 13:02:10", user: "hsileem", role: "System Admin", action: "Suspend User", details: "Suspended user sara.k", ip: "192.168.1.10" },
];

const queryClient = new QueryClient();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function SubBadge({ status }: { status: Subscription["status"] }) {
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

function BoTab({ id, active, onClick, children }: { id: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      data-testid={`bo-tab-${id}`}
      onClick={onClick}
      className={`text-sm font-black px-4 py-2 rounded-xl transition-all ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
    >
      {children}
    </button>
  );
}

function AdminTab({ id, active, onClick, icon: Icon, children }: { id: string; active: boolean; onClick: () => void; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <button
      data-testid={`admin-tab-${id}`}
      onClick={onClick}
      className={`flex items-center gap-2 text-sm font-black px-4 py-2 rounded-xl transition-all ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
    >
      <Icon className="w-4 h-4" />
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Front Office
// ─────────────────────────────────────────────────────────────────────────────
function FrontOffice({ onNewSubscription }: { onNewSubscription: (s: Subscription) => void }) {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [nationalIdInput, setNationalIdInput] = useState("");
  const [foundClient, setFoundClient] = useState<{ name: string; unifiedCode: string; account: string } | null>(null);
  const [pendingSub, setPendingSub] = useState<Subscription | null>(null);
  const numLocale = lang === "ar" ? "ar-EG" : "en-US";

  const STEPS = [t.step1, t.step2, t.step3, t.step4];
  const DOCS = [t.doc1, t.doc2, t.doc3, t.doc4];
  const EVENTS = [{ value: "SOO", label: t.eventSOO }, { value: "CAP", label: t.eventCAP }, { value: "RIGHTS", label: t.eventRIGHTS }];

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

  const onSubmitStep2 = (values: z.infer<typeof sharesSchema>) => {
    if (!foundClient) return;
    const sub: Subscription = {
      id: "TX-" + Math.floor(1000 + Math.random() * 9000),
      name: foundClient.name, nationalId: nationalIdInput,
      account: foundClient.account, unifiedCode: foundClient.unifiedCode,
      requestedShares: values.requestedShares,
      amountDue: values.requestedShares * TOTAL_PER_SHARE,
      amountPaid: values.requestedShares * TOTAL_PER_SHARE,
      allocatedShares: 0, refundAmount: 0, status: "Verified", branch: "Cairo-Main",
    };
    setPendingSub(sub);
    setStep(3);
  };

  const handleFinalSubmit = () => {
    if (!pendingSub) return;
    onNewSubscription(pendingSub);
    toast({ title: t.toastSentTitle, description: t.toastSentDesc(pendingSub.id) });
    setStep(1); setNationalIdInput(""); setFoundClient(null); setPendingSub(null); form.reset();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {STEPS.map((label, i) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <button type="button" data-testid={`step-button-${i + 1}`}
                  onClick={() => { if (i + 1 < step) setStep(i + 1); }}
                  className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm transition-all border-2 ${step === i + 1 ? "bg-primary border-primary/20 text-primary-foreground scale-110 shadow-md" : step > i + 1 ? "bg-green-500 border-green-200 text-white" : "bg-muted border-transparent text-muted-foreground"}`}
                >
                  {step > i + 1 ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                </button>
                <span className={`text-[10px] font-bold tracking-wide text-center max-w-[80px] leading-tight ${step === i + 1 ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>{t.kycTitle}</CardTitle><CardDescription>{t.kycDesc}</CardDescription></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">{t.nationalIdLabel}</label>
                <Input data-testid="input-national-id" value={nationalIdInput} onChange={(e) => { setNationalIdInput(e.target.value); setFoundClient(MOCK_CLIENTS[e.target.value] ?? null); }} placeholder={t.nationalIdPlaceholder} maxLength={14} dir="ltr" />
                <p className="text-xs text-muted-foreground">{t.nationalIdHint}</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">{t.eventLabel}</label>
                <select data-testid="select-subscription-event" className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-ring outline-none">
                  {EVENTS.map((ev) => <option key={ev.value} value={ev.value}>{ev.label}</option>)}
                </select>
              </div>
            </div>
            {foundClient && (
              <div data-testid="panel-client-kyc" className="bg-primary text-primary-foreground p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg">
                <div>
                  <p className="text-primary-foreground/70 text-xs font-bold uppercase tracking-widest mb-1">{t.mcdrVerified}</p>
                  <h3 className="text-xl font-bold leading-snug">{foundClient.name}</h3>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-primary-foreground/80">
                    <span>{t.unifiedCode}: <span className="font-mono text-primary-foreground">{foundClient.unifiedCode}</span></span>
                    <span>{t.accountNo}: <span className="font-mono text-primary-foreground">{foundClient.account}</span></span>
                    <span className="bg-white/20 px-2 py-0.5 rounded font-bold text-xs">{t.activeStatus}</span>
                  </div>
                </div>
                <Button data-testid="button-next-step-1" variant="secondary" className="shrink-0 font-bold" onClick={() => setStep(2)}>{t.nextStep}</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader><CardTitle>{t.ektitabTitle}</CardTitle><CardDescription>{t.ektitabDesc}</CardDescription></CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitStep2)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-4">
                    <FormField control={form.control} name="requestedShares" render={({ field }) => (
                      <FormItem><FormLabel>{t.sharesLabel}</FormLabel><FormControl><Input data-testid="input-shares" type="number" placeholder="0" dir="ltr" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                      <FormItem><FormLabel>{t.paymentLabel}</FormLabel><FormControl>
                        <select data-testid="select-payment-method" className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-ring outline-none" {...field}>
                          <option value="Direct Debit">{t.payDirect}</option>
                          <option value="Cash Deposit">{t.payCash}</option>
                          <option value="Certified Check">{t.payCheck}</option>
                        </select>
                      </FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <Card className="bg-muted/50 border-dashed">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t.orderSummary}</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">{t.parValue}</span><span className="font-bold">{PAR_VALUE} {t.egp}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">{t.issueFees}</span><span className="font-bold">{ISSUE_FEES} {t.egp}</span></div>
                      <div className="border-t pt-3 flex justify-between items-center">
                        <span className="font-bold">{t.totalDue}</span>
                        <span data-testid="text-total-due" className="text-xl font-black text-primary">{totalDue.toLocaleString(numLocale)} {t.egp}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <Button data-testid="button-confirm-docs" type="submit" className="px-10">{t.confirmDocs}</Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader><CardTitle>{t.docsTitle}</CardTitle><CardDescription>{t.docsDesc}</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DOCS.map((doc) => (
                <div key={doc} className="border-2 border-dashed border-border p-5 rounded-xl flex items-center justify-between hover:border-primary/40 transition-colors">
                  <span className="font-bold text-sm">{doc}</span>
                  <label className="cursor-pointer">
                    <input data-testid={`file-${doc}`} type="file" className="hidden" />
                    <span className="flex items-center gap-1.5 bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"><Upload className="w-3.5 h-3.5" />{t.uploadBtn}</span>
                  </label>
                </div>
              ))}
            </div>
            <Button data-testid="button-review-receipt" className="mt-2 px-10" onClick={() => setStep(4)}>{t.reviewReceipt}</Button>
          </CardContent>
        </Card>
      )}

      {step === 4 && pendingSub && (
        <Card>
          <CardContent className="pt-8">
            <div className="max-w-xl mx-auto text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto"><CheckCircle2 className="w-8 h-8" /></div>
              <div>
                <h2 data-testid="text-subscription-prepared" className="text-2xl font-black">{t.subPrepared}</h2>
                <p className="text-muted-foreground mt-1">{t.txPrefix}: <span data-testid="text-tx-id" className="font-mono font-bold text-foreground">{pendingSub.id}</span></p>
              </div>
              <Card className="bg-muted/50 text-right">
                <CardContent className="pt-5 grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{t.clientLabel}</p><p className="font-bold">{pendingSub.name}</p></div>
                  <div><p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{t.sharesCol}</p><p className="font-bold text-primary">{pendingSub.requestedShares.toLocaleString(numLocale)} {t.shares}</p></div>
                  <div><p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{t.totalAmtLabel}</p><p className="font-bold">{pendingSub.amountDue.toLocaleString(numLocale)} {t.egp}</p></div>
                  <div><p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{t.statusLabel}</p><p className="font-bold text-amber-500">{t.awaitingVerif}</p></div>
                </CardContent>
              </Card>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" data-testid="button-print-receipt"><Printer className="w-4 h-4 mr-2" />{t.printReceipt}</Button>
                <Button data-testid="button-submit-hq" onClick={handleFinalSubmit}><Send className="w-4 h-4 mr-2" />{t.submitHQ}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Back Office
// ─────────────────────────────────────────────────────────────────────────────
function BackOffice({ subscriptions, onAllocate, onRefund }: {
  subscriptions: Subscription[];
  onAllocate: () => void;
  onRefund: () => void;
}) {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [boTab, setBoTab] = useState<"Reconciliation" | "MCDR" | "Allocation" | "Refunds">("Reconciliation");
  const [reconFilter, setReconFilter] = useState("All");
  const numLocale = lang === "ar" ? "ar-EG" : "en-US";

  const RECON_FILTERS = [
    { key: "All", label: t.filterAll }, { key: "Verified", label: t.filterVerified },
    { key: "Shortfall", label: t.filterShortfall }, { key: "Pending Payment", label: t.filterPending },
    { key: "Allocated", label: t.filterAllocated }, { key: "Refunded", label: t.filterRefunded },
  ];

  const filteredRecon = useMemo(() => reconFilter === "All" ? subscriptions : subscriptions.filter((s) => s.status === reconFilter), [reconFilter, subscriptions]);
  const totalCash = subscriptions.reduce((sum, s) => sum + s.amountPaid, 0);
  const exceptions = subscriptions.filter((s) => s.status === "Shortfall").length;
  const totalCashDisplay = totalCash >= 1_000_000 ? `${(totalCash / 1_000_000).toFixed(2)}M` : totalCash.toLocaleString(numLocale);

  const STATS = [
    { label: t.stat0, value: subscriptions.length, color: "text-foreground" },
    { label: t.stat1, value: "3.2x", color: "text-green-600" },
    { label: t.stat2, value: exceptions, color: "text-red-500" },
    { label: t.stat3, value: totalCashDisplay, color: "text-primary" },
  ];

  const handleAllocate = () => { onAllocate(); toast({ title: t.toastAllocTitle, description: t.toastAllocDesc }); setBoTab("Allocation"); };
  const handleRefund = () => { onRefund(); toast({ title: t.toastRefundTitle, description: t.toastRefundDesc }); };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">{t.opsHubTitle}</h2>
          <p className="text-muted-foreground text-sm">{t.opsHubDesc}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" data-testid="button-export-data"><FileSpreadsheet className="w-4 h-4 mr-2" />{t.exportData}</Button>
          {boTab !== "Allocation" && boTab !== "Refunds" && (
            <Button size="sm" data-testid="button-execute-allocation" onClick={handleAllocate}><ArrowLeftRight className="w-4 h-4 mr-2" />{t.executeAlloc}</Button>
          )}
          {boTab === "Refunds" && (
            <Button size="sm" variant="outline" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50" data-testid="button-export-bank" onClick={handleRefund}>{t.exportBankFile}</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATS.map((stat, i) => (
          <Card key={i}><CardContent className="pt-5 pb-5 text-center">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            <p data-testid={`stat-${i}`} className={`text-3xl font-black mt-1 ${stat.color}`}>{stat.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border pb-4">
        <BoTab id="Reconciliation" active={boTab === "Reconciliation"} onClick={() => setBoTab("Reconciliation")}>{t.boTabRecon}</BoTab>
        <BoTab id="MCDR" active={boTab === "MCDR"} onClick={() => setBoTab("MCDR")}>{t.boTabMCDR}</BoTab>
        <BoTab id="Allocation" active={boTab === "Allocation"} onClick={() => setBoTab("Allocation")}>{t.boTabAlloc}</BoTab>
        <BoTab id="Refunds" active={boTab === "Refunds"} onClick={() => setBoTab("Refunds")}>{t.boTabRefunds}</BoTab>
      </div>

      {/* Reconciliation */}
      {boTab === "Reconciliation" && (
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <CardTitle>{t.reconTitle}</CardTitle>
              <div className="flex bg-muted p-1 rounded-xl gap-1 flex-wrap">
                {RECON_FILTERS.map(({ key, label }) => (
                  <button key={key} data-testid={`filter-${key}`} onClick={() => setReconFilter(key)}
                    className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${reconFilter === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
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
                      <TableHead key={i} className={`font-black text-[10px] uppercase tracking-widest text-muted-foreground ${i === 7 ? "text-center" : "text-right"}`}>{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecon.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">{t.noRecords}</TableCell></TableRow>
                  ) : filteredRecon.map((sub) => (
                    <TableRow key={sub.id} data-testid={`row-sub-${sub.id}`} className="hover:bg-muted/30 transition-colors">
                      <TableCell><p className="font-bold text-sm leading-tight">{sub.name}</p><p className="text-xs font-mono text-muted-foreground mt-0.5">{sub.nationalId}</p></TableCell>
                      <TableCell className="text-sm font-bold text-muted-foreground">{sub.branch}</TableCell>
                      <TableCell className="text-sm text-right font-bold text-muted-foreground">{sub.amountDue.toLocaleString(numLocale)}</TableCell>
                      <TableCell className="text-sm text-right font-black text-primary">{sub.amountPaid.toLocaleString(numLocale)}</TableCell>
                      <TableCell className="text-sm text-right font-bold">{sub.allocatedShares > 0 ? sub.allocatedShares.toLocaleString(numLocale) : "-"}</TableCell>
                      <TableCell className="text-sm text-right font-bold text-green-600">{sub.refundAmount > 0 ? `${sub.refundAmount.toLocaleString(numLocale)} ${t.egp}` : "-"}</TableCell>
                      <TableCell><SubBadge status={sub.status} /></TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-3">
                          <button data-testid={`button-manual-match-${sub.id}`} className="text-primary font-black text-[10px] uppercase hover:underline">{t.manualMatch}</button>
                          <button data-testid={`button-refund-${sub.id}`} className="text-red-500 font-black text-[10px] uppercase hover:underline">{t.refundAction}</button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="p-6 bg-foreground text-background rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-primary-foreground"><Upload className="w-5 h-5" /></div>
                <div><p className="font-black text-base">{t.bankTitle}</p><p className="text-background/60 text-sm max-w-xs">{t.bankDesc}</p></div>
              </div>
              <button data-testid="button-upload-statement" className="bg-background text-foreground px-8 py-3 rounded-xl font-black text-sm hover:bg-primary hover:text-primary-foreground transition-colors">{t.uploadStatement}</button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MCDR Eligibility */}
      {boTab === "MCDR" && (
        <Card>
          <CardHeader><CardTitle>{t.mcdrTitle}</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    {[t.colName, t.colNatId, t.colUnified, t.colEligible, t.colSubscribed, t.colBalance, t.colStatus].map((col) => (
                      <TableHead key={col} className="font-black text-[10px] uppercase tracking-widest text-muted-foreground text-right">{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {INITIAL_MCDR.map((c) => (
                    <TableRow key={c.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-bold text-sm">{c.name}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{c.nationalId}</TableCell>
                      <TableCell className="text-sm font-mono font-bold">{c.unifiedCode}</TableCell>
                      <TableCell className="text-sm text-right font-bold">{c.eligibleShares.toLocaleString(numLocale)}</TableCell>
                      <TableCell className="text-sm text-right font-black text-primary">{c.subscribedShares.toLocaleString(numLocale)}</TableCell>
                      <TableCell className="text-sm text-right font-bold">{c.balanceEGP.toLocaleString(numLocale)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={c.status === "Full" ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"}>
                          {c.status === "Full" ? t.mcdrStatusFull : t.mcdrStatusPartial}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Allocation Results */}
      {boTab === "Allocation" && (
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex-1">
                <p className="text-primary font-black text-base">{t.allocBanner}</p>
                <p className="text-foreground/70 text-sm mt-1">{t.allocRatio}: <span className="font-black text-xl text-foreground">45.0%</span></p>
              </div>
              <Button size="sm" onClick={() => setBoTab("Refunds")}>{t.proceedRefunds}</Button>
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="mb-4 text-base">{t.allocTitle}</CardTitle>
            <div className="overflow-x-auto rounded-xl border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary/5">
                    {[t.colName, t.colRequested, t.colAllocShares, t.colRatioPct, t.colTotalPaid, t.colRefundable].map((col) => (
                      <TableHead key={col} className="font-black text-[10px] uppercase tracking-widest text-primary/70 text-right">{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {INITIAL_ALLOCATION.map((res) => (
                    <TableRow key={res.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-bold text-sm">{res.name}</TableCell>
                      <TableCell className="text-sm text-right font-bold text-muted-foreground">{res.requested.toLocaleString(numLocale)}</TableCell>
                      <TableCell className="text-sm text-right font-black text-primary">{res.allocated.toLocaleString(numLocale)}</TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">{res.allocationPct}</Badge></TableCell>
                      <TableCell className="text-sm text-right font-bold text-muted-foreground">{res.paidEGP.toLocaleString(numLocale)}</TableCell>
                      <TableCell className="text-sm text-right font-black text-red-500">{res.refundEGP.toLocaleString(numLocale)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Refunds Processing */}
      {boTab === "Refunds" && (
        <Card>
          <CardHeader><CardTitle>{t.refundsTitle}</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="bg-emerald-50/50 dark:bg-emerald-900/10">
                    {[t.colName, t.colRefundAmt, t.colMethod, t.colIBAN, t.colStatus].map((col) => (
                      <TableHead key={col} className="font-black text-[10px] uppercase tracking-widest text-emerald-600 text-right">{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {INITIAL_REFUNDS.map((ref) => (
                    <TableRow key={ref.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-bold text-sm">{ref.name}</TableCell>
                      <TableCell className="text-sm text-right font-black text-emerald-600">{ref.amount.toLocaleString(numLocale)} {t.egp}</TableCell>
                      <TableCell className="text-sm font-bold text-muted-foreground">{ref.method}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{ref.iban}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          ref.status === "Transferred" ? "bg-green-500/10 text-green-600 border-green-500/20" :
                          ref.status === "Pending Pickup" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                          "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        }>
                          {ref.status === "Transferred" ? t.refStatusTransferred : ref.status === "Pending Pickup" ? t.refStatusPendingPickup : t.refStatusPending}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// System Admin
// ─────────────────────────────────────────────────────────────────────────────
function SystemAdmin() {
  const { t } = useLang();
  const { toast } = useToast();
  const [adminTab, setAdminTab] = useState<"Users" | "CreateUser" | "AuditLogs">("Users");
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>(INITIAL_USERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  const createSchema = z.object({
    fullName: z.string().min(1, t.requiredField),
    username: z.string().min(1, t.requiredField),
    email: z.string().email(t.requiredField),
    role: z.enum(["Front Office Agent", "Back Office Ops", "System Admin"]),
    branch: z.string().min(1),
  });

  const form = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: { fullName: "", username: "", email: "", role: "Front Office Agent", branch: "Cairo-Main" },
  });

  const filteredUsers = useMemo(() => {
    let list = systemUsers;
    if (roleFilter !== "All") list = list.filter((u) => u.role === roleFilter || u.status === roleFilter);
    if (searchQuery) list = list.filter((u) => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.username.toLowerCase().includes(searchQuery.toLowerCase()));
    return list;
  }, [roleFilter, searchQuery, systemUsers]);

  const onCreateUser = (values: z.infer<typeof createSchema>) => {
    const newUser: SystemUser = {
      id: "USR-" + Math.floor(100 + Math.random() * 900),
      name: values.fullName, username: values.username,
      role: values.role, branch: values.branch, status: "Active",
    };
    setSystemUsers((prev) => [newUser, ...prev]);
    toast({ title: t.toastUserCreated, description: t.toastUserCreatedDesc(values.fullName) });
    form.reset();
    setAdminTab("Users");
  };

  const ROLE_OPTIONS = [
    { value: "All", label: t.allRoles },
    { value: "Front Office Agent", label: t.roleFA },
    { value: "Back Office Ops", label: t.roleBO },
    { value: "System Admin", label: t.roleSA },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">{t.adminTitle}</h2>
          <p className="text-muted-foreground text-sm">{t.adminDesc}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {adminTab !== "Users" && (
            <Button variant="outline" size="sm" data-testid="button-back-to-users" onClick={() => setAdminTab("Users")}>{t.backToUsers}</Button>
          )}
          {adminTab !== "CreateUser" && (
            <Button size="sm" data-testid="button-add-user" onClick={() => setAdminTab("CreateUser")}><UserPlus className="w-4 h-4 mr-2" />{t.addNewUser}</Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border pb-4">
        <AdminTab id="Users" active={adminTab === "Users"} onClick={() => setAdminTab("Users")} icon={Users}>{t.adminTabUsers}</AdminTab>
        <AdminTab id="CreateUser" active={adminTab === "CreateUser"} onClick={() => setAdminTab("CreateUser")} icon={UserPlus}>{t.adminTabCreate}</AdminTab>
        <AdminTab id="AuditLogs" active={adminTab === "AuditLogs"} onClick={() => setAdminTab("AuditLogs")} icon={ScrollText}>{t.adminTabAudit}</AdminTab>
      </div>

      {/* Users List */}
      {adminTab === "Users" && (
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <CardTitle>{t.usersTitle}</CardTitle>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <Input
                  data-testid="input-user-search"
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-60"
                  dir="auto"
                />
                <select
                  data-testid="select-role-filter"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="border border-input rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-ring outline-none font-bold"
                >
                  {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="bg-purple-50/50 dark:bg-purple-900/10">
                    {[t.colUserDetails, t.colRole, t.colBranchUser, t.colStatus, t.colAction].map((col) => (
                      <TableHead key={col} className="font-black text-[10px] uppercase tracking-widest text-purple-500 text-right">{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">{t.noRecords}</TableCell></TableRow>
                  ) : filteredUsers.map((user) => (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <p className="font-bold text-sm">{user.name}</p>
                        <p className="text-xs font-mono text-muted-foreground">@{user.username}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 whitespace-nowrap">
                          {user.role === "Front Office Agent" ? t.roleFA : user.role === "Back Office Ops" ? t.roleBO : t.roleSA}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-bold text-muted-foreground">{user.branch}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={user.status === "Active" ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"}>
                          {user.status === "Active" ? t.userStatusActive : t.userStatusSuspended}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-3">
                          <button data-testid={`button-edit-${user.id}`} className="text-primary font-black text-[10px] uppercase hover:underline">{t.editAction}</button>
                          <button data-testid={`button-suspend-${user.id}`} className="text-red-500 font-black text-[10px] uppercase hover:underline">{t.suspendAction}</button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create User */}
      {adminTab === "CreateUser" && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader><CardTitle>{t.createUserTitle}</CardTitle><CardDescription>{t.createUserDesc}</CardDescription></CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onCreateUser)} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField control={form.control} name="fullName" render={({ field }) => (
                    <FormItem><FormLabel>{t.fullNameLabel}</FormLabel><FormControl><Input data-testid="input-full-name" placeholder={t.fullNamePlaceholder} dir="auto" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="username" render={({ field }) => (
                    <FormItem><FormLabel>{t.usernameLabel}</FormLabel><FormControl><Input data-testid="input-username" placeholder={t.usernamePlaceholder} dir="ltr" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>{t.emailLabel}</FormLabel><FormControl><Input data-testid="input-email" type="email" placeholder={t.emailPlaceholder} dir="ltr" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="role" render={({ field }) => (
                    <FormItem><FormLabel>{t.systemRoleLabel}</FormLabel><FormControl>
                      <select data-testid="select-new-user-role" className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-ring outline-none" {...field}>
                        <option value="Front Office Agent">{t.roleFA}</option>
                        <option value="Back Office Ops">{t.roleBO}</option>
                        <option value="System Admin">{t.roleSA}</option>
                      </select>
                    </FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="branch" render={({ field }) => (
                    <FormItem><FormLabel>{t.branchDeptLabel}</FormLabel><FormControl>
                      <select data-testid="select-new-user-branch" className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-ring outline-none" {...field}>
                        <option value="Cairo-Main">{t.branchCairoMain}</option>
                        <option value="Alex-Branch">{t.branchAlex}</option>
                        <option value="HQ">{t.branchHQ}</option>
                      </select>
                    </FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="flex gap-3 justify-end pt-4 border-t border-border">
                  <Button type="button" variant="outline" data-testid="button-cancel-create" onClick={() => { form.reset(); setAdminTab("Users"); }}>{t.cancel}</Button>
                  <Button type="submit" data-testid="button-save-user" className="px-8"><ShieldCheck className="w-4 h-4 mr-2" />{t.saveUser}</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Audit Logs */}
      {adminTab === "AuditLogs" && (
        <Card>
          <CardHeader><CardTitle>{t.auditTitle}</CardTitle><CardDescription>{t.auditDesc}</CardDescription></CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    {[t.colTimestamp, t.colUser, t.colUserRole, t.colActionAudit, t.colDetails, t.colIP].map((col) => (
                      <TableHead key={col} className="font-black text-[10px] uppercase tracking-widest text-muted-foreground text-right whitespace-nowrap">{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {INITIAL_AUDIT.map((log) => (
                    <TableRow key={log.id} data-testid={`row-audit-${log.id}`} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">{log.timestamp}</TableCell>
                      <TableCell>
                        <p className="font-bold text-sm leading-tight">{log.user}</p>
                        <p className="text-xs text-muted-foreground">{log.role}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 whitespace-nowrap text-[10px]">{log.role}</Badge>
                      </TableCell>
                      <TableCell className="text-sm font-bold">{log.action}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{log.details}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{log.ip}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────────────────────
type UserRole = "FrontOffice" | "BackOffice" | "SystemAdmin";

function IPOSystem() {
  const [lang, setLang] = useState<Lang>("ar");
  const [userRole, setUserRole] = useState<UserRole>("FrontOffice");
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(INITIAL_SUBSCRIPTIONS);
  const [isAuthed, setIsAuthed] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [forgotUsername, setForgotUsername] = useState("");
  const [recoveredPassword, setRecoveredPassword] = useState("");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });

  const t = T[lang];
  const isRTL = lang === "ar";
  const defaultUsername = "admin";
  const defaultPassword = "12345678";
  const numLocale = lang === "ar" ? "ar-EG" : "en-US";

  const handleLogin = () => {
    if (loginForm.username === defaultUsername && loginForm.password === defaultPassword) {
      setIsAuthed(true);
      return;
    }
  };

  const handleForgotPassword = () => {
    setRecoveredPassword(forgotUsername === defaultUsername ? defaultPassword : "");
  };

  const handleAllocate = () => {
    setSubscriptions((prev) => prev.map((s) => s.status !== "Verified" ? s : { ...s, allocatedShares: Math.floor(s.requestedShares * 0.45), status: "Allocated" as const }));
  };
  const handleRefund = () => {
    setSubscriptions((prev) => prev.map((s) => s.status !== "Allocated" ? s : { ...s, refundAmount: (s.requestedShares - s.allocatedShares) * PAR_VALUE, status: "Refunded" as const }));
  };

  const ROLES: { key: UserRole; label: string; icon: React.ElementType }[] = [
    { key: "FrontOffice", label: t.roleFront, icon: Landmark },
    { key: "BackOffice", label: t.roleBack, icon: ClipboardList },
    { key: "SystemAdmin", label: t.roleSysAdmin, icon: ShieldCheck },
  ];

  if (!isAuthed) {
    return (
      <LangContext.Provider value={{ lang, t, isRTL }}>
        <div dir={isRTL ? "rtl" : "ltr"} className="min-h-[100dvh] bg-background font-sans flex items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle>{authMode === "login" ? t.loginTitle : t.forgotTitle}</CardTitle>
              <CardDescription>{authMode === "login" ? t.loginDesc : t.forgotDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {authMode === "login" ? (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">{t.usernameLabelLogin}</label>
                    <Input value={loginForm.username} onChange={(e) => setLoginForm((p) => ({ ...p, username: e.target.value }))} placeholder={t.usernamePlaceholderLogin} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">{t.passwordLabelLogin}</label>
                    <Input type="password" value={loginForm.password} onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))} placeholder={t.passwordPlaceholderLogin} />
                  </div>
                  <p className="text-xs text-muted-foreground">{t.authHint}</p>
                  <Button className="w-full" onClick={handleLogin}><LogIn className="w-4 h-4 mr-2" />{t.loginBtn}</Button>
                  <button className="text-sm font-bold text-primary w-full" onClick={() => setAuthMode("forgot")}>{t.forgotPassword}</button>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">{t.usernameLabelLogin}</label>
                    <Input value={forgotUsername} onChange={(e) => setForgotUsername(e.target.value)} placeholder={t.usernamePlaceholderLogin} />
                  </div>
                  <Button className="w-full" onClick={handleForgotPassword}><LockKeyhole className="w-4 h-4 mr-2" />{t.showPassword}</Button>
                  {recoveredPassword && (
                    <div className="rounded-xl border border-border p-4 text-sm">
                      <div className="font-bold">{t.passwordLabelLogin}: <span className="font-mono">{recoveredPassword}</span></div>
                    </div>
                  )}
                  <Button variant="outline" className="w-full" onClick={() => setAuthMode("login")}>{t.backToLogin}</Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </LangContext.Provider>
    );
  }

  return (
    <LangContext.Provider value={{ lang, t, isRTL }}>
      <div dir={isRTL ? "rtl" : "ltr"} className="min-h-[100dvh] bg-background font-sans">
        <header className="bg-card border-b px-4 py-3 sticky top-0 z-10 flex items-center justify-between shadow-sm gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-2 rounded-md"><Landmark className="w-5 h-5" /></div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-foreground leading-tight">{t.appTitle}</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">{t.appSubtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              data-testid="button-toggle-lang"
              onClick={() => setLang((l) => (l === "ar" ? "en" : "ar"))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-bold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              title={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
            >
              <Globe className="w-4 h-4" />
              {lang === "ar" ? "EN" : "عر"}
            </button>

            <div className="bg-muted p-1 rounded-xl flex gap-1 shadow-inner flex-wrap">
              {ROLES.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  data-testid={`role-${key}`}
                  onClick={() => setUserRole(key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all ${userRole === key ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto p-6">
          {userRole === "FrontOffice" && <FrontOffice onNewSubscription={(s) => setSubscriptions((prev) => [s, ...prev])} />}
          {userRole === "BackOffice" && <BackOffice subscriptions={subscriptions} onAllocate={handleAllocate} onRefund={handleRefund} />}
          {userRole === "SystemAdmin" && <SystemAdmin />}
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
