import { useState, useMemo, createContext, useContext, useRef, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Landmark, FileSpreadsheet, ArrowLeftRight, Printer, Send, Upload,
  CheckCircle2, Globe, Users, ShieldCheck, ClipboardList, UserPlus,
  ScrollText, LogIn, LockKeyhole, UserCheck, Eye, Layers,
  Moon, Sun, Bell, BellOff, User, Settings, LogOut, ChevronDown,
  MessageSquare, Mail, Smartphone, Megaphone, Upload as UploadIcon,
  Filter, Send as SendIcon, CheckCheck, AlertCircle, X,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type Lang = "ar" | "en";
type AuthMode = "login" | "forgot";
type UserRole = "FrontOffice" | "BackOffice" | "Supervisor" | "SystemAdmin" | "Communications";
type SubStatus = "Pending Review" | "Approved" | "Pending Payment" | "Verified" | "Shortfall" | "Allocated" | "Refunded";
type CommChannel = "email" | "sms" | "notification";
type CommAudience = "all" | "group" | "individual" | "upload";

interface ClientRecord {
  nameAr: string; nameEn: string; unifiedCode: string; nationalId: string;
  account: string; isBankClient: boolean; bankAccountNo: string;
  cashBalance: number; eligibleShares: number; email: string; mobile: string;
  type: "individual" | "corporate";
}
interface Subscription {
  id: string; nameAr: string; nameEn: string; nationalId: string; account: string;
  unifiedCode: string; requestedShares: number; amountDue: number;
  amountPaid: number; allocatedShares: number; refundAmount: number;
  status: SubStatus; branch: string; submittedAt: string;
}
interface MCDRClient {
  id: number; nameAr: string; nameEn: string; unifiedCode: string; nationalId: string;
  eligibleShares: number; subscribedShares: number; balanceEGP: number;
  status: "Partial" | "Full";
}
interface SystemUser {
  id: string; name: string; username: string;
  role: "Front Office Agent" | "Back Office Ops" | "Supervisor" | "System Admin" | "Communications";
  branch: string; status: "Active" | "Suspended"; groupId: string;
  email: string; phone: string; lastLogin: string;
}
interface UserGroup {
  id: string; nameAr: string; nameEn: string; members: number; permissions: string[];
}
interface AuditLog {
  id: number; timestamp: string; user: string; role: string;
  action: string; entity: string; oldValue: string; newValue: string; ip: string;
}
interface CommMessage {
  id: string; timestamp: string; channel: CommChannel; audience: string;
  subject: string; body: string; recipients: number; status: "Sent" | "Pending" | "Failed";
  sentBy: string;
}
interface UserPrefs {
  darkMode: boolean; notifications: boolean; lang: Lang;
}

// ─────────────────────────────────────────────────────────────────────────────
// Translations
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  ar: {
    appTitle: "نظام إدارة الاكتتابات",
    appSubtitle: "شركة التكنولوجيا المتقدمة — اكتتاب زيادة رأس مال",
    roleFront: "الفرع", roleBack: "المقاصة", roleSysAdmin: "مدير النظام",
    roleSupervisor: "المشرف", roleComms: "التواصل",
    loginTitle: "تسجيل الدخول", loginDesc: "أدخل بيانات الاعتماد للدخول إلى النظام",
    usernameLabelLogin: "اسم المستخدم", passwordLabelLogin: "كلمة المرور",
    usernamePlaceholderLogin: "admin", passwordPlaceholderLogin: "••••••••",
    loginBtn: "دخول", forgotPassword: "نسيت كلمة المرور؟",
    forgotTitle: "استعادة كلمة المرور", forgotDesc: "أدخل اسم المستخدم لإعادة تعيين كلمة المرور",
    showPassword: "عرض كلمة المرور الافتراضية", backToLogin: "العودة لتسجيل الدخول",
    loginError: "اسم المستخدم أو كلمة المرور غير صحيحة",
    welcomeBack: "مرحباً بعودتك",
    step1: "التعريف بالعميل", step2: "تفاصيل الاكتتاب", step3: "المستندات", step4: "الإيصال النهائي",
    kycTitle: "بحث العميل واختيار الحدث", kycDesc: "أدخل الكود الموحد للبحث في قاعدة بيانات MCDR",
    unifiedCodeLabel: "الكود الموحد", unifiedCodePlaceholder: "أدخل الكود الموحد...",
    unifiedCodeHint: "للتجربة: 8800318 أو 7700123 أو 7700456",
    eventLabel: "حدث الاكتتاب", mcdrVerified: "مستثمر موثق — MCDR",
    unifiedCode: "الكود الموحد", accountNo: "رقم الحساب", activeStatus: "نشط",
    nextStep: "الخطوة التالية",
    bankClientYes: "عميل البنك ✓", bankClientNo: "غير عميل البنك",
    bankAccLabel: "رقم الحساب البنكي", cashBalanceLabel: "الرصيد النقدي المتاح",
    eligibleIPOLabel: "أسهم مؤهلة للاكتتاب",
    ektitabTitle: "تفاصيل الاكتتاب (Ektitab)", ektitabDesc: "أدخل عدد الأسهم وطريقة الدفع",
    sharesLabel: "عدد الأسهم المطلوبة", paymentLabel: "طريقة الدفع",
    payDirect: "خصم مباشر (تجميد حساب)", payCash: "إيداع نقدي", payCheck: "شيك معتمد",
    orderSummary: "ملخص الأمر", stockPriceLabel: "سعر السهم في الاكتتاب",
    parValue: "القيمة الاسمية", issueFees: "مصاريف الإصدار", totalDue: "إجمالي المستحق",
    confirmDocs: "تأكيد ورفع المستندات",
    docsTitle: "المستندات المطلوبة", docsDesc: "ارفع نسخ المستندات اللازمة لاستكمال الاكتتاب",
    doc1: "نسخة البطاقة القومية", doc2: "نموذج الاكتتاب الموقع",
    doc3: "إيصال التحويل البنكي", doc4: "توكيل رسمي (إن وجد)",
    uploadBtn: "رفع", reviewReceipt: "مراجعة الملخص النهائي",
    subPrepared: "تم تجهيز الاكتتاب", txPrefix: "رقم العملية",
    clientLabel: "العميل", sharesCol: "الأسهم", totalAmtLabel: "إجمالي المبلغ",
    statusLabel: "الحالة", awaitingVerif: "في انتظار الاعتماد",
    printReceipt: "طباعة / تنزيل الإيصال", submitForReview: "إرسال للمراجعة",
    checkerTitle: "مراجعة طلبات الاكتتاب",
    checkerDesc: "مراجعة واعتماد طلبات الاكتتاب المقدمة من الفروع",
    approveBtn: "اعتماد", rejectBtn: "رفض", approveAllBtn: "اعتماد الكل",
    colSubmittedBy: "الفرع المقدِّم", colSubmittedAt: "تاريخ التقديم",
    pendingReviewCount: (n: number) => `${n} طلب في انتظار الاعتماد`,
    opsHubTitle: "مركز العمليات", opsHubDesc: "المقاصة المركزية والمطابقة",
    exportData: "تصدير Excel", executeAlloc: "تنفيذ التخصيص", exportBankFile: "تصدير ملف التحويلات",
    boTabMCDR: "رفع MCDR", boTabAlloc: "نتائج التخصيص", boTabRefunds: "إعادة الأموال", boTabRecon: "المطابقة",
    mcdrUploadTitle: "رفع ملف بيانات MCDR", mcdrUploadDesc: "ارفع ملف Excel لعرض بيانات أهلية المستثمرين",
    uploadMCDRBtn: "رفع ملف MCDR", mcdrTitle: "قائمة أهلية المستثمرين (MCDR)",
    reconTitle: "قائمة المطابقة",
    filterAll: "الكل", filterVerified: "موثق", filterShortfall: "عجز",
    filterPending: "قيد الدفع", filterAllocated: "مخصص", filterRefunded: "مرتد فائض",
    colInvestor: "المستثمر / الكود الموحد", colBranch: "الفرع",
    colDue: "المستحق (ج.م)", colPaid: "المدفوع (ج.م)",
    colAllocated: "المخصص", colRefund: "رد الفائض", colStatus: "الحالة", colAction: "إجراء",
    noRecords: "لا توجد عمليات", manualMatch: "مطابقة يدوية", refundAction: "رد",
    colName: "اسم المستثمر", colNatId: "الرقم القومي", colUnified: "الكود الموحد",
    colEligible: "الأسهم المؤهلة", colSubscribed: "الأسهم المكتتبة",
    colBalance: "الرصيد (ج.م)", mcdrStatusPartial: "جزئي", mcdrStatusFull: "كامل",
    allocTitle: "نتائج التخصيص", allocBanner: "تم تنفيذ التخصيص بنجاح",
    allocRatio: "نسبة التخصيص الإجمالية", proceedRefunds: "الانتقال لإعادة الأموال",
    colRequested: "الأسهم المطلوبة", colAllocShares: "الأسهم المخصصة",
    colRatioPct: "النسبة %", colTotalPaid: "المدفوع (ج.م)", colRefundable: "المسترد (ج.م)",
    refundsTitle: "معالجة استرداد الأموال", colRefundAmt: "مبلغ الاسترداد (ج.م)",
    colMethod: "طريقة الصرف", colIBAN: "IBAN",
    refStatusTransferred: "تم التحويل", refStatusPendingPickup: "في انتظار الاستلام", refStatusPendingP: "قيد المعالجة",
    stat0: "إجمالي الاكتتابات", stat1: "نسبة التغطية", stat2: "استثناءات", stat3: "إجمالي النقدية (ج.م)",
    statusPendingReview: "في انتظار الاعتماد", statusApproved: "معتمد",
    statusPending: "قيد الدفع", statusVerified: "موثق", statusShortfall: "عجز",
    statusAllocated: "مخصص", statusRefunded: "مرتد فائض",
    adminTitle: "إدارة النظام", adminDesc: "إدارة المستخدمين والصلاحيات (RBAC)",
    adminTabUsers: "المستخدمون", adminTabCreate: "إنشاء مستخدم",
    adminTabGroups: "مجموعات المستخدمين", adminTabAudit: "سجل التدقيق",
    backToUsers: "العودة للمستخدمين", addNewUser: "إضافة مستخدم جديد",
    usersTitle: "قائمة المستخدمين والصلاحيات",
    searchPlaceholder: "بحث بالاسم أو اسم المستخدم...", allRoles: "كل الأدوار والحالات",
    colUserDetails: "بيانات المستخدم", colRole: "الدور المحدد", colBranchUser: "الفرع",
    colGroup: "المجموعة", editAction: "تعديل", suspendAction: "تعليق",
    userStatusActive: "نشط", userStatusSuspended: "موقوف",
    roleFA: "موظف الفرع", roleBO: "موظف المقاصة", roleSup: "مشرف", roleSA: "مدير النظام", roleCommU: "مسؤول التواصل",
    createUserTitle: "إنشاء مستخدم جديد", createUserDesc: "أدخل بيانات المستخدم وحدد صلاحياته",
    fullNameLabel: "الاسم الكامل", fullNamePlaceholder: "مثال: علي محمود",
    usernameLabel: "اسم المستخدم", usernamePlaceholder: "مثال: ali.m",
    emailLabel: "البريد الإلكتروني", emailPlaceholder: "مثال: ali@bank.com",
    systemRoleLabel: "الدور في النظام", branchDeptLabel: "الفرع / القسم",
    groupLabel: "المجموعة", branchCairoMain: "Cairo-Main", branchAlex: "Alex-Branch", branchHQ: "HQ Operations",
    saveUser: "حفظ المستخدم", cancel: "إلغاء", requiredField: "هذا الحقل مطلوب",
    groupsTitle: "مجموعات المستخدمين وصلاحيات الوصول", groupName: "اسم المجموعة",
    groupMembers: "الأعضاء", groupPermissions: "الصلاحيات الممنوحة", addGroup: "إضافة مجموعة جديدة",
    auditTitle: "سجل أحداث النظام", auditDesc: "تتبع كامل لأفعال المستخدمين والتغييرات في النظام",
    colTimestamp: "التوقيت", colUser: "المستخدم", colUserRole: "الدور",
    colActionAudit: "الإجراء", colEntity: "الكيان", colOldValue: "القيمة القديمة", colNewValue: "القيمة الجديدة", colIP: "عنوان IP",
    profileTitle: "الملف الشخصي", profileDesc: "بيانات حسابك وإعدادات التفضيلات",
    settingsTitle: "الإعدادات", darkModeLabel: "الوضع الداكن", darkModeDesc: "تبديل المظهر بين الفاتح والداكن",
    notifLabel: "الإشعارات", notifDesc: "تفعيل أو إيقاف إشعارات النظام",
    langLabel: "اللغة", myRoleLabel: "الدور الوظيفي", myBranchLabel: "الفرع", lastLoginLabel: "آخر دخول",
    commTitle: "التواصل مع العملاء", commDesc: "إرسال رسائل وإشعارات وتحديثات حالة الاكتتاب للعملاء",
    commTabCompose: "رسالة جديدة", commTabHistory: "سجل الرسائل",
    channelEmail: "بريد إلكتروني", channelSMS: "رسالة SMS", channelNotif: "إشعار داخلي",
    audienceAll: "جميع العملاء", audienceGroup: "مجموعة محددة", audienceIndividual: "عميل بعينه", audienceUpload: "رفع قائمة",
    subjectLabel: "الموضوع / العنوان", subjectPlaceholder: "مثال: تحديث حالة اكتتابك",
    messageLabel: "نص الرسالة", messagePlaceholder: "اكتب نص رسالتك هنا...",
    groupSelectLabel: "اختر المجموعة",
    groupIndividuals: "أفراد", groupCorporates: "شركات", groupAllClients: "كل العملاء",
    clientCodeLabel: "كود العميل أو رقم الهاتف",
    uploadListLabel: "رفع ملف Excel بأكواد العملاء أو أرقام الهواتف",
    uploadListBtn: "رفع ملف Excel",
    templateIPOStatus: "قالب: تحديث حالة الاكتتاب",
    templateAlloc: "قالب: إشعار التخصيص",
    templateRefund: "قالب: إشعار الاسترداد",
    sendBtn: "إرسال الرسالة",
    recipientsLabel: "المستلمون المتوقعون",
    commHistTitle: "سجل الرسائل المرسلة",
    colChannel: "القناة", colAudience: "الجمهور", colSubject: "الموضوع",
    colRecipients: "المستلمون", colSentAt: "وقت الإرسال", colCommStatus: "الحالة",
    commStatusSent: "تم الإرسال", commStatusPending: "قيد الإرسال", commStatusFailed: "فشل",
    toastSentTitle: "تم الإرسال للمراجعة", toastSentDesc: (id: string) => `تم إرسال الاكتتاب ${id} للمشرف.`,
    toastApprovedTitle: "تم الاعتماد", toastApprovedDesc: (n: number) => `تم اعتماد ${n} طلب بنجاح.`,
    toastAllocTitle: "تم التخصيص", toastAllocDesc: "تم تخصيص الأسهم بنسبة 45%.",
    toastRefundTitle: "رد الفائض", toastRefundDesc: "تم تنفيذ رد الفائض لجميع الحسابات المخصصة.",
    toastUserCreated: "تم إنشاء المستخدم بنجاح.", toastUserCreatedDesc: (n: string) => `تمت إضافة ${n} إلى النظام.`,
    toastExported: "تم التصدير", toastExportedDesc: "تم تصدير البيانات إلى ملف CSV.",
    toastCommSent: "تم الإرسال", toastCommSentDesc: (n: number) => `تم إرسال الرسالة إلى ${n} مستلم.`,
    sharesError: "يجب إدخال عدد أسهم صحيح",
    eventSOO: "Sinawy Olive Oil IPO (SOO)", eventCAP: "زيادة رأس مال - بنك التكنولوجيا المتقدمة", eventRIGHTS: "أسهم أولوية - دلتا للتأمين",
    egp: "ج.م", shares: "سهم",
    logout: "تسجيل الخروج", profile: "الملف الشخصي", settings: "الإعدادات",
  },
  en: {
    appTitle: "IPO Management System",
    appSubtitle: "Advanced Technology Co. — Capital Increase IPO",
    roleFront: "Branch", roleBack: "Clearing", roleSysAdmin: "SysAdmin",
    roleSupervisor: "Supervisor", roleComms: "Comms",
    loginTitle: "Sign In", loginDesc: "Enter your credentials to access the system",
    usernameLabelLogin: "Username", passwordLabelLogin: "Password",
    usernamePlaceholderLogin: "admin", passwordPlaceholderLogin: "••••••••",
    loginBtn: "Login", forgotPassword: "Forgot password?",
    forgotTitle: "Password Recovery", forgotDesc: "Enter your username to retrieve the default password",
    showPassword: "Show Default Password", backToLogin: "Back to Login",
    loginError: "Invalid username or password",
    welcomeBack: "Welcome back",
    step1: "Identification", step2: "Ektitab Entry", step3: "Documentation", step4: "Final Receipt",
    kycTitle: "Client Lookup & Event Selection", kycDesc: "Enter the Unified Code to look up the client in the MCDR database",
    unifiedCodeLabel: "Unified Code", unifiedCodePlaceholder: "Enter unified code...",
    unifiedCodeHint: "Try: 8800318, 7700123 or 7700456",
    eventLabel: "Subscription Event", mcdrVerified: "MCDR Verified Shareholder",
    unifiedCode: "Unified Code", accountNo: "Account", activeStatus: "Active",
    nextStep: "Next Step",
    bankClientYes: "Bank Client ✓", bankClientNo: "Non-Bank Client",
    bankAccLabel: "Bank Account No.", cashBalanceLabel: "Available Cash Balance",
    eligibleIPOLabel: "IPO Eligible Shares",
    ektitabTitle: "Subscription (Ektitab) Details", ektitabDesc: "Enter the number of shares and payment method",
    sharesLabel: "Shares Requested", paymentLabel: "Payment Method",
    payDirect: "Direct Debit (Account Block)", payCash: "Cash Deposit", payCheck: "Certified Check",
    orderSummary: "Order Summary", stockPriceLabel: "IPO Stock Price",
    parValue: "Par Value", issueFees: "Issue Fees", totalDue: "Total Due",
    confirmDocs: "Confirm & Upload Docs",
    docsTitle: "Required Documentation", docsDesc: "Upload copies of the required documents to complete the subscription",
    doc1: "National ID Copy", doc2: "Signed Subscription Form",
    doc3: "Bank Transfer Receipt", doc4: "POA (if applicable)",
    uploadBtn: "Upload", reviewReceipt: "Review Final Summary",
    subPrepared: "Subscription Prepared", txPrefix: "Transaction ID",
    clientLabel: "Client", sharesCol: "Shares", totalAmtLabel: "Total Amount",
    statusLabel: "Status", awaitingVerif: "Awaiting Approval",
    printReceipt: "Print / Download Receipt", submitForReview: "Submit for Review",
    checkerTitle: "Subscription Review Queue",
    checkerDesc: "Review and approve IPO subscription requests submitted by branches",
    approveBtn: "Approve", rejectBtn: "Reject", approveAllBtn: "Approve All",
    colSubmittedBy: "Submitted By", colSubmittedAt: "Submitted At",
    pendingReviewCount: (n: number) => `${n} subscription(s) awaiting approval`,
    opsHubTitle: "Operations Hub", opsHubDesc: "Central Clearing & Reconciliation",
    exportData: "Export Excel", executeAlloc: "Execute Allocation", exportBankFile: "Export Bank Transfer File",
    boTabMCDR: "MCDR Upload", boTabAlloc: "Allocation Results", boTabRefunds: "Refunds Processing", boTabRecon: "Reconciliation",
    mcdrUploadTitle: "Upload MCDR Data File", mcdrUploadDesc: "Upload the MCDR Excel file to load investor eligibility data",
    uploadMCDRBtn: "Upload MCDR File", mcdrTitle: "MCDR Investor Eligibility List",
    reconTitle: "Reconciliation Queue",
    filterAll: "All", filterVerified: "Verified", filterShortfall: "Shortfall",
    filterPending: "Pending Payment", filterAllocated: "Allocated", filterRefunded: "Refunded",
    colInvestor: "Investor / Unified Code", colBranch: "Branch",
    colDue: "Due (EGP)", colPaid: "Paid (EGP)",
    colAllocated: "Allocated", colRefund: "Refund", colStatus: "Status", colAction: "Action",
    noRecords: "No records found", manualMatch: "Manual Match", refundAction: "Refund",
    colName: "Investor Name", colNatId: "National ID", colUnified: "Unified Code",
    colEligible: "Eligible Shares", colSubscribed: "Subscribed Shares",
    colBalance: "Balance (EGP)", mcdrStatusPartial: "Partial", mcdrStatusFull: "Full",
    allocTitle: "Client Allocation Results", allocBanner: "Allocation Executed Successfully",
    allocRatio: "Overall Allocation Ratio", proceedRefunds: "Proceed to Refunds →",
    colRequested: "Requested Shares", colAllocShares: "Allocated Shares",
    colRatioPct: "% Ratio", colTotalPaid: "Total Paid (EGP)", colRefundable: "Refundable (EGP)",
    refundsTitle: "Post-Allocation Refunds Processing", colRefundAmt: "Refund Amount (EGP)",
    colMethod: "Disbursement Method", colIBAN: "Bank Details (IBAN)",
    refStatusTransferred: "Transferred", refStatusPendingPickup: "Pending Pickup", refStatusPendingP: "Pending Processing",
    stat0: "Total Subscriptions", stat1: "Coverage Ratio", stat2: "Exceptions", stat3: "Total Cash (EGP)",
    statusPendingReview: "Pending Review", statusApproved: "Approved",
    statusPending: "Pending Payment", statusVerified: "Verified", statusShortfall: "Shortfall",
    statusAllocated: "Allocated", statusRefunded: "Refunded",
    adminTitle: "System Administration", adminDesc: "User Management & Role-Based Access Control (RBAC)",
    adminTabUsers: "Users", adminTabCreate: "Create User",
    adminTabGroups: "User Groups", adminTabAudit: "Audit Logs",
    backToUsers: "← Back to Users", addNewUser: "+ Add New User",
    usersTitle: "Access Control & Users List",
    searchPlaceholder: "Search name or username...", allRoles: "All Roles & Status",
    colUserDetails: "User Details", colRole: "Assigned Role", colBranchUser: "Branch",
    colGroup: "Group", editAction: "Edit", suspendAction: "Suspend",
    userStatusActive: "Active", userStatusSuspended: "Suspended",
    roleFA: "Front Office Agent", roleBO: "Back Office Ops", roleSup: "Supervisor", roleSA: "System Admin", roleCommU: "Comms Officer",
    createUserTitle: "Create New User Profile", createUserDesc: "Enter the new user's details and assign their system role",
    fullNameLabel: "Full Name", fullNamePlaceholder: "e.g. Ali Mahmoud",
    usernameLabel: "Username", usernamePlaceholder: "e.g. ali.m",
    emailLabel: "Email", emailPlaceholder: "e.g. ali@bank.com",
    systemRoleLabel: "System Role", branchDeptLabel: "Branch / Department",
    groupLabel: "Group", branchCairoMain: "Cairo-Main", branchAlex: "Alex-Branch", branchHQ: "HQ Operations",
    saveUser: "Save User", cancel: "Cancel", requiredField: "This field is required",
    groupsTitle: "User Groups & Access Rights", groupName: "Group Name",
    groupMembers: "Members", groupPermissions: "Granted Permissions", addGroup: "Add New Group",
    auditTitle: "System Event Audit Log", auditDesc: "Full audit trail of user actions and system changes",
    colTimestamp: "Timestamp", colUser: "User", colUserRole: "Role",
    colActionAudit: "Action", colEntity: "Entity", colOldValue: "Old Value", colNewValue: "New Value", colIP: "IP Address",
    profileTitle: "My Profile", profileDesc: "Your account details and preferences",
    settingsTitle: "Settings", darkModeLabel: "Dark Mode", darkModeDesc: "Toggle between light and dark appearance",
    notifLabel: "Notifications", notifDesc: "Enable or disable system notifications",
    langLabel: "Language", myRoleLabel: "Role", myBranchLabel: "Branch", lastLoginLabel: "Last Login",
    commTitle: "Customer Communications", commDesc: "Send notifications, SMS or email updates to clients about their IPO status",
    commTabCompose: "Compose Message", commTabHistory: "Message History",
    channelEmail: "Email", channelSMS: "SMS", channelNotif: "In-App Notification",
    audienceAll: "All Clients", audienceGroup: "Client Group", audienceIndividual: "Specific Client", audienceUpload: "Upload List",
    subjectLabel: "Subject / Title", subjectPlaceholder: "e.g. Your IPO Subscription Update",
    messageLabel: "Message Body", messagePlaceholder: "Type your message here...",
    groupSelectLabel: "Select Group",
    groupIndividuals: "Individual Investors", groupCorporates: "Corporate Clients", groupAllClients: "All Clients",
    clientCodeLabel: "Client Code or Mobile Number",
    uploadListLabel: "Upload Excel file with client codes or mobile numbers",
    uploadListBtn: "Upload Excel File",
    templateIPOStatus: "Template: IPO Status Update",
    templateAlloc: "Template: Allocation Notification",
    templateRefund: "Template: Refund Notification",
    sendBtn: "Send Message",
    recipientsLabel: "Expected Recipients",
    commHistTitle: "Sent Messages Log",
    colChannel: "Channel", colAudience: "Audience", colSubject: "Subject",
    colRecipients: "Recipients", colSentAt: "Sent At", colCommStatus: "Status",
    commStatusSent: "Sent", commStatusPending: "Pending", commStatusFailed: "Failed",
    toastSentTitle: "Submitted for Review", toastSentDesc: (id: string) => `Subscription ${id} sent to supervisor.`,
    toastApprovedTitle: "Approved", toastApprovedDesc: (n: number) => `${n} subscription(s) approved successfully.`,
    toastAllocTitle: "Allocation Complete", toastAllocDesc: "Shares allocated at 45% ratio.",
    toastRefundTitle: "Refunds Processed", toastRefundDesc: "Excess refunds executed for all allocated accounts.",
    toastUserCreated: "User created successfully.", toastUserCreatedDesc: (n: string) => `${n} has been added to the system.`,
    toastExported: "Exported", toastExportedDesc: "Data exported to CSV file.",
    toastCommSent: "Message Sent", toastCommSentDesc: (n: number) => `Message delivered to ${n} recipient(s).`,
    sharesError: "Please enter a valid number of shares",
    eventSOO: "Sinawy Olive Oil IPO (SOO)", eventCAP: "Capital Increase — Advanced Technology Bank", eventRIGHTS: "Rights Issue — Delta Insurance",
    egp: "EGP", shares: "shares",
    logout: "Logout", profile: "My Profile", settings: "Settings",
  },
} as const;

type Translations = typeof T[keyof typeof T];
const LangContext = createContext<{ lang: Lang; t: Translations; isRTL: boolean }>({ lang: "en", t: T.en, isRTL: false });
function useLang() { return useContext(LangContext); }

// ─────────────────────────────────────────────────────────────────────────────
// Constants & Mock Data
// ─────────────────────────────────────────────────────────────────────────────
const PAR_VALUE = 1.0;
const ISSUE_FEES = 0.25;
const TOTAL_PER_SHARE = PAR_VALUE + ISSUE_FEES;

const MOCK_CLIENTS: Record<string, ClientRecord> = {
  "8800318": { nameAr: "حسين سليم محمد علي", nameEn: "Hussein Salim Mohamed Ali", unifiedCode: "8800318", nationalId: "28512111234567", account: "100003456", isBankClient: true, bankAccountNo: "EG290011-10034-56", cashBalance: 150000, eligibleShares: 12000, email: "hussein.salim@email.com", mobile: "+201001234567", type: "individual" },
  "7700123": { nameAr: "أحمد محمد علي", nameEn: "Ahmed Mohamed Ali", unifiedCode: "7700123", nationalId: "29001011234567", account: "100234567", isBankClient: true, bankAccountNo: "EG290011-23456-78", cashBalance: 85000, eligibleShares: 8000, email: "ahmed.ali@email.com", mobile: "+201112345678", type: "individual" },
  "7700456": { nameAr: "سارة محمود حسن", nameEn: "Sara Mahmoud Hassan", unifiedCode: "7700456", nationalId: "29505051234568", account: "100234568", isBankClient: false, bankAccountNo: "", cashBalance: 20000, eligibleShares: 4000, email: "sara.hassan@corp.com", mobile: "+201223456789", type: "corporate" },
};

const INITIAL_SUBSCRIPTIONS: Subscription[] = [
  { id: "TX-9901", nameAr: "أحمد محمد علي", nameEn: "Ahmed Mohamed Ali", nationalId: "29001011234567", account: "100234567", unifiedCode: "7700123", requestedShares: 10000, amountDue: 12500, amountPaid: 12500, allocatedShares: 0, refundAmount: 0, status: "Verified", branch: "Cairo-Main", submittedAt: "2026-05-13 09:10" },
  { id: "TX-9902", nameAr: "سارة محمود حسن", nameEn: "Sara Mahmoud Hassan", nationalId: "29505051234568", account: "100234568", unifiedCode: "7700456", requestedShares: 4000, amountDue: 5000, amountPaid: 4500, allocatedShares: 0, refundAmount: 0, status: "Shortfall", branch: "Alex-Branch", submittedAt: "2026-05-13 10:22" },
  { id: "TX-9903", nameAr: "حسين سليم محمد علي", nameEn: "Hussein Salim Mohamed Ali", nationalId: "28512111234567", account: "100003456", unifiedCode: "8800318", requestedShares: 8000, amountDue: 10000, amountPaid: 0, allocatedShares: 0, refundAmount: 0, status: "Pending Review", branch: "Giza-Hub", submittedAt: "2026-05-14 08:45" },
  { id: "TX-9904", nameAr: "رنا الشافعي إبراهيم", nameEn: "Rana El-Shafei Ibrahim", nationalId: "28805051234568", account: "100334455", unifiedCode: "7744312", requestedShares: 5000, amountDue: 6250, amountPaid: 6250, allocatedShares: 0, refundAmount: 0, status: "Pending Review", branch: "Alex-Branch", submittedAt: "2026-05-14 11:30" },
];

const INITIAL_MCDR = [
  { id: 1, nameAr: "حسين سليم محمد علي", nameEn: "Hussein Salim Mohamed Ali", unifiedCode: "8800318", nationalId: "28512111234567", eligibleShares: 12000, subscribedShares: 8000, balanceEGP: 150000, status: "Partial" as const },
  { id: 2, nameAr: "رنا الشافعي إبراهيم", nameEn: "Rana El-Shafei Ibrahim", unifiedCode: "7744312", nationalId: "28805051234568", eligibleShares: 5000, subscribedShares: 5000, balanceEGP: 80000, status: "Full" as const },
  { id: 3, nameAr: "أحمد محمد علي", nameEn: "Ahmed Mohamed Ali", unifiedCode: "7700123", nationalId: "29001011234567", eligibleShares: 8000, subscribedShares: 8000, balanceEGP: 85000, status: "Full" as const },
  { id: 4, nameAr: "سارة محمود حسن", nameEn: "Sara Mahmoud Hassan", unifiedCode: "7700456", nationalId: "29505051234568", eligibleShares: 4000, subscribedShares: 3600, balanceEGP: 20000, status: "Partial" as const },
];

const INITIAL_USERS: SystemUser[] = [
  { id: "USR-001", name: "Ahmed Hassan", username: "ahmed.h", role: "Front Office Agent", branch: "Cairo-Main", status: "Active", groupId: "GRP-001", email: "ahmed.h@bank.com", phone: "+201001112233", lastLogin: "2026-05-15 08:30" },
  { id: "USR-002", name: "Mahmoud Saad", username: "mahmoud.s", role: "Back Office Ops", branch: "HQ", status: "Active", groupId: "GRP-002", email: "mahmoud.s@bank.com", phone: "+201112223344", lastLogin: "2026-05-15 09:05" },
  { id: "USR-003", name: "Layla Yousef", username: "layla.y", role: "Supervisor", branch: "Cairo-Main", status: "Active", groupId: "GRP-003", email: "layla.y@bank.com", phone: "+201223334455", lastLogin: "2026-05-14 14:20" },
  { id: "USR-004", name: "Hussein Saleem", username: "hsileem", role: "System Admin", branch: "HQ", status: "Active", groupId: "GRP-004", email: "h.saleem@bank.com", phone: "+201334445566", lastLogin: "2026-05-15 07:55" },
  { id: "USR-005", name: "Admin User", username: "admin", role: "System Admin", branch: "HQ", status: "Active", groupId: "GRP-004", email: "admin@bank.com", phone: "+201000000000", lastLogin: "2026-05-15 09:30" },
];

const INITIAL_GROUPS = [
  { id: "GRP-001", nameAr: "موظفو الفرع", nameEn: "Branch Officers", members: 12, permissions: ["create_subscription", "view_clients", "print_receipt"] },
  { id: "GRP-002", nameAr: "موظفو المقاصة", nameEn: "Clearing Officers", members: 5, permissions: ["view_subscriptions", "reconcile", "allocate", "export_data"] },
  { id: "GRP-003", nameAr: "المشرفون", nameEn: "Supervisors", members: 3, permissions: ["approve_subscription", "reject_subscription", "view_branch_data"] },
  { id: "GRP-004", nameAr: "مديرو النظام", nameEn: "System Admins", members: 2, permissions: ["manage_users", "manage_groups", "view_audit", "full_access"] },
];

const INITIAL_AUDIT = [
  { id: 1, timestamp: "2026-05-13 09:30:12", user: "hsileem", role: "System Admin", action: "Create User", entity: "User / USR-003", oldValue: "—", newValue: "layla.y (Supervisor)", ip: "192.168.1.10" },
  { id: 2, timestamp: "2026-05-13 10:15:00", user: "ahmed.h", role: "Front Office Agent", action: "Create Subscription", entity: "Subscription / TX-9901", oldValue: "—", newValue: "10,000 shares — 12,500 EGP", ip: "10.0.5.21" },
  { id: 3, timestamp: "2026-05-13 11:45:33", user: "mahmoud.s", role: "Back Office Ops", action: "MCDR Upload", entity: "MCDR File", oldValue: "No file", newValue: "mcdr_may2026.xlsx (240 records)", ip: "10.0.1.55" },
  { id: 4, timestamp: "2026-05-13 13:02:10", user: "hsileem", role: "System Admin", action: "Suspend User", entity: "User / USR-005", oldValue: "Active", newValue: "Suspended", ip: "192.168.1.10" },
  { id: 5, timestamp: "2026-05-14 08:55:00", user: "layla.y", role: "Supervisor", action: "Approve Subscription", entity: "Subscription / TX-9901", oldValue: "Pending Review", newValue: "Verified", ip: "10.0.5.30" },
  { id: 6, timestamp: "2026-05-14 09:10:22", user: "mahmoud.s", role: "Back Office Ops", action: "Execute Allocation", entity: "IPO Event / SOO-2026", oldValue: "Verified", newValue: "Allocated (45%)", ip: "10.0.1.55" },
];

const INITIAL_COMM_HISTORY: CommMessage[] = [
  { id: "MSG-001", timestamp: "2026-05-13 10:00", channel: "email", audience: "All Clients", subject: "IPO Subscription Confirmation", body: "Your subscription has been received...", recipients: 240, status: "Sent", sentBy: "admin" },
  { id: "MSG-002", timestamp: "2026-05-14 09:00", channel: "sms", audience: "Individual Investors", subject: "Allocation Result", body: "Dear client, your shares have been allocated...", recipients: 185, status: "Sent", sentBy: "admin" },
  { id: "MSG-003", timestamp: "2026-05-14 11:30", channel: "notification", audience: "Corporate Clients", subject: "Refund Processing Notice", body: "Your refund is being processed...", recipients: 55, status: "Pending", sentBy: "admin" },
];

const queryClient = new QueryClient();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
function clientName(nameAr: string, nameEn: string, lang: Lang) {
  return lang === "ar" ? nameAr : nameEn;
}
function SubBadge({ status }: { status: SubStatus }) {
  const { t } = useLang();
  const map: Record<SubStatus, { label: string; cls: string }> = {
    "Pending Review": { label: t.statusPendingReview, cls: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
    "Approved": { label: t.statusApproved, cls: "bg-teal-500/10 text-teal-600 border-teal-500/20" },
    "Pending Payment": { label: t.statusPending, cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    "Verified": { label: t.statusVerified, cls: "bg-green-500/10 text-green-600 border-green-500/20" },
    "Shortfall": { label: t.statusShortfall, cls: "bg-red-500/10 text-red-600 border-red-500/20" },
    "Allocated": { label: t.statusAllocated, cls: "bg-primary/10 text-primary border-primary/20" },
    "Refunded": { label: t.statusRefunded, cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  };
  const { label, cls } = map[status];
  return <Badge variant="outline" className={`${cls} whitespace-nowrap`}>{label}</Badge>;
}
function TabBtn({ id, active, onClick, icon: Icon, children }: { id: string; active: boolean; onClick: () => void; icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <button data-testid={`tab-${id}`} onClick={onClick}
      className={`flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl transition-all ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
      {Icon && <Icon className="w-3.5 h-3.5" />}{children}
    </button>
  );
}
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted-foreground/30"}`}>
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}
function exportCSV(data: Subscription[], lang: Lang) {
  const headers = lang === "ar"
    ? ["رقم العملية", "الاسم", "الكود الموحد", "الفرع", "الأسهم", "المستحق", "المدفوع", "المخصص", "الحالة"]
    : ["ID", "Name", "Unified Code", "Branch", "Shares", "Due", "Paid", "Allocated", "Status"];
  const rows = data.map(s => [s.id, clientName(s.nameAr, s.nameEn, lang), s.unifiedCode, s.branch, s.requestedShares, s.amountDue, s.amountPaid, s.allocatedShares, s.status]);
  const csv = "\uFEFF" + [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "subscriptions.csv"; a.click();
  URL.revokeObjectURL(url);
}
function downloadReceipt(sub: Subscription, lang: Lang) {
  const isAr = lang === "ar";
  const name = clientName(sub.nameAr, sub.nameEn, lang);
  const html = `<!DOCTYPE html><html dir="${isAr ? "rtl" : "ltr"}" lang="${lang}"><head><meta charset="UTF-8"><title>Receipt - ${sub.id}</title>
<style>body{font-family:Arial,sans-serif;padding:40px;max-width:600px;margin:auto;color:#111}.logo{background:#0f766e;color:#fff;padding:12px 20px;border-radius:8px;font-weight:bold;font-size:18px;display:inline-block;margin-bottom:20px}h1{font-size:22px}table{width:100%;border-collapse:collapse}td{padding:10px 12px;border-bottom:1px solid #eee;font-size:14px}td:first-child{color:#666;width:45%}td:last-child{font-weight:bold}.footer{margin-top:32px;text-align:center;color:#999;font-size:11px;border-top:1px solid #eee;padding-top:16px}</style></head>
<body><div class="logo">${isAr ? "نظام إدارة الاكتتابات" : "IPO Management System"}</div>
<h1>${isAr ? "إيصال اكتتاب" : "Subscription Receipt"}</h1>
<table><tr><td>${isAr ? "رقم العملية" : "Transaction ID"}</td><td>${sub.id}</td></tr>
<tr><td>${isAr ? "اسم العميل" : "Client Name"}</td><td>${name}</td></tr>
<tr><td>${isAr ? "الكود الموحد" : "Unified Code"}</td><td>${sub.unifiedCode}</td></tr>
<tr><td>${isAr ? "الأسهم المطلوبة" : "Shares Requested"}</td><td>${sub.requestedShares.toLocaleString()}</td></tr>
<tr><td>${isAr ? "إجمالي المبلغ" : "Total Amount"}</td><td>${sub.amountDue.toLocaleString()} ${isAr ? "ج.م" : "EGP"}</td></tr>
<tr><td>${isAr ? "الفرع" : "Branch"}</td><td>${sub.branch}</td></tr></table>
<div class="footer">${isAr ? "هذا الإيصال مُنشأ إلكترونيًا" : "Electronically generated receipt"}</div></body></html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `receipt-${sub.id}.html`; a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile / Settings panel (slide-over)
// ─────────────────────────────────────────────────────────────────────────────
function ProfilePanel({ user, prefs, onPrefsChange, onClose }: {
  user: SystemUser; prefs: UserPrefs;
  onPrefsChange: (p: Partial<UserPrefs>) => void; onClose: () => void;
}) {
  const { t, lang } = useLang();
  const isRTL = lang === "ar";
  return (
    <div className="fixed inset-0 z-50 flex" dir={isRTL ? "rtl" : "ltr"}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative ms-auto h-full w-full max-w-sm bg-card border-s border-border shadow-2xl flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-black text-lg">{t.profileTitle}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
        </div>
        {/* Avatar + identity */}
        <div className="p-6 flex flex-col items-center gap-3 border-b border-border">
          <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-3xl font-black">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="text-center">
            <p className="font-black text-xl">{user.name}</p>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">{user.role}</Badge>
            <Badge variant="outline" className="bg-muted text-muted-foreground text-xs">{user.branch}</Badge>
          </div>
        </div>
        {/* Details */}
        <div className="p-5 space-y-3 border-b border-border">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground font-bold">{t.emailLabel}</span>
            <span className="font-mono">{user.email}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground font-bold">{t.lastLoginLabel}</span>
            <span className="font-mono text-xs">{user.lastLogin}</span>
          </div>
        </div>
        {/* Settings */}
        <div className="p-5 space-y-5 flex-1">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t.settingsTitle}</p>
          {/* Dark mode */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {prefs.darkMode ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-amber-500" />}
              <div>
                <p className="font-bold text-sm">{t.darkModeLabel}</p>
                <p className="text-xs text-muted-foreground">{t.darkModeDesc}</p>
              </div>
            </div>
            <Toggle checked={prefs.darkMode} onChange={v => onPrefsChange({ darkMode: v })} />
          </div>
          {/* Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {prefs.notifications ? <Bell className="w-4 h-4 text-primary" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
              <div>
                <p className="font-bold text-sm">{t.notifLabel}</p>
                <p className="text-xs text-muted-foreground">{t.notifDesc}</p>
              </div>
            </div>
            <Toggle checked={prefs.notifications} onChange={v => onPrefsChange({ notifications: v })} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Customer Communications Module
// ─────────────────────────────────────────────────────────────────────────────
function CustomerComms() {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [tab, setTab] = useState<"compose" | "history">("compose");
  const [channel, setChannel] = useState<CommChannel>("email");
  const [audience, setAudience] = useState<CommAudience>("all");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("groupAllClients");
  const [clientCode, setClientCode] = useState("");
  const [history, setHistory] = useState<CommMessage[]>(INITIAL_COMM_HISTORY);
  const [isSending, setIsSending] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);

  const audienceRecipients: Record<CommAudience, number> = { all: 240, group: selectedGroup === "groupCorporates" ? 55 : selectedGroup === "groupIndividuals" ? 185 : 240, individual: 1, upload: uploadedFile ? 45 : 0 };

  const TEMPLATES = [
    { key: "status", label: t.templateIPOStatus, subject: lang === "ar" ? "تحديث حالة اكتتابك" : "Your IPO Subscription Status Update", body: lang === "ar" ? "عزيزي العميل،\n\nنود إعلامك بأن طلب اكتتابك قيد المعالجة. سيتم إخطارك بنتائج التخصيص خلال 5 أيام عمل.\n\nشكراً لثقتك بنا." : "Dear Client,\n\nWe would like to inform you that your subscription request is being processed. You will be notified of the allocation results within 5 business days.\n\nThank you for your trust." },
    { key: "alloc", label: t.templateAlloc, subject: lang === "ar" ? "نتيجة تخصيص الأسهم" : "IPO Allocation Result", body: lang === "ar" ? "عزيزي العميل،\n\nيسعدنا إبلاغك بنتيجة تخصيص أسهم الاكتتاب. يمكنك الاطلاع على تفاصيل التخصيص من خلال تسجيل الدخول للمنصة.\n\nشكراً." : "Dear Client,\n\nWe are pleased to inform you of your IPO allocation result. Please log in to the platform to view your allocation details.\n\nThank you." },
    { key: "refund", label: t.templateRefund, subject: lang === "ar" ? "استرداد المبلغ الفائض" : "Excess Amount Refund Notice", body: lang === "ar" ? "عزيزي العميل،\n\nيتم معالجة استرداد المبلغ الفائض من اكتتابك حالياً. سيتم إيداع المبلغ خلال 3-5 أيام عمل.\n\nشكراً." : "Dear Client,\n\nThe excess amount from your IPO subscription is currently being refunded. The amount will be credited within 3-5 business days.\n\nThank you." },
  ];

  const handleSend = () => {
    if (!subject.trim() || !body.trim()) return;
    setIsSending(true);
    setTimeout(() => {
      const n = audienceRecipients[audience];
      const msg: CommMessage = {
        id: "MSG-" + Math.floor(100 + Math.random() * 900),
        timestamp: new Date().toLocaleString(lang === "ar" ? "ar-EG" : "en-GB"),
        channel, audience: audience === "all" ? t.audienceAll : audience === "group" ? t.audienceGroup : audience === "individual" ? t.audienceIndividual : t.audienceUpload,
        subject, body, recipients: n, status: "Sent", sentBy: "admin",
      };
      setHistory(prev => [msg, ...prev]);
      setSubject(""); setBody(""); setIsSending(false);
      toast({ title: t.toastCommSent, description: t.toastCommSentDesc(n) });
      setTab("history");
    }, 800);
  };

  const channelIcon = { email: Mail, sms: Smartphone, notification: Bell };
  const channelColors: Record<CommChannel, string> = { email: "bg-blue-500/10 text-blue-600 border-blue-500/20", sms: "bg-green-500/10 text-green-600 border-green-500/20", notification: "bg-primary/10 text-primary border-primary/20" };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">{t.commTitle}</h2>
          <p className="text-muted-foreground text-sm">{t.commDesc}</p>
        </div>
        <div className="flex gap-2">
          <TabBtn id="comm-compose" active={tab === "compose"} onClick={() => setTab("compose")} icon={SendIcon}>{t.commTabCompose}</TabBtn>
          <TabBtn id="comm-history" active={tab === "history"} onClick={() => setTab("history")} icon={ScrollText}>{t.commTabHistory}</TabBtn>
        </div>
      </div>

      {tab === "compose" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Config */}
          <div className="space-y-5">
            {/* Channel */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">{t.colChannel}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(["email", "sms", "notification"] as CommChannel[]).map(ch => {
                  const Icon = channelIcon[ch];
                  const label = ch === "email" ? t.channelEmail : ch === "sms" ? t.channelSMS : t.channelNotif;
                  return (
                    <button key={ch} onClick={() => setChannel(ch)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${channel === ch ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                      <div className={`p-1.5 rounded-lg ${channel === ch ? "bg-primary/10" : "bg-muted"}`}><Icon className={`w-4 h-4 ${channel === ch ? "text-primary" : "text-muted-foreground"}`} /></div>
                      <span className={`font-bold text-sm ${channel === ch ? "text-primary" : "text-foreground"}`}>{label}</span>
                      {channel === ch && <CheckCircle2 className="w-4 h-4 text-primary ms-auto" />}
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            {/* Audience */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">{t.colAudience}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {([["all", t.audienceAll, Users], ["group", t.audienceGroup, Filter], ["individual", t.audienceIndividual, User], ["upload", t.audienceUpload, UploadIcon]] as [CommAudience, string, React.ElementType][]).map(([key, label, Icon]) => (
                  <button key={key} onClick={() => setAudience(key)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${audience === key ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                    <Icon className={`w-4 h-4 ${audience === key ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`font-bold text-sm ${audience === key ? "text-primary" : "text-foreground"}`}>{label}</span>
                    {audience === key && <CheckCircle2 className="w-4 h-4 text-primary ms-auto" />}
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Audience detail */}
            {audience === "group" && (
              <Card>
                <CardContent className="pt-4">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">{t.groupSelectLabel}</label>
                  <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}
                    className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-ring outline-none">
                    <option value="groupAllClients">{t.groupAllClients}</option>
                    <option value="groupIndividuals">{t.groupIndividuals}</option>
                    <option value="groupCorporates">{t.groupCorporates}</option>
                  </select>
                </CardContent>
              </Card>
            )}
            {audience === "individual" && (
              <Card>
                <CardContent className="pt-4">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">{t.clientCodeLabel}</label>
                  <Input value={clientCode} onChange={e => setClientCode(e.target.value)} placeholder="8800318 / +20100..." dir="ltr" />
                </CardContent>
              </Card>
            )}
            {audience === "upload" && (
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">{t.uploadListLabel}</label>
                  <input ref={uploadRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => setUploadedFile(e.target.files?.[0]?.name ?? null)} />
                  <Button variant="outline" size="sm" className="w-full" onClick={() => uploadRef.current?.click()}>
                    <UploadIcon className="w-4 h-4 me-2" />{t.uploadListBtn}
                  </Button>
                  {uploadedFile && <p className="text-xs text-green-600 font-bold flex items-center gap-1"><CheckCheck className="w-3.5 h-3.5" />{uploadedFile}</p>}
                </CardContent>
              </Card>
            )}

            {/* Recipients preview */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4 flex items-center justify-between">
                <span className="text-sm font-bold text-muted-foreground">{t.recipientsLabel}</span>
                <span className="text-2xl font-black text-primary">{audienceRecipients[audience].toLocaleString()}</span>
              </CardContent>
            </Card>
          </div>

          {/* Right: Compose */}
          <div className="lg:col-span-2 space-y-5">
            {/* Templates */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm text-muted-foreground">Quick Templates</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {TEMPLATES.map(tpl => (
                  <button key={tpl.key} onClick={() => { setSubject(tpl.subject); setBody(tpl.body); }}
                    className="px-3 py-1.5 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 text-xs font-bold text-foreground transition-colors">
                    {tpl.label}
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5 space-y-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">{t.subjectLabel}</label>
                  <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder={t.subjectPlaceholder} dir="auto" />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">{t.messageLabel}</label>
                  <textarea value={body} onChange={e => setBody(e.target.value)} placeholder={t.messagePlaceholder} dir="auto"
                    rows={10} className="w-full border border-input rounded-xl px-4 py-3 text-sm bg-background focus:ring-2 focus:ring-ring outline-none resize-none font-sans leading-relaxed" />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {channel === "email" && <Mail className="w-3.5 h-3.5" />}
                    {channel === "sms" && <Smartphone className="w-3.5 h-3.5" />}
                    {channel === "notification" && <Bell className="w-3.5 h-3.5" />}
                    <span>{channel === "email" ? t.channelEmail : channel === "sms" ? t.channelSMS : t.channelNotif}</span>
                    <span>•</span>
                    <span>{audienceRecipients[audience]} {lang === "ar" ? "مستلم" : "recipient(s)"}</span>
                  </div>
                  <Button onClick={handleSend} disabled={isSending || !subject.trim() || !body.trim()} className="gap-2">
                    {isSending ? <span className="animate-spin">⟳</span> : <SendIcon className="w-4 h-4" />}
                    {t.sendBtn}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {tab === "history" && (
        <Card>
          <CardHeader><CardTitle>{t.commHistTitle}</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    {[t.colSentAt, t.colChannel, t.colAudience, t.colSubject, t.colRecipients, t.colCommStatus].map(col => (
                      <TableHead key={col} className="font-black text-[10px] uppercase tracking-widest text-muted-foreground whitespace-nowrap">{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map(msg => {
                    const Icon = channelIcon[msg.channel];
                    return (
                      <TableRow key={msg.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">{msg.timestamp}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${channelColors[msg.channel]} gap-1 whitespace-nowrap`}>
                            <Icon className="w-3 h-3" />
                            {msg.channel === "email" ? t.channelEmail : msg.channel === "sms" ? t.channelSMS : t.channelNotif}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{msg.audience}</TableCell>
                        <TableCell className="font-bold text-sm max-w-[200px] truncate">{msg.subject}</TableCell>
                        <TableCell className="text-sm font-black text-primary text-right">{msg.recipients.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={msg.status === "Sent" ? "bg-green-500/10 text-green-600 border-green-500/20" : msg.status === "Pending" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"}>
                            {msg.status === "Sent" ? t.commStatusSent : msg.status === "Pending" ? t.commStatusPending : t.commStatusFailed}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
// Front Office
// ─────────────────────────────────────────────────────────────────────────────
function FrontOffice({ onNewSubscription }: { onNewSubscription: (s: Subscription) => void }) {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [ucInput, setUcInput] = useState("");
  const [foundClient, setFoundClient] = useState<ClientRecord | null>(null);
  const [pendingSub, setPendingSub] = useState<Subscription | null>(null);
  const numLocale = lang === "ar" ? "ar-EG" : "en-US";
  const STEPS = [t.step1, t.step2, t.step3, t.step4];
  const DOCS = [t.doc1, t.doc2, t.doc3, t.doc4];
  const EVENTS = [{ value: "SOO", label: t.eventSOO }, { value: "CAP", label: t.eventCAP }, { value: "RIGHTS", label: t.eventRIGHTS }];
  const sharesSchema = z.object({ requestedShares: z.coerce.number().min(1, t.sharesError), paymentMethod: z.string().min(1) });
  const form = useForm<z.infer<typeof sharesSchema>>({ resolver: zodResolver(sharesSchema), defaultValues: { requestedShares: 0, paymentMethod: "Direct Debit" } });
  const watchedShares = form.watch("requestedShares");
  const totalDue = (Number(watchedShares) || 0) * TOTAL_PER_SHARE;

  const onSubmitStep2 = (values: z.infer<typeof sharesSchema>) => {
    if (!foundClient) return;
    const sub: Subscription = {
      id: "TX-" + Math.floor(1000 + Math.random() * 9000),
      nameAr: foundClient.nameAr, nameEn: foundClient.nameEn,
      nationalId: foundClient.nationalId, account: foundClient.account, unifiedCode: foundClient.unifiedCode,
      requestedShares: values.requestedShares, amountDue: values.requestedShares * TOTAL_PER_SHARE,
      amountPaid: values.requestedShares * TOTAL_PER_SHARE,
      allocatedShares: 0, refundAmount: 0, status: "Pending Review",
      branch: "Cairo-Main", submittedAt: new Date().toLocaleString(lang === "ar" ? "ar-EG" : "en-GB"),
    };
    setPendingSub(sub); setStep(3);
  };
  const handleFinalSubmit = () => {
    if (!pendingSub) return;
    onNewSubscription(pendingSub);
    toast({ title: t.toastSentTitle, description: t.toastSentDesc(pendingSub.id) });
    setStep(1); setUcInput(""); setFoundClient(null); setPendingSub(null); form.reset();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {STEPS.map((label, i) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <button type="button" onClick={() => { if (i + 1 < step) setStep(i + 1); }}
                  className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm transition-all border-2 ${step === i + 1 ? "bg-primary border-primary/20 text-primary-foreground scale-110 shadow-md" : step > i + 1 ? "bg-green-500 border-green-200 text-white" : "bg-muted border-transparent text-muted-foreground"}`}>
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
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">{t.unifiedCodeLabel}</label>
                <Input value={ucInput} onChange={e => { setUcInput(e.target.value); setFoundClient(null); }} onBlur={() => setFoundClient(MOCK_CLIENTS[ucInput] ?? null)} placeholder={t.unifiedCodePlaceholder} dir="ltr" />
                <p className="text-xs text-muted-foreground">{t.unifiedCodeHint}</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">{t.eventLabel}</label>
                <select className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-ring outline-none">
                  {EVENTS.map(ev => <option key={ev.value} value={ev.value}>{ev.label}</option>)}
                </select>
              </div>
            </div>
            {foundClient && (
              <div className="bg-primary text-primary-foreground p-6 rounded-2xl shadow-lg space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <p className="text-primary-foreground/70 text-xs font-bold uppercase tracking-widest mb-1">{t.mcdrVerified}</p>
                    <h3 className="text-xl font-bold">{clientName(foundClient.nameAr, foundClient.nameEn, lang)}</h3>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-primary-foreground/80">
                      <span>{t.unifiedCode}: <span className="font-mono text-primary-foreground">{foundClient.unifiedCode}</span></span>
                      <span>{t.accountNo}: <span className="font-mono text-primary-foreground">{foundClient.account}</span></span>
                      <Badge variant="outline" className={foundClient.isBankClient ? "bg-green-500/20 text-green-100 border-green-300/30" : "bg-white/10 text-primary-foreground/70 border-white/20"}>
                        {foundClient.isBankClient ? t.bankClientYes : t.bankClientNo}
                      </Badge>
                    </div>
                    {foundClient.isBankClient && <p className="text-xs text-primary-foreground/70 mt-1">{t.bankAccLabel}: <span className="font-mono text-primary-foreground">{foundClient.bankAccountNo}</span></p>}
                  </div>
                  <Button variant="secondary" className="shrink-0 font-bold" onClick={() => setStep(2)}>{t.nextStep}</Button>
                </div>
                <div className="grid grid-cols-2 gap-3 border-t border-white/20 pt-4">
                  <div className="bg-white/10 rounded-xl p-3"><p className="text-primary-foreground/60 text-xs mb-1">{t.cashBalanceLabel}</p><p className="font-black text-lg">{foundClient.cashBalance.toLocaleString(numLocale)} <span className="text-sm font-normal">{t.egp}</span></p></div>
                  <div className="bg-white/10 rounded-xl p-3"><p className="text-primary-foreground/60 text-xs mb-1">{t.eligibleIPOLabel}</p><p className="font-black text-lg">{foundClient.eligibleShares.toLocaleString(numLocale)} <span className="text-sm font-normal">{t.shares}</span></p></div>
                </div>
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
                      <FormItem><FormLabel>{t.sharesLabel}</FormLabel><FormControl><Input type="number" placeholder="0" dir="ltr" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                      <FormItem><FormLabel>{t.paymentLabel}</FormLabel><FormControl>
                        <select className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-ring outline-none" {...field}>
                          <option value="Direct Debit">{t.payDirect}</option>
                          <option value="Cash Deposit">{t.payCash}</option>
                          <option value="Certified Check">{t.payCheck}</option>
                        </select>
                      </FormControl><FormMessage /></FormItem>
                    )} />
                    {foundClient && (
                      <div className="grid grid-cols-2 gap-3 p-4 bg-muted/50 rounded-xl border">
                        <div><p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">{t.cashBalanceLabel}</p><p className="font-black text-primary">{foundClient.cashBalance.toLocaleString(numLocale)} {t.egp}</p></div>
                        <div><p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">{t.eligibleIPOLabel}</p><p className="font-black text-primary">{foundClient.eligibleShares.toLocaleString(numLocale)} {t.shares}</p></div>
                      </div>
                    )}
                  </div>
                  <Card className="bg-muted/50 border-dashed">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t.orderSummary}</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">{t.stockPriceLabel}</span><span className="font-bold">{TOTAL_PER_SHARE} {t.egp}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">{t.parValue}</span><span className="font-bold">{PAR_VALUE} {t.egp}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">{t.issueFees}</span><span className="font-bold">{ISSUE_FEES} {t.egp}</span></div>
                      <div className="border-t pt-3 flex justify-between items-center">
                        <span className="font-bold">{t.totalDue}</span>
                        <span className="text-xl font-black text-primary">{totalDue.toLocaleString(numLocale)} {t.egp}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <Button type="submit" className="px-10">{t.confirmDocs}</Button>
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
              {DOCS.map(doc => (
                <div key={doc} className="border-2 border-dashed border-border p-5 rounded-xl flex items-center justify-between hover:border-primary/40 transition-colors">
                  <span className="font-bold text-sm">{doc}</span>
                  <label className="cursor-pointer">
                    <input type="file" className="hidden" />
                    <span className="flex items-center gap-1.5 bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"><Upload className="w-3.5 h-3.5" />{t.uploadBtn}</span>
                  </label>
                </div>
              ))}
            </div>
            <Button className="mt-2 px-10" onClick={() => setStep(4)}>{t.reviewReceipt}</Button>
          </CardContent>
        </Card>
      )}

      {step === 4 && pendingSub && (
        <Card>
          <CardContent className="pt-8">
            <div className="max-w-xl mx-auto text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto"><CheckCircle2 className="w-8 h-8" /></div>
              <div>
                <h2 className="text-2xl font-black">{t.subPrepared}</h2>
                <p className="text-muted-foreground mt-1">{t.txPrefix}: <span className="font-mono font-bold text-foreground">{pendingSub.id}</span></p>
              </div>
              <Card className="bg-muted/50">
                <CardContent className="pt-5 grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{t.clientLabel}</p><p className="font-bold">{clientName(pendingSub.nameAr, pendingSub.nameEn, lang)}</p></div>
                  <div><p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{t.sharesCol}</p><p className="font-bold text-primary">{pendingSub.requestedShares.toLocaleString(numLocale)} {t.shares}</p></div>
                  <div><p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{t.totalAmtLabel}</p><p className="font-bold">{pendingSub.amountDue.toLocaleString(numLocale)} {t.egp}</p></div>
                  <div><p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{t.statusLabel}</p><p className="font-bold text-orange-500">{t.awaitingVerif}</p></div>
                </CardContent>
              </Card>
              <div className="flex gap-3 justify-center flex-wrap">
                <Button variant="outline" onClick={() => downloadReceipt(pendingSub, lang)}><Printer className="w-4 h-4 me-2" />{t.printReceipt}</Button>
                <Button onClick={handleFinalSubmit}><Send className="w-4 h-4 me-2" />{t.submitForReview}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Supervisor Checker
// ─────────────────────────────────────────────────────────────────────────────
function SupervisorChecker({ subscriptions, onApprove }: { subscriptions: Subscription[]; onApprove: (ids: string[]) => void }) {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const numLocale = lang === "ar" ? "ar-EG" : "en-US";
  const pending = subscriptions.filter(s => s.status === "Pending Review");
  const shown = subscriptions.filter(s => s.status === "Pending Review" || s.status === "Approved");
  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const handleApprove = (ids: string[]) => { onApprove(ids); setSelected(new Set()); toast({ title: t.toastApprovedTitle, description: t.toastApprovedDesc(ids.length) }); };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-black tracking-tight">{t.checkerTitle}</h2><p className="text-muted-foreground text-sm">{t.checkerDesc}</p></div>
        <div className="flex gap-2 flex-wrap">
          {selected.size > 0 && <Button size="sm" onClick={() => handleApprove([...selected])}><CheckCircle2 className="w-4 h-4 me-2" />{t.approveBtn} ({selected.size})</Button>}
          {pending.length > 0 && <Button size="sm" variant="outline" onClick={() => handleApprove(pending.map(s => s.id))}><UserCheck className="w-4 h-4 me-2" />{t.approveAllBtn}</Button>}
        </div>
      </div>
      {pending.length > 0 && <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-2xl px-5 py-3 text-orange-700 dark:text-orange-400 font-bold text-sm">{t.pendingReviewCount(pending.length)}</div>}
      <Card>
        <CardContent className="pt-4">
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <Table>
              <TableHeader>
                <TableRow className="bg-orange-50/50 dark:bg-orange-900/10">
                  <TableHead className="w-10"></TableHead>
                  {[t.colInvestor, t.colBranch, t.sharesCol, t.totalAmtLabel, t.colSubmittedAt, t.colStatus, t.colAction].map(col => (
                    <TableHead key={col} className="font-black text-[10px] uppercase tracking-widest text-orange-600 whitespace-nowrap">{col}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">{t.noRecords}</TableCell></TableRow> : shown.map(sub => (
                  <TableRow key={sub.id} className={`hover:bg-muted/30 transition-colors ${selected.has(sub.id) ? "bg-primary/5" : ""}`}>
                    <TableCell>{sub.status === "Pending Review" && <input type="checkbox" className="rounded" checked={selected.has(sub.id)} onChange={() => toggleSelect(sub.id)} />}</TableCell>
                    <TableCell><p className="font-bold text-sm">{clientName(sub.nameAr, sub.nameEn, lang)}</p><p className="text-xs font-mono text-muted-foreground">{sub.unifiedCode}</p></TableCell>
                    <TableCell className="text-sm font-bold text-muted-foreground">{sub.branch}</TableCell>
                    <TableCell className="text-sm font-bold">{sub.requestedShares.toLocaleString(numLocale)}</TableCell>
                    <TableCell className="text-sm font-black text-primary">{sub.amountDue.toLocaleString(numLocale)} {t.egp}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">{sub.submittedAt}</TableCell>
                    <TableCell><SubBadge status={sub.status} /></TableCell>
                    <TableCell>{sub.status === "Pending Review" && <div className="flex gap-2"><button onClick={() => handleApprove([sub.id])} className="text-green-600 font-black text-[10px] uppercase hover:underline">{t.approveBtn}</button><button className="text-red-500 font-black text-[10px] uppercase hover:underline">{t.rejectBtn}</button></div>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Back Office
// ─────────────────────────────────────────────────────────────────────────────
function BackOffice({ subscriptions, onAllocate, onRefund }: { subscriptions: Subscription[]; onAllocate: () => void; onRefund: () => void }) {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [boTab, setBoTab] = useState<"MCDR" | "Allocation" | "Refunds" | "Reconciliation">("MCDR");
  const [reconFilter, setReconFilter] = useState("All");
  const [mcdrUploaded, setMcdrUploaded] = useState(false);
  const mcdrRef = useRef<HTMLInputElement>(null);
  const numLocale = lang === "ar" ? "ar-EG" : "en-US";
  const clearingSubs = subscriptions.filter(s => s.status !== "Pending Review");
  const allocatedSubs = subscriptions.filter(s => s.allocatedShares > 0);
  const refundedSubs = subscriptions.filter(s => s.refundAmount > 0);
  const RECON_FILTERS = [{ key: "All", label: t.filterAll }, { key: "Verified", label: t.filterVerified }, { key: "Shortfall", label: t.filterShortfall }, { key: "Pending Payment", label: t.filterPending }, { key: "Allocated", label: t.filterAllocated }, { key: "Refunded", label: t.filterRefunded }];
  const filteredRecon = useMemo(() => reconFilter === "All" ? clearingSubs : clearingSubs.filter(s => s.status === reconFilter), [reconFilter, clearingSubs]);
  const totalCash = clearingSubs.reduce((sum, s) => sum + s.amountPaid, 0);
  const exceptions = clearingSubs.filter(s => s.status === "Shortfall").length;
  const totalCashDisplay = totalCash >= 1_000_000 ? `${(totalCash / 1_000_000).toFixed(2)}M` : totalCash.toLocaleString(numLocale);
  const STATS = [{ label: t.stat0, value: clearingSubs.length, color: "text-foreground" }, { label: t.stat1, value: "3.2x", color: "text-green-600" }, { label: t.stat2, value: exceptions, color: "text-red-500" }, { label: t.stat3, value: totalCashDisplay, color: "text-primary" }];
  const handleAllocate = () => { onAllocate(); toast({ title: t.toastAllocTitle, description: t.toastAllocDesc }); setBoTab("Allocation"); };
  const handleRefund = () => { onRefund(); toast({ title: t.toastRefundTitle, description: t.toastRefundDesc }); };
  const handleExport = () => { exportCSV(clearingSubs, lang); toast({ title: t.toastExported, description: t.toastExportedDesc }); };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-black tracking-tight">{t.opsHubTitle}</h2><p className="text-muted-foreground text-sm">{t.opsHubDesc}</p></div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExport}><FileSpreadsheet className="w-4 h-4 me-2" />{t.exportData}</Button>
          {boTab !== "Allocation" && boTab !== "Refunds" && <Button size="sm" onClick={handleAllocate}><ArrowLeftRight className="w-4 h-4 me-2" />{t.executeAlloc}</Button>}
          {boTab === "Refunds" && <Button size="sm" variant="outline" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" onClick={handleRefund}>{t.exportBankFile}</Button>}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATS.map((stat, i) => (
          <Card key={i}><CardContent className="pt-5 pb-5 text-center"><p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{stat.label}</p><p className={`text-3xl font-black mt-1 ${stat.color}`}>{stat.value}</p></CardContent></Card>
        ))}
      </div>
      <div className="flex flex-wrap gap-1 border-b border-border pb-3">
        <TabBtn id="bo-MCDR" active={boTab === "MCDR"} onClick={() => setBoTab("MCDR")}>{t.boTabMCDR}</TabBtn>
        <TabBtn id="bo-Allocation" active={boTab === "Allocation"} onClick={() => setBoTab("Allocation")}>{t.boTabAlloc}</TabBtn>
        <TabBtn id="bo-Refunds" active={boTab === "Refunds"} onClick={() => setBoTab("Refunds")}>{t.boTabRefunds}</TabBtn>
        <TabBtn id="bo-Reconciliation" active={boTab === "Reconciliation"} onClick={() => setBoTab("Reconciliation")}>{t.boTabRecon}</TabBtn>
      </div>

      {boTab === "MCDR" && (
        <Card>
          <CardHeader><CardTitle>{t.mcdrUploadTitle}</CardTitle><CardDescription>{t.mcdrUploadDesc}</CardDescription></CardHeader>
          <CardContent>
            {!mcdrUploaded ? (
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl py-16 gap-5">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center"><FileSpreadsheet className="w-7 h-7 text-muted-foreground" /></div>
                <div className="text-center"><p className="font-bold">{t.mcdrUploadTitle}</p><p className="text-sm text-muted-foreground mt-1">{t.mcdrUploadDesc}</p></div>
                <input ref={mcdrRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={() => setMcdrUploaded(true)} />
                <Button onClick={() => mcdrRef.current?.click()}><Upload className="w-4 h-4 me-2" />{t.uploadMCDRBtn}</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-green-600 font-bold text-sm"><CheckCircle2 className="w-5 h-5" />{t.mcdrTitle}</div>
                  <Button variant="outline" size="sm" onClick={() => setMcdrUploaded(false)}><Upload className="w-3.5 h-3.5 me-1" />{t.uploadMCDRBtn}</Button>
                </div>
                <div className="overflow-x-auto rounded-xl border border-border/50">
                  <Table>
                    <TableHeader><TableRow className="bg-muted/30">{[t.colName, t.colNatId, t.colUnified, t.colEligible, t.colSubscribed, t.colBalance, t.colStatus].map(col => <TableHead key={col} className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">{col}</TableHead>)}</TableRow></TableHeader>
                    <TableBody>
                      {INITIAL_MCDR.map(c => (
                        <TableRow key={c.id} className="hover:bg-muted/30">
                          <TableCell className="font-bold text-sm">{clientName(c.nameAr, c.nameEn, lang)}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">{c.nationalId}</TableCell>
                          <TableCell className="text-sm font-mono font-bold">{c.unifiedCode}</TableCell>
                          <TableCell className="text-sm font-bold">{c.eligibleShares.toLocaleString(numLocale)}</TableCell>
                          <TableCell className="text-sm font-black text-primary">{c.subscribedShares.toLocaleString(numLocale)}</TableCell>
                          <TableCell className="text-sm font-bold">{c.balanceEGP.toLocaleString(numLocale)}</TableCell>
                          <TableCell><Badge variant="outline" className={c.status === "Full" ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"}>{c.status === "Full" ? t.mcdrStatusFull : t.mcdrStatusPartial}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {boTab === "Allocation" && (
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex-1"><p className="text-primary font-black text-base">{t.allocBanner}</p><p className="text-foreground/70 text-sm mt-1">{t.allocRatio}: <span className="font-black text-xl text-foreground">45.0%</span></p></div>
              {allocatedSubs.length > 0 && <Button size="sm" onClick={() => setBoTab("Refunds")}>{t.proceedRefunds}</Button>}
            </div>
          </CardHeader>
          <CardContent>
            {allocatedSubs.length === 0 ? <div className="text-center py-12 text-muted-foreground"><p className="font-bold">{t.noRecords}</p><p className="text-sm mt-1">{lang === "ar" ? "نفّذ التخصيص أولاً." : "Run Execute Allocation first."}</p></div> : (
              <div className="overflow-x-auto rounded-xl border border-border/50">
                <Table>
                  <TableHeader><TableRow className="bg-primary/5">{[t.colName, t.colRequested, t.colAllocShares, t.colRatioPct, t.colTotalPaid, t.colRefundable].map(col => <TableHead key={col} className="font-black text-[10px] uppercase tracking-widest text-primary/70">{col}</TableHead>)}</TableRow></TableHeader>
                  <TableBody>
                    {allocatedSubs.map(sub => (
                      <TableRow key={sub.id} className="hover:bg-muted/30">
                        <TableCell className="font-bold text-sm">{clientName(sub.nameAr, sub.nameEn, lang)}</TableCell>
                        <TableCell className="text-sm font-bold text-muted-foreground">{sub.requestedShares.toLocaleString(numLocale)}</TableCell>
                        <TableCell className="text-sm font-black text-primary">{sub.allocatedShares.toLocaleString(numLocale)}</TableCell>
                        <TableCell><Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">45%</Badge></TableCell>
                        <TableCell className="text-sm font-bold text-muted-foreground">{sub.amountPaid.toLocaleString(numLocale)}</TableCell>
                        <TableCell className="text-sm font-black text-red-500">{((sub.requestedShares - sub.allocatedShares) * PAR_VALUE).toLocaleString(numLocale)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {boTab === "Refunds" && (
        <Card>
          <CardHeader><CardTitle>{t.refundsTitle}</CardTitle></CardHeader>
          <CardContent>
            {refundedSubs.length === 0 ? <div className="text-center py-12 text-muted-foreground"><p className="font-bold">{t.noRecords}</p><p className="text-sm mt-1">{lang === "ar" ? "لا توجد استردادات بعد." : "No refunds yet. Run allocation first."}</p></div> : (
              <div className="overflow-x-auto rounded-xl border border-border/50">
                <Table>
                  <TableHeader><TableRow className="bg-emerald-50/50 dark:bg-emerald-900/10">{[t.colName, t.colRefundAmt, t.colAllocShares, t.colStatus].map(col => <TableHead key={col} className="font-black text-[10px] uppercase tracking-widest text-emerald-600">{col}</TableHead>)}</TableRow></TableHeader>
                  <TableBody>
                    {refundedSubs.map(sub => (
                      <TableRow key={sub.id} className="hover:bg-muted/30">
                        <TableCell className="font-bold text-sm">{clientName(sub.nameAr, sub.nameEn, lang)}</TableCell>
                        <TableCell className="text-sm font-black text-emerald-600">{sub.refundAmount.toLocaleString(numLocale)} {t.egp}</TableCell>
                        <TableCell className="text-sm font-black text-primary">{sub.allocatedShares.toLocaleString(numLocale)}</TableCell>
                        <TableCell><SubBadge status={sub.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {boTab === "Reconciliation" && (
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <CardTitle>{t.reconTitle}</CardTitle>
              <div className="flex bg-muted p-1 rounded-xl gap-1 flex-wrap">
                {RECON_FILTERS.map(({ key, label }) => <button key={key} onClick={() => setReconFilter(key)} className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${reconFilter === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>)}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border border-border/50">
              <Table>
                <TableHeader><TableRow className="bg-muted/30">{[t.colInvestor, t.colBranch, t.colDue, t.colPaid, t.colAllocated, t.colRefund, t.colStatus, t.colAction].map((col, i) => <TableHead key={i} className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">{col}</TableHead>)}</TableRow></TableHeader>
                <TableBody>
                  {filteredRecon.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">{t.noRecords}</TableCell></TableRow> : filteredRecon.map(sub => (
                    <TableRow key={sub.id} className="hover:bg-muted/30">
                      <TableCell><p className="font-bold text-sm">{clientName(sub.nameAr, sub.nameEn, lang)}</p><p className="text-xs font-mono text-muted-foreground">{sub.unifiedCode}</p></TableCell>
                      <TableCell className="text-sm font-bold text-muted-foreground">{sub.branch}</TableCell>
                      <TableCell className="text-sm font-bold text-muted-foreground">{sub.amountDue.toLocaleString(numLocale)}</TableCell>
                      <TableCell className="text-sm font-black text-primary">{sub.amountPaid.toLocaleString(numLocale)}</TableCell>
                      <TableCell className="text-sm font-bold">{sub.allocatedShares > 0 ? sub.allocatedShares.toLocaleString(numLocale) : "—"}</TableCell>
                      <TableCell className="text-sm font-bold text-green-600">{sub.refundAmount > 0 ? `${sub.refundAmount.toLocaleString(numLocale)} ${t.egp}` : "—"}</TableCell>
                      <TableCell><SubBadge status={sub.status} /></TableCell>
                      <TableCell><button className="text-primary font-black text-[10px] uppercase hover:underline">{t.manualMatch}</button></TableCell>
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
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [adminTab, setAdminTab] = useState<"Users" | "CreateUser" | "Groups" | "AuditLogs">("Users");
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>(INITIAL_USERS);
  const [userGroups] = useState(INITIAL_GROUPS);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const ALL_PERMISSIONS = ["create_subscription", "view_clients", "print_receipt", "view_subscriptions", "reconcile", "allocate", "export_data", "approve_subscription", "reject_subscription", "view_branch_data", "manage_users", "manage_groups", "view_audit", "full_access"];
  const createSchema = z.object({ fullName: z.string().min(1, t.requiredField), username: z.string().min(1, t.requiredField), email: z.string().email(t.requiredField), role: z.enum(["Front Office Agent", "Back Office Ops", "Supervisor", "System Admin", "Communications"]), branch: z.string().min(1), groupId: z.string().min(1) });
  const form = useForm<z.infer<typeof createSchema>>({ resolver: zodResolver(createSchema), defaultValues: { fullName: "", username: "", email: "", role: "Front Office Agent", branch: "Cairo-Main", groupId: "GRP-001" } });
  const filteredUsers = useMemo(() => { let list = systemUsers; if (roleFilter !== "All") list = list.filter(u => u.role === roleFilter || u.status === roleFilter); if (searchQuery) list = list.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.username.toLowerCase().includes(searchQuery.toLowerCase())); return list; }, [roleFilter, searchQuery, systemUsers]);
  const onCreateUser = (values: z.infer<typeof createSchema>) => { const newUser: SystemUser = { id: "USR-" + Math.floor(100 + Math.random() * 900), name: values.fullName, username: values.username, role: values.role as SystemUser["role"], branch: values.branch, status: "Active", groupId: values.groupId, email: values.email, phone: "", lastLogin: "Never" }; setSystemUsers(prev => [newUser, ...prev]); toast({ title: t.toastUserCreated, description: t.toastUserCreatedDesc(values.fullName) }); form.reset(); setAdminTab("Users"); };
  const getRoleLabel = (role: string) => { if (role === "Front Office Agent") return t.roleFA; if (role === "Back Office Ops") return t.roleBO; if (role === "Supervisor") return t.roleSup; if (role === "Communications") return t.roleCommU; return t.roleSA; };
  const ROLE_OPTIONS = [{ value: "All", label: t.allRoles }, { value: "Front Office Agent", label: t.roleFA }, { value: "Back Office Ops", label: t.roleBO }, { value: "Supervisor", label: t.roleSup }, { value: "Communications", label: t.roleCommU }, { value: "System Admin", label: t.roleSA }];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-black tracking-tight">{t.adminTitle}</h2><p className="text-muted-foreground text-sm">{t.adminDesc}</p></div>
        <div className="flex gap-2 flex-wrap">
          {adminTab !== "Users" && <Button variant="outline" size="sm" onClick={() => setAdminTab("Users")}>{t.backToUsers}</Button>}
          {adminTab !== "CreateUser" && <Button size="sm" onClick={() => setAdminTab("CreateUser")}><UserPlus className="w-4 h-4 me-2" />{t.addNewUser}</Button>}
        </div>
      </div>
      <div className="flex flex-wrap gap-1 border-b border-border pb-3">
        <TabBtn id="admin-Users" active={adminTab === "Users"} onClick={() => setAdminTab("Users")} icon={Users}>{t.adminTabUsers}</TabBtn>
        <TabBtn id="admin-CreateUser" active={adminTab === "CreateUser"} onClick={() => setAdminTab("CreateUser")} icon={UserPlus}>{t.adminTabCreate}</TabBtn>
        <TabBtn id="admin-Groups" active={adminTab === "Groups"} onClick={() => setAdminTab("Groups")} icon={Layers}>{t.adminTabGroups}</TabBtn>
        <TabBtn id="admin-AuditLogs" active={adminTab === "AuditLogs"} onClick={() => setAdminTab("AuditLogs")} icon={ScrollText}>{t.adminTabAudit}</TabBtn>
      </div>

      {adminTab === "Users" && (
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <CardTitle>{t.usersTitle}</CardTitle>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <Input type="text" placeholder={t.searchPlaceholder} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full sm:w-60" dir="auto" />
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="border border-input rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-ring outline-none font-bold">
                  {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border border-border/50">
              <Table>
                <TableHeader><TableRow className="bg-primary/5">{[t.colUserDetails, t.colRole, t.colGroup, t.colBranchUser, t.colStatus, t.colAction].map(col => <TableHead key={col} className="font-black text-[10px] uppercase tracking-widest text-primary/70">{col}</TableHead>)}</TableRow></TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">{t.noRecords}</TableCell></TableRow> : filteredUsers.map(user => {
                    const group = userGroups.find(g => g.id === user.groupId);
                    return (
                      <TableRow key={user.id} className="hover:bg-muted/30">
                        <TableCell><p className="font-bold text-sm">{user.name}</p><p className="text-xs font-mono text-muted-foreground">@{user.username}</p></TableCell>
                        <TableCell><Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 whitespace-nowrap">{getRoleLabel(user.role)}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{group ? (lang === "ar" ? group.nameAr : group.nameEn) : "—"}</TableCell>
                        <TableCell className="text-sm font-bold text-muted-foreground">{user.branch}</TableCell>
                        <TableCell><Badge variant="outline" className={user.status === "Active" ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"}>{user.status === "Active" ? t.userStatusActive : t.userStatusSuspended}</Badge></TableCell>
                        <TableCell><div className="flex gap-3"><button className="text-primary font-black text-[10px] uppercase hover:underline">{t.editAction}</button><button className="text-red-500 font-black text-[10px] uppercase hover:underline">{t.suspendAction}</button></div></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {adminTab === "CreateUser" && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader><CardTitle>{t.createUserTitle}</CardTitle><CardDescription>{t.createUserDesc}</CardDescription></CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onCreateUser)} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField control={form.control} name="fullName" render={({ field }) => (<FormItem><FormLabel>{t.fullNameLabel}</FormLabel><FormControl><Input placeholder={t.fullNamePlaceholder} dir="auto" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="username" render={({ field }) => (<FormItem><FormLabel>{t.usernameLabel}</FormLabel><FormControl><Input placeholder={t.usernamePlaceholder} dir="ltr" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>{t.emailLabel}</FormLabel><FormControl><Input type="email" placeholder={t.emailPlaceholder} dir="ltr" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="role" render={({ field }) => (<FormItem><FormLabel>{t.systemRoleLabel}</FormLabel><FormControl><select className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-ring outline-none" {...field}><option value="Front Office Agent">{t.roleFA}</option><option value="Back Office Ops">{t.roleBO}</option><option value="Supervisor">{t.roleSup}</option><option value="Communications">{t.roleCommU}</option><option value="System Admin">{t.roleSA}</option></select></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="branch" render={({ field }) => (<FormItem><FormLabel>{t.branchDeptLabel}</FormLabel><FormControl><select className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-ring outline-none" {...field}><option value="Cairo-Main">{t.branchCairoMain}</option><option value="Alex-Branch">{t.branchAlex}</option><option value="HQ">{t.branchHQ}</option></select></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="groupId" render={({ field }) => (<FormItem><FormLabel>{t.groupLabel}</FormLabel><FormControl><select className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-ring outline-none" {...field}>{userGroups.map(g => <option key={g.id} value={g.id}>{lang === "ar" ? g.nameAr : g.nameEn}</option>)}</select></FormControl><FormMessage /></FormItem>)} />
                </div>
                <div className="flex gap-3 justify-end pt-4 border-t border-border">
                  <Button type="button" variant="outline" onClick={() => { form.reset(); setAdminTab("Users"); }}>{t.cancel}</Button>
                  <Button type="submit" className="px-8"><ShieldCheck className="w-4 h-4 me-2" />{t.saveUser}</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {adminTab === "Groups" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center"><h3 className="text-lg font-black">{t.groupsTitle}</h3><Button size="sm" variant="outline"><Layers className="w-4 h-4 me-2" />{t.addGroup}</Button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userGroups.map(group => (
              <Card key={group.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div><CardTitle className="text-base">{lang === "ar" ? group.nameAr : group.nameEn}</CardTitle><p className="text-xs text-muted-foreground mt-0.5">{group.members} {t.groupMembers}</p></div>
                    <button className="text-primary font-black text-[10px] uppercase hover:underline">{t.editAction}</button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">{t.groupPermissions}</p>
                  <div className="flex flex-wrap gap-2">
                    {ALL_PERMISSIONS.map(perm => { const granted = group.permissions.includes(perm); return (<label key={perm} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border cursor-pointer transition-colors ${granted ? "bg-primary/10 text-primary border-primary/30 font-bold" : "bg-muted text-muted-foreground border-border"}`}><input type="checkbox" className="hidden" defaultChecked={granted} readOnly />{granted ? "✓" : "○"} {perm.replace(/_/g, " ")}</label>); })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {adminTab === "AuditLogs" && (
        <Card>
          <CardHeader><CardTitle>{t.auditTitle}</CardTitle><CardDescription>{t.auditDesc}</CardDescription></CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border border-border/50">
              <Table>
                <TableHeader><TableRow className="bg-muted/30">{[t.colTimestamp, t.colUser, t.colUserRole, t.colActionAudit, t.colEntity, t.colOldValue, t.colNewValue, t.colIP].map(col => <TableHead key={col} className="font-black text-[10px] uppercase tracking-widest text-muted-foreground whitespace-nowrap">{col}</TableHead>)}</TableRow></TableHeader>
                <TableBody>
                  {INITIAL_AUDIT.map(log => (
                    <TableRow key={log.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">{log.timestamp}</TableCell>
                      <TableCell><p className="font-bold text-sm">{log.user}</p></TableCell>
                      <TableCell><Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 whitespace-nowrap text-[10px]">{log.role}</Badge></TableCell>
                      <TableCell className="text-sm font-bold whitespace-nowrap">{log.action}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">{log.entity}</TableCell>
                      <TableCell className="text-xs text-red-500 max-w-[120px] truncate">{log.oldValue}</TableCell>
                      <TableCell className="text-xs text-green-600 max-w-[150px] truncate font-bold">{log.newValue}</TableCell>
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
function IPOSystem() {
  const [lang, setLang] = useState<Lang>("en");
  const [userRole, setUserRole] = useState<UserRole>("FrontOffice");
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(INITIAL_SUBSCRIPTIONS);
  const [isAuthed, setIsAuthed] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [forgotUsername, setForgotUsername] = useState("");
  const [recoveredPassword, setRecoveredPassword] = useState("");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState(false);
  const [prefs, setPrefs] = useState<UserPrefs>({ darkMode: false, notifications: true, lang: "en" });
  const [showProfile, setShowProfile] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<SystemUser>(INITIAL_USERS[4]);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const t = T[lang];
  const isRTL = lang === "ar";
  const defaultUsername = "admin";
  const defaultPassword = "12345678";

  // Apply dark mode to document
  useEffect(() => {
    if (prefs.darkMode) { document.documentElement.classList.add("dark"); }
    else { document.documentElement.classList.remove("dark"); }
  }, [prefs.darkMode]);

  // Close menu on outside click
  useEffect(() => {
    function handle(e: MouseEvent) { if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const handlePrefsChange = (p: Partial<UserPrefs>) => setPrefs(prev => ({ ...prev, ...p }));

  const handleLogin = () => {
    if (loginForm.username === defaultUsername && loginForm.password === defaultPassword) {
      setIsAuthed(true); setLoginError(false);
      const user = INITIAL_USERS.find(u => u.username === loginForm.username) ?? INITIAL_USERS[4];
      setLoggedInUser(user);
    } else { setLoginError(true); }
  };
  const handleForgotPassword = () => setRecoveredPassword(forgotUsername === defaultUsername ? defaultPassword : "");
  const handleAllocate = () => setSubscriptions(prev => prev.map(s => s.status !== "Verified" ? s : { ...s, allocatedShares: Math.floor(s.requestedShares * 0.45), status: "Allocated" as const }));
  const handleRefund = () => setSubscriptions(prev => prev.map(s => s.status !== "Allocated" ? s : { ...s, refundAmount: (s.requestedShares - s.allocatedShares) * PAR_VALUE, status: "Refunded" as const }));
  const handleApprove = (ids: string[]) => setSubscriptions(prev => prev.map(s => ids.includes(s.id) ? { ...s, status: "Verified" as const } : s));
  const handleNewSubscription = (s: Subscription) => setSubscriptions(prev => [s, ...prev]);

  const ROLES: { key: UserRole; label: string; icon: React.ElementType }[] = [
    { key: "FrontOffice", label: t.roleFront, icon: Landmark },
    { key: "Supervisor", label: t.roleSupervisor, icon: Eye },
    { key: "BackOffice", label: t.roleBack, icon: ClipboardList },
    { key: "Communications", label: t.roleComms, icon: MessageSquare },
    { key: "SystemAdmin", label: t.roleSysAdmin, icon: ShieldCheck },
  ];

  if (!isAuthed) {
    return (
      <LangContext.Provider value={{ lang, t, isRTL }}>
        <div dir={isRTL ? "rtl" : "ltr"} className="min-h-[100dvh] bg-gradient-to-br from-background to-muted font-sans flex items-center justify-center p-6">
          <Card className="w-full max-w-md shadow-xl">
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-4">
                <div className="bg-primary text-primary-foreground p-3 rounded-2xl shadow-lg"><Landmark className="w-7 h-7" /></div>
              </div>
              <CardTitle className="text-2xl font-black">{authMode === "login" ? t.loginTitle : t.forgotTitle}</CardTitle>
              <CardDescription>{authMode === "login" ? t.loginDesc : t.forgotDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {authMode === "login" ? (
                <>
                  <div className="space-y-2"><label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">{t.usernameLabelLogin}</label><Input value={loginForm.username} onChange={e => { setLoginForm(p => ({ ...p, username: e.target.value })); setLoginError(false); }} placeholder={t.usernamePlaceholderLogin} dir="ltr" onKeyDown={e => e.key === "Enter" && handleLogin()} /></div>
                  <div className="space-y-2"><label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">{t.passwordLabelLogin}</label><Input type="password" value={loginForm.password} onChange={e => { setLoginForm(p => ({ ...p, password: e.target.value })); setLoginError(false); }} placeholder={t.passwordPlaceholderLogin} dir="ltr" onKeyDown={e => e.key === "Enter" && handleLogin()} /></div>
                  {loginError && <p className="text-sm text-red-500 font-bold flex items-center gap-2"><AlertCircle className="w-4 h-4" />{t.loginError}</p>}
                  <Button className="w-full h-11 font-bold text-base" onClick={handleLogin}><LogIn className="w-4 h-4 me-2" />{t.loginBtn}</Button>
                  <button className="text-sm font-bold text-primary w-full text-center" onClick={() => { setAuthMode("forgot"); setLoginError(false); }}>{t.forgotPassword}</button>
                </>
              ) : (
                <>
                  <div className="space-y-2"><label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">{t.usernameLabelLogin}</label><Input value={forgotUsername} onChange={e => setForgotUsername(e.target.value)} placeholder={t.usernamePlaceholderLogin} dir="ltr" /></div>
                  <Button className="w-full" onClick={handleForgotPassword}><LockKeyhole className="w-4 h-4 me-2" />{t.showPassword}</Button>
                  {recoveredPassword && <div className="rounded-xl border border-border p-4 text-sm bg-muted/30"><p className="font-bold">{t.passwordLabelLogin}: <span className="font-mono text-primary">{recoveredPassword}</span></p></div>}
                  <Button variant="outline" className="w-full" onClick={() => setAuthMode("login")}>{t.backToLogin}</Button>
                </>
              )}
            </CardContent>
          </Card>
          <div className="absolute top-4 end-4 flex gap-2">
            <button onClick={() => setPrefs(p => ({ ...p, darkMode: !p.darkMode }))} className="p-2 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-colors">
              {prefs.darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={() => setLang(l => l === "ar" ? "en" : "ar")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
              <Globe className="w-4 h-4" />{lang === "ar" ? "EN" : "عر"}
            </button>
          </div>
        </div>
      </LangContext.Provider>
    );
  }

  return (
    <LangContext.Provider value={{ lang, t, isRTL }}>
      <div dir={isRTL ? "rtl" : "ltr"} className="min-h-[100dvh] bg-background font-sans">

        {/* Header */}
        <header className="bg-card border-b px-6 py-3 sticky top-0 z-30 flex items-center justify-between shadow-sm gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-2 rounded-xl shadow-sm"><Landmark className="w-5 h-5" /></div>
            <div>
              <h1 className="text-base font-black tracking-tight text-foreground leading-tight">{t.appTitle}</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">{t.appSubtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Role switcher */}
            <div className="bg-muted p-1 rounded-xl flex gap-1 shadow-inner flex-wrap">
              {ROLES.map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setUserRole(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${userRole === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  <Icon className="w-3.5 h-3.5" />{label}
                </button>
              ))}
            </div>

            {/* Language toggle */}
            <button onClick={() => setLang(l => l === "ar" ? "en" : "ar")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
              <Globe className="w-4 h-4" />{lang === "ar" ? "EN" : "عر"}
            </button>

            {/* Notification bell */}
            <button className="relative p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
              {prefs.notifications ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              {prefs.notifications && <span className="absolute top-1 end-1 w-2 h-2 bg-primary rounded-full" />}
            </button>

            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button onClick={() => setShowUserMenu(v => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted transition-colors">
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-black">
                  {loggedInUser.name.charAt(0)}
                </div>
                <div className="hidden sm:block text-start">
                  <p className="text-xs font-black text-foreground leading-tight">{loggedInUser.name}</p>
                  <p className="text-[10px] text-muted-foreground">{loggedInUser.role}</p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
              </button>

              {showUserMenu && (
                <div className={`absolute top-full mt-2 ${isRTL ? "left-0" : "right-0"} w-52 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden`}>
                  {/* Welcome */}
                  <div className="px-4 py-3 border-b border-border bg-muted/30">
                    <p className="text-xs text-muted-foreground">{t.welcomeBack}</p>
                    <p className="font-black text-sm text-foreground">{loggedInUser.name}</p>
                  </div>
                  <div className="p-1.5">
                    <button onClick={() => { setShowProfile(true); setShowUserMenu(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-foreground hover:bg-muted transition-colors">
                      <User className="w-4 h-4 text-muted-foreground" />{t.profile}
                    </button>
                    <button onClick={() => { setShowProfile(true); setShowUserMenu(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-foreground hover:bg-muted transition-colors">
                      <Settings className="w-4 h-4 text-muted-foreground" />{t.settings}
                    </button>
                    <button onClick={() => { setPrefs(p => ({ ...p, darkMode: !p.darkMode })); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-foreground hover:bg-muted transition-colors">
                      {prefs.darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-muted-foreground" />}
                      {t.darkModeLabel}
                      <span className="ms-auto"><Toggle checked={prefs.darkMode} onChange={v => handlePrefsChange({ darkMode: v })} /></span>
                    </button>
                    <div className="my-1 border-t border-border" />
                    <button onClick={() => { setIsAuthed(false); setShowUserMenu(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <LogOut className="w-4 h-4" />{t.logout}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="px-6 py-8">
          {userRole === "FrontOffice" && <FrontOffice onNewSubscription={handleNewSubscription} />}
          {userRole === "Supervisor" && <SupervisorChecker subscriptions={subscriptions} onApprove={handleApprove} />}
          {userRole === "BackOffice" && <BackOffice subscriptions={subscriptions} onAllocate={handleAllocate} onRefund={handleRefund} />}
          {userRole === "Communications" && <CustomerComms />}
          {userRole === "SystemAdmin" && <SystemAdmin />}
        </main>

        {/* Profile slide-over */}
        {showProfile && (
          <ProfilePanel
            user={loggedInUser}
            prefs={prefs}
            onPrefsChange={handlePrefsChange}
            onClose={() => setShowProfile(false)}
          />
        )}
      </div>
    </LangContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// App entry
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <IPOSystem />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
