import { useState, useMemo, useRef, useEffect } from "react";
import { type IPOStock, INITIAL_IPO_STOCKS } from "./data/ipoStocks";
import { type Lang, T, LangContext, useLang } from "./context/lang";
import { IPOStockSetup } from "./components/IPOStockSetup";
import { Reports } from "./components/Reports";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Landmark, FileSpreadsheet, ArrowLeftRight, Printer, Send, Upload,
  CheckCircle2, Globe, Users, ShieldCheck, ClipboardList, UserPlus,
  ScrollText, LogIn, LockKeyhole, UserCheck, Eye, Layers,
  Moon, Sun, Bell, BellOff, User, Settings, LogOut, ChevronDown,
  MessageSquare, Mail, Smartphone, Upload as UploadIcon,
  Filter, Send as SendIcon, CheckCheck, AlertCircle, X,
  FileUser, Building2, MapPin, CreditCard, AlertTriangle,
  ClipboardCheck, FileCheck, ChevronRight, ChevronLeft, ListFilter,
  LayoutDashboard, TrendingUp, Activity, ArrowUpRight, ChevronUp,
  BarChart3, ShieldAlert, Wallet, UserCheck2, CalendarClock, RefreshCw,
  Zap, Network, ChevronDown as ChevronDownIcon, PlusCircle, CheckSquare,
  ActivitySquare, Clock, TrendingDown, Database, Briefcase, Lock,
  FileText, Copy,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type AuthMode = "login" | "forgot";
type UserRole = "FrontOffice" | "BackOffice" | "Supervisor" | "SystemAdmin" | "Communications";

interface Broker { id: string; name: string; code: string; email: string; }
interface Custodian { id: string; name: string; code: string; email: string; }
type SubStatus = "Pending Review" | "Approved" | "Pending Payment" | "Verified" | "Shortfall" | "Allocated" | "Refunded" | "Pending Cash" | "Pending MCDR Allocation" | "Rejected" | "Submitted" | "RPA Allocating" | "MCDR Accepted" | "MCDR Rejected";
type CommChannel = "email" | "sms" | "notification";
type CommAudience = "all" | "group" | "individual" | "upload";
type KYCStatus = "Draft" | "Pending Review" | "Approved" | "Rejected";
type KYCClientType = "individual" | "corporate";

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
  ipoId: string; date: string;
  phase: "covered" | "uncovered";
  custodian?: string; custodianCode?: string;
  broker?: string; brokerCode?: string;
  uploadedDocs?: string[];
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
interface UserPrefs { darkMode: boolean; notifications: boolean; lang: Lang; }
interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: "subscription" | "kyc" | "batch" | "system";
}

interface KYCRecord {
  id: string; clientType: KYCClientType; status: KYCStatus;
  submittedAt: string; submittedBy: string; branch: string;
  // Individual
  nameAr: string; nameEn: string; dob: string; nationality: string;
  gender: string; motherName: string; maritalStatus: string;
  nationalId: string; passportNo: string; idExpiry: string;
  // Corporate
  companyNameAr: string; companyNameEn: string;
  commercialRegNo: string; taxId: string; industryType: string;
  legalForm: string; incorporationDate: string;
  // Common identity
  unifiedCode: string;
  // Address
  addressLine1: string; addressLine2: string;
  city: string; governorate: string; postalCode: string; country: string;
  mailingAddressSame: boolean; mailingAddress: string;
  // Contact
  email: string; mobile: string; phone: string;
  // Bank
  bankName: string; accountNo: string; iban: string; accountCurrency: string;
  // Risk
  riskLevel: "Low" | "Medium" | "High";
  sourceOfFunds: string; occupation: string;
  pepStatus: boolean; sanctionsCheck: boolean;
  annualIncome: string; netWorth: string;
  // Documents & POA
  uploadedDocs: string[];
  hasPOA: boolean; poaHolderName: string; poaExpiry: string; poaScope: string;
}


// ─────────────────────────────────────────────────────────────────────────────
// Constants & Mock Data
// ─────────────────────────────────────────────────────────────────────────────
const PAR_VALUE = 18.50;
const ISSUE_FEES = 0.25;
const TOTAL_PER_SHARE = PAR_VALUE + ISSUE_FEES;

const MOCK_CLIENTS: Record<string, ClientRecord> = {
  "8800318": { nameAr: "حسين سليم محمد علي", nameEn: "Hussein Salim Mohamed Ali", unifiedCode: "8800318", nationalId: "28512111234567", account: "100003456", isBankClient: true, bankAccountNo: "EG290011-10034-56", cashBalance: 150000, eligibleShares: 12000, email: "hussein.salim@email.com", mobile: "+201001234567", type: "individual" },
  "7700123": { nameAr: "أحمد محمد علي", nameEn: "Ahmed Mohamed Ali", unifiedCode: "7700123", nationalId: "29001011234567", account: "100234567", isBankClient: true, bankAccountNo: "EG290011-23456-78", cashBalance: 85000, eligibleShares: 8000, email: "ahmed.ali@email.com", mobile: "+201112345678", type: "individual" },
  "3400127": { nameAr: "منى كمال عبد الرحمن", nameEn: "Mona Kamal Abdel Rahman", unifiedCode: "3400127", nationalId: "29203154321098", account: "100078923", isBankClient: true, bankAccountNo: "EG290011-07892-31", cashBalance: 200000, eligibleShares: 15000, email: "mona.kamal@email.com", mobile: "+201554321098", type: "individual" },
  "8800317": { nameAr: "", nameEn: "", unifiedCode: "8800317", nationalId: "—", account: "—", isBankClient: false, bankAccountNo: "", cashBalance: 0, eligibleShares: 0, email: "", mobile: "", type: "individual" },
};

const INITIAL_BROKERS: Broker[] = [
  { id: "BRK-001", name: "EFG Hermes Securities", code: "EFG", email: "info@efghermes.com" },
  { id: "BRK-002", name: "Beltone Financial", code: "BLT", email: "info@beltone.com.eg" },
  { id: "BRK-003", name: "CI Capital", code: "CIC", email: "brokerage@cicapital.com.eg" },
];
const INITIAL_CUSTODIANS: Custodian[] = [
  { id: "CUS-001", name: "Misr for Central Clearing", code: "MCDR", email: "clearing@mcdr.com.eg" },
  { id: "CUS-002", name: "QNB Custody Services", code: "QNBC", email: "custody@qnb.com.eg" },
  { id: "CUS-003", name: "CIB Custodian", code: "CIBC", email: "custody@cib.com.eg" },
];

const INITIAL_SUBSCRIPTIONS: Subscription[] = [
  { id: "TX-9901", nameAr: "أحمد محمد علي", nameEn: "Ahmed Mohamed Ali", nationalId: "29001011234567", account: "100234567", unifiedCode: "7700123", requestedShares: 10000, amountDue: 12500, amountPaid: 12500, allocatedShares: 0, refundAmount: 0, status: "Verified", branch: "Cairo-Main", submittedAt: "2026-05-13 09:10", ipoId: "IPO-ADIB", date: "2026-05-13", phase: "covered", custodian: "QNB Custody Services", custodianCode: "QNBC", broker: "EFG Hermes Securities", brokerCode: "EFG", uploadedDocs: ["National ID Copy", "Signed Subscription Form", "Custodian Statement"] },
  { id: "TX-9903", nameAr: "حسين سليم محمد علي", nameEn: "Hussein Salim Mohamed Ali", nationalId: "28512111234567", account: "100003456", unifiedCode: "8800318", requestedShares: 8000, amountDue: 10000, amountPaid: 10000, allocatedShares: 0, refundAmount: 0, status: "Pending Review", branch: "Giza-Hub", submittedAt: "2026-05-14 08:45", ipoId: "IPO-ADIB", date: "2026-05-14", phase: "covered", custodian: "Misr for Central Clearing", custodianCode: "MCDR", broker: "Beltone Financial", brokerCode: "BLT", uploadedDocs: ["National ID Copy", "Signed Subscription Form"] },
  { id: "TX-9904", nameAr: "رنا الشافعي إبراهيم", nameEn: "Rana El-Shafei Ibrahim", nationalId: "28805051234568", account: "100334455", unifiedCode: "7744312", requestedShares: 5000, amountDue: 6250, amountPaid: 6250, allocatedShares: 0, refundAmount: 0, status: "Pending Review", branch: "Alex-Branch", submittedAt: "2026-05-14 11:30", ipoId: "IPO-EDITA", date: "2026-05-14", phase: "covered", custodian: "CIB Custodian", custodianCode: "CIBC", broker: "CI Capital", brokerCode: "CIC", uploadedDocs: ["National ID Copy", "Custodian Statement", "POA (if applicable)"] },
  { id: "TX-9905", nameAr: "منى كمال عبد الرحمن", nameEn: "Mona Kamal Abdel Rahman", nationalId: "29203154321098", account: "100078923", unifiedCode: "3400127", requestedShares: 12000, amountDue: 15000, amountPaid: 15000, allocatedShares: 0, refundAmount: 0, status: "Pending MCDR Allocation", branch: "Cairo-Main", submittedAt: "2026-05-15 10:20", ipoId: "IPO-ADIB", date: "2026-05-15", phase: "covered", custodian: "QNB Custody Services", custodianCode: "QNBC", broker: "EFG Hermes Securities", brokerCode: "EFG", uploadedDocs: ["National ID Copy", "Signed Subscription Form", "Custodian Statement"] },
  { id: "REF-TXT-001", nameAr: "طارق سالم منصور", nameEn: "Tarek Salem Mansour", nationalId: "28709141234599", account: "100091234", unifiedCode: "6600891", requestedShares: 7500, amountDue: 9375, amountPaid: 0, allocatedShares: 0, refundAmount: 0, status: "Pending Cash", branch: "Alex-Branch", submittedAt: "2026-05-15 14:05", ipoId: "IPO-ADIB", date: "2026-05-15", phase: "covered", custodian: "CIB Custodian", custodianCode: "CIBC", broker: "Beltone Financial", brokerCode: "BLT", uploadedDocs: ["National ID Copy"] },
];

const INITIAL_MCDR = [
  { id: 1, nameAr: "حسين سليم محمد علي", nameEn: "Hussein Salim Mohamed Ali", unifiedCode: "8800318", nationalId: "28512111234567", eligibleShares: 12000, subscribedShares: 8000, balanceEGP: 150000, status: "Partial" as const },
  { id: 2, nameAr: "رنا الشافعي إبراهيم", nameEn: "Rana El-Shafei Ibrahim", unifiedCode: "7744312", nationalId: "28805051234568", eligibleShares: 5000, subscribedShares: 5000, balanceEGP: 80000, status: "Full" as const },
  { id: 3, nameAr: "أحمد محمد علي", nameEn: "Ahmed Mohamed Ali", unifiedCode: "7700123", nationalId: "29001011234567", eligibleShares: 8000, subscribedShares: 8000, balanceEGP: 85000, status: "Full" as const },
  { id: 4, nameAr: "منى كمال عبد الرحمن", nameEn: "Mona Kamal Abdel Rahman", unifiedCode: "3400127", nationalId: "29203154321098", eligibleShares: 15000, subscribedShares: 12000, balanceEGP: 200000, status: "Partial" as const },
];

const INITIAL_USERS: SystemUser[] = [
  { id: "USR-001", name: "Ahmed Hassan", username: "ahmed.h", role: "Front Office Agent", branch: "Cairo-Main", status: "Active", groupId: "GRP-001", email: "ahmed.h@bank.com", phone: "+201001112233", lastLogin: "2026-05-15 08:30" },
  { id: "USR-002", name: "Mahmoud Saad", username: "mahmoud.s", role: "Back Office Ops", branch: "HQ", status: "Active", groupId: "GRP-002", email: "mahmoud.s@bank.com", phone: "+201112223344", lastLogin: "2026-05-15 09:05" },
  { id: "USR-003", name: "Layla Yousef", username: "layla.y", role: "Supervisor", branch: "Cairo-Main", status: "Active", groupId: "GRP-003", email: "layla.y@bank.com", phone: "+201223334455", lastLogin: "2026-05-14 14:20" },
  { id: "USR-004", name: "Hussein Saleem", username: "hsileem", role: "System Admin", branch: "HQ", status: "Active", groupId: "GRP-004", email: "h.saleem@bank.com", phone: "+201334445566", lastLogin: "2026-05-15 07:55" },
  { id: "USR-005", name: "Admin User", username: "admin", role: "System Admin", branch: "HQ", status: "Active", groupId: "GRP-004", email: "admin@bank.com", phone: "+201000000000", lastLogin: "2026-05-15 09:30" },
];

const INITIAL_GROUPS = [
  { id: "GRP-001", nameAr: "موظفو الفرع", nameEn: "Branch Officers", members: 12, permissions: ["create_subscription", "view_clients", "print_receipt", "kyc_maker"] },
  { id: "GRP-002", nameAr: "موظفو المقاصة", nameEn: "Clearing Officers", members: 5, permissions: ["view_subscriptions", "reconcile", "allocate", "export_data"] },
  { id: "GRP-003", nameAr: "المشرفون", nameEn: "Supervisors", members: 3, permissions: ["approve_subscription", "reject_subscription", "kyc_checker", "view_branch_data"] },
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

const INITIAL_COMM_HISTORY = [
  { id: "MSG-001", timestamp: "2026-05-13 10:00", channel: "email" as CommChannel, audience: "All Clients", subject: "IPO Subscription Confirmation", body: "Your subscription has been received...", recipients: 240, status: "Sent" as const, sentBy: "admin" },
  { id: "MSG-002", timestamp: "2026-05-14 09:00", channel: "sms" as CommChannel, audience: "Individual Investors", subject: "Allocation Result", body: "Dear client, your shares have been allocated...", recipients: 185, status: "Sent" as const, sentBy: "admin" },
  { id: "MSG-003", timestamp: "2026-05-14 11:30", channel: "notification" as CommChannel, audience: "Corporate Clients", subject: "Refund Processing Notice", body: "Your refund is being processed...", recipients: 55, status: "Pending" as const, sentBy: "admin" },
];

const INITIAL_KYC_RECORDS: KYCRecord[] = [
  {
    id: "KYC-0011", clientType: "individual", status: "Approved",
    submittedAt: "2026-05-12 09:00", submittedBy: "ahmed.h", branch: "Cairo-Main",
    nameAr: "أحمد محمد علي", nameEn: "Ahmed Mohamed Ali",
    dob: "1990-01-10", nationality: "Egyptian", gender: "Male", motherName: "Fatma Ibrahim", maritalStatus: "Married",
    nationalId: "29001011234567", passportNo: "A12345678", idExpiry: "2028-05-01",
    companyNameAr: "", companyNameEn: "", commercialRegNo: "", taxId: "", industryType: "", legalForm: "", incorporationDate: "",
    unifiedCode: "7700123",
    addressLine1: "12 Nile St, Dokki", addressLine2: "Apt 5", city: "Giza", governorate: "Giza",
    postalCode: "12311", country: "Egypt", mailingAddressSame: true, mailingAddress: "",
    email: "ahmed.ali@email.com", mobile: "+201112345678", phone: "",
    bankName: "National Bank of Egypt", accountNo: "100234567", iban: "EG290011-23456-78", accountCurrency: "EGP",
    riskLevel: "Low", sourceOfFunds: "Employment Income", occupation: "Engineer",
    pepStatus: false, sanctionsCheck: true, annualIncome: "300,000 EGP", netWorth: "1,200,000 EGP",
    uploadedDocs: ["National ID", "Bank Statement"],
    hasPOA: false, poaHolderName: "", poaExpiry: "", poaScope: "",
  },
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
    "Pending Cash": { label: t.statusPendingCash, cls: "bg-red-500/10 text-red-600 border-red-500/20" },
    "Pending MCDR Allocation": { label: t.statusPendingMCDR, cls: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
    "Rejected": { label: t.statusRejected, cls: "bg-red-600/10 text-red-700 border-red-600/20" },
    "Submitted": { label: t.statusSubmitted, cls: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    "RPA Allocating": { label: t.statusRpaAllocating, cls: "bg-amber-600/10 text-amber-600 border-amber-600/20" },
    "MCDR Accepted": { label: t.statusMcdrAccepted, cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
    "MCDR Rejected": { label: t.statusMcdrRejected, cls: "bg-red-700/10 text-red-700 border-red-700/20" },
  };
  const { label, cls } = map[status];
  return <Badge variant="outline" className={`${cls} whitespace-nowrap`}>{label}</Badge>;
}
function KYCBadge({ status }: { status: KYCStatus }) {
  const { t } = useLang();
  const map: Record<KYCStatus, { label: string; cls: string }> = {
    "Draft": { label: t.kycStatusDraft, cls: "bg-muted text-muted-foreground border-border" },
    "Pending Review": { label: t.kycStatusPending, cls: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
    "Approved": { label: t.kycStatusApproved, cls: "bg-green-500/10 text-green-600 border-green-500/20" },
    "Rejected": { label: t.kycStatusRejected, cls: "bg-red-500/10 text-red-600 border-red-500/20" },
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
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 mt-3 first:mt-0 border-b border-primary/10 pb-1">{children}</p>;
}
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide block">{label}</label>
      {children}
    </div>
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
function exportReconCSV(rows: { name: string; branch: string; unifiedCode: string; eligibleShares: number; subscribedShares: number; remainingShares: number; status: string }[], lang: Lang, filename = "reconciliation.csv") {
  const headers = lang === "ar"
    ? ["الاسم", "الفرع", "الكود الموحد", "الأسهم المؤهلة", "الأسهم المكتتبة", "الأسهم المتبقية", "الحالة"]
    : ["Name", "Branch", "Unified Code", "Eligible Shares", "Subscribed Shares", "Remaining Shares", "Status"];
  const rowData = rows.map(r => [r.name, r.branch, r.unifiedCode, r.eligibleShares, r.subscribedShares, r.remainingShares, r.status]);
  const csv = "\uFEFF" + [headers, ...rowData].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
// Largest-remainder method: ensures sum of allocated shares === totalOffered exactly
function applyLargestRemainder(requests: number[], allocationRatio: number, totalOffered: number): number[] {
  const floors = requests.map(r => Math.floor(r * allocationRatio));
  const totalFloored = floors.reduce((a, b) => a + b, 0);
  const remaining = Math.max(0, totalOffered - totalFloored);
  const fracs = requests.map((r, i) => ({ i, frac: r * allocationRatio - floors[i] }));
  fracs.sort((a, b) => b.frac - a.frac);
  const result = [...floors];
  for (let k = 0; k < remaining && k < fracs.length; k++) result[fracs[k].i]++;
  return result;
}
function exportAllocationCSV(rows: { name: string; unifiedCode: string; subscribedShares: number; allocated: number; paid: number; refundable: number }[], ratioPct: string, lang: Lang) {
  const headers = lang === "ar"
    ? ["الاسم", "الكود الموحد", "الأسهم المطلوبة", "الأسهم المخصصة", "نسبة التخصيص", "المبلغ المدفوع (EGP)", "المبلغ المسترد (EGP)"]
    : ["Name", "Unified Code", "Requested Shares", "Allocated Shares", "Allocation %", "Amount Paid (EGP)", "Refundable (EGP)"];
  const rowData = rows.map(r => [r.name, r.unifiedCode, r.subscribedShares, r.allocated, ratioPct, r.paid, r.refundable]);
  const csv = "\uFEFF" + [headers, ...rowData].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "allocation-results.csv"; a.click();
  URL.revokeObjectURL(url);
}
function exportRefundCSV(rows: { name: string; unifiedCode: string; subscribedShares: number; allocated: number; refundedShares: number; refundAmount: number }[], lang: Lang) {
  const headers = lang === "ar"
    ? ["الاسم", "الكود الموحد", "الأسهم المطلوبة", "الأسهم المخصصة", "أسهم مردودة", "مبلغ الاسترداد (EGP)"]
    : ["Name", "Unified Code", "Requested Shares", "Allocated Shares", "Refunded Shares", "Refund Amount (EGP)"];
  const rowData = rows.map(r => [r.name, r.unifiedCode, r.subscribedShares, r.allocated, r.refundedShares, r.refundAmount]);
  const csv = "\uFEFF" + [headers, ...rowData].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "refund-processing.csv"; a.click();
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
// Profile / Settings panel
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
      <div className="relative ms-auto h-full w-full max-w-sm bg-card border-s border-border shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-black text-lg">{t.profileTitle}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 flex flex-col items-center gap-3 border-b border-border">
          <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-3xl font-black">{user.name.charAt(0).toUpperCase()}</div>
          <div className="text-center">
            <p className="font-black text-xl">{user.name}</p>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">{user.role}</Badge>
            <Badge variant="outline" className="bg-muted text-muted-foreground text-xs">{user.branch}</Badge>
          </div>
        </div>
        <div className="p-5 space-y-3 border-b border-border">
          <div className="flex justify-between items-center text-sm"><span className="text-muted-foreground font-bold">{t.emailLabel}</span><span className="font-mono">{user.email}</span></div>
          <div className="flex justify-between items-center text-sm"><span className="text-muted-foreground font-bold">{t.lastLoginLabel}</span><span className="font-mono text-xs">{user.lastLogin}</span></div>
        </div>
        <div className="p-5 space-y-5 flex-1">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t.settingsTitle}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {prefs.darkMode ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-amber-500" />}
              <div><p className="font-bold text-sm">{t.darkModeLabel}</p><p className="text-xs text-muted-foreground">{t.darkModeDesc}</p></div>
            </div>
            <Toggle checked={prefs.darkMode} onChange={v => onPrefsChange({ darkMode: v })} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {prefs.notifications ? <Bell className="w-4 h-4 text-primary" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
              <div><p className="font-bold text-sm">{t.notifLabel}</p><p className="text-xs text-muted-foreground">{t.notifDesc}</p></div>
            </div>
            <Toggle checked={prefs.notifications} onChange={v => onPrefsChange({ notifications: v })} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KYC Module
// ─────────────────────────────────────────────────────────────────────────────
function KYCModule({ records, onNewRecord, onApproveKYC, isChecker = false }: {
  records: KYCRecord[];
  onNewRecord: (r: KYCRecord) => void;
  onApproveKYC: (id: string, action: "Approved" | "Rejected") => void;
  isChecker?: boolean;
}) {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [kycTab, setKycTab] = useState<"list" | "form">(isChecker ? "list" : "list");
  const [kycStep, setKycStep] = useState(1);
  const [clientType, setClientType] = useState<KYCClientType>("individual");
  const [detailRecord, setDetailRecord] = useState<KYCRecord | null>(null);
  const [filterStatus, setFilterStatus] = useState<"All" | KYCStatus>("All");
  const [kycSearch, setKycSearch] = useState("");

  // Form state
  const [form, setForm] = useState({
    nameAr: "", nameEn: "", dob: "", nationality: "Egyptian", gender: "Male",
    motherName: "", maritalStatus: "Single",
    companyNameAr: "", companyNameEn: "", commercialRegNo: "", taxId: "",
    industryType: "Financial Services", legalForm: "Joint Stock Company", incorporationDate: "",
    nationalId: "", passportNo: "", idExpiry: "", unifiedCode: "",
    addressLine1: "", addressLine2: "", city: "", governorate: "", postalCode: "", country: "Egypt",
    mailingAddressSame: true, mailingAddress: "",
    email: "", mobile: "", phone: "",
    bankName: "National Bank of Egypt", accountNo: "", iban: "", accountCurrency: "EGP",
    riskLevel: "Low" as "Low" | "Medium" | "High",
    sourceOfFunds: "", occupation: "",
    pepStatus: false, sanctionsCheck: true, annualIncome: "", netWorth: "",
    hasPOA: false, poaHolderName: "", poaExpiry: "", poaScope: "",
  });
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);
  const docRef = useRef<HTMLInputElement>(null);

  const KYC_STEPS = [t.kycStep1, t.kycStep2, t.kycStep3, t.kycStep4, t.kycStep5];
  const INDIVIDUAL_DOCS = [t.kycDocNatId, t.kycDocPassport, t.kycDocAddress, t.kycDocBankStmt];
  const CORPORATE_DOCS = [t.kycDocCommReg, t.kycDocTaxCard, t.kycDocBoardRes, t.kycDocSigAuth];
  const DOCS = clientType === "individual" ? INDIVIDUAL_DOCS : CORPORATE_DOCS;

  const pendingKYC = records.filter(r => r.status === "Pending Review");
  const kycSearchSuggestions = useMemo(() => {
    const q = kycSearch.trim().toLowerCase();
    if (!q) return [];
    return records.filter(rec => {
      const isCorp = rec.clientType === "corporate";
      const name = (isCorp ? `${rec.companyNameAr} ${rec.companyNameEn}` : `${rec.nameAr} ${rec.nameEn}`).toLowerCase();
      return name.includes(q) || rec.nationalId.includes(q) || rec.unifiedCode.includes(q) || rec.id.toLowerCase().includes(q);
    }).slice(0, 6);
  }, [kycSearch, records]);
  const clearKYCSearch = () => setKycSearch("");
  const filteredRecords = (filterStatus === "All" ? records : records.filter(r => r.status === filterStatus)).filter(rec => {
    const q = kycSearch.trim().toLowerCase();
    if (!q) return true;
    const isCorp = rec.clientType === "corporate";
    const name = isCorp ? `${rec.companyNameAr} ${rec.companyNameEn}` : `${rec.nameAr} ${rec.nameEn}`;
    return name.toLowerCase().includes(q) || rec.nationalId.includes(q) || rec.unifiedCode.includes(q) || rec.id.toLowerCase().includes(q);
  });

  const handleSubmitKYC = () => {
    const displayName = clientType === "individual" ? form.nameEn || form.nameAr : form.companyNameEn || form.companyNameAr;
    const id = "KYC-" + Math.floor(1000 + Math.random() * 9000);
    const record: KYCRecord = {
      id, clientType, status: "Pending Review",
      submittedAt: new Date().toLocaleString(lang === "ar" ? "ar-EG" : "en-GB"),
      submittedBy: "ahmed.h", branch: "Cairo-Main",
      nameAr: form.nameAr, nameEn: form.nameEn,
      dob: form.dob, nationality: form.nationality, gender: form.gender,
      motherName: form.motherName, maritalStatus: form.maritalStatus,
      nationalId: form.nationalId, passportNo: form.passportNo, idExpiry: form.idExpiry,
      companyNameAr: form.companyNameAr, companyNameEn: form.companyNameEn,
      commercialRegNo: form.commercialRegNo, taxId: form.taxId,
      industryType: form.industryType, legalForm: form.legalForm, incorporationDate: form.incorporationDate,
      unifiedCode: form.unifiedCode,
      addressLine1: form.addressLine1, addressLine2: form.addressLine2,
      city: form.city, governorate: form.governorate, postalCode: form.postalCode, country: form.country,
      mailingAddressSame: form.mailingAddressSame, mailingAddress: form.mailingAddress,
      email: form.email, mobile: form.mobile, phone: form.phone,
      bankName: form.bankName, accountNo: form.accountNo, iban: form.iban, accountCurrency: form.accountCurrency,
      riskLevel: form.riskLevel, sourceOfFunds: form.sourceOfFunds, occupation: form.occupation,
      pepStatus: form.pepStatus, sanctionsCheck: form.sanctionsCheck,
      annualIncome: form.annualIncome, netWorth: form.netWorth,
      uploadedDocs,
      hasPOA: form.hasPOA, poaHolderName: form.poaHolderName, poaExpiry: form.poaExpiry, poaScope: form.poaScope,
    };
    onNewRecord(record);
    toast({ title: t.kycSubmittedToast, description: t.kycSubmittedDesc(id) });
    setKycTab("list"); setKycStep(1); setUploadedDocs([]);
    setForm(prev => ({ ...prev, nameAr: "", nameEn: "", unifiedCode: "", nationalId: "", mobile: "", email: "", accountNo: "", iban: "", addressLine1: "", city: "" }));
  };

  const handleApprove = (id: string) => {
    onApproveKYC(id, "Approved");
    toast({ title: t.kycApprovedToast, description: t.kycApprovedDesc(1) });
    setDetailRecord(null);
  };
  const handleReject = (id: string) => {
    onApproveKYC(id, "Rejected");
    toast({ title: t.kycRejectedToast, description: t.kycRejectedDesc });
    setDetailRecord(null);
  };

  const RISK_COLORS: Record<string, string> = {
    Low: "bg-green-500/10 text-green-600 border-green-500/20",
    Medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    High: "bg-red-500/10 text-red-600 border-red-500/20",
  };

  // Detail panel
  if (detailRecord) {
    const isCorp = detailRecord.clientType === "corporate";
    const displayName = isCorp ? (lang === "ar" ? detailRecord.companyNameAr : detailRecord.companyNameEn) : clientName(detailRecord.nameAr, detailRecord.nameEn, lang);
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setDetailRecord(null)} className="text-muted-foreground hover:text-foreground transition-colors text-sm font-bold flex items-center gap-1">
            ← {lang === "ar" ? "عودة للقائمة" : "Back to List"}
          </button>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <span className="font-black text-sm">{detailRecord.id}</span>
          <KYCBadge status={detailRecord.status} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: summary card */}
          <Card className="lg:col-span-1">
            <CardContent className="pt-6 flex flex-col items-center gap-4 text-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isCorp ? "bg-blue-500/10" : "bg-primary/10"}`}>
                {isCorp ? <Building2 className="w-8 h-8 text-blue-600" /> : <FileUser className="w-8 h-8 text-primary" />}
              </div>
              <div>
                <p className="font-black text-lg">{displayName}</p>
                <p className="text-xs text-muted-foreground">{detailRecord.unifiedCode}</p>
                <Badge variant="outline" className={`mt-2 ${isCorp ? "bg-blue-500/10 text-blue-600 border-blue-500/20" : "bg-primary/10 text-primary border-primary/20"}`}>
                  {isCorp ? t.kycCorporate : t.kycIndividual}
                </Badge>
              </div>
              <div className="w-full text-start space-y-2 pt-3 border-t border-border">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">{lang === "ar" ? "الفرع" : "Branch"}</span><span className="font-bold">{detailRecord.branch}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">{lang === "ar" ? "مقدم بواسطة" : "Submitted by"}</span><span className="font-bold font-mono">{detailRecord.submittedBy}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">{lang === "ar" ? "تاريخ التقديم" : "Submitted at"}</span><span className="font-bold text-xs">{detailRecord.submittedAt}</span></div>
              </div>
              {isChecker && detailRecord.status === "Pending Review" && (
                <div className="w-full space-y-2 pt-3 border-t border-border">
                  <Button className="w-full" onClick={() => handleApprove(detailRecord.id)}><CheckCircle2 className="w-4 h-4 me-2" />{t.approveBtn}</Button>
                  <Button variant="outline" className="w-full border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => handleReject(detailRecord.id)}><X className="w-4 h-4 me-2" />{t.rejectBtn}</Button>
                </div>
              )}
            </CardContent>
          </Card>
          {/* Right: details */}
          <div className="lg:col-span-2 space-y-4">
            {/* Basic info */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><FileUser className="w-4 h-4 text-primary" />{t.kycStep1}</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  {isCorp ? <>
                    <div><p className="text-xs text-muted-foreground font-bold">{t.companyNameEnLabel}</p><p className="font-bold mt-0.5">{detailRecord.companyNameEn}</p></div>
                    <div><p className="text-xs text-muted-foreground font-bold">{t.commRegNoLabel}</p><p className="font-bold mt-0.5 font-mono">{detailRecord.commercialRegNo}</p></div>
                    <div><p className="text-xs text-muted-foreground font-bold">{t.taxIdLabel}</p><p className="font-bold mt-0.5 font-mono">{detailRecord.taxId}</p></div>
                    <div><p className="text-xs text-muted-foreground font-bold">{t.legalFormLabel}</p><p className="font-bold mt-0.5">{detailRecord.legalForm}</p></div>
                    <div><p className="text-xs text-muted-foreground font-bold">{t.industryLabel}</p><p className="font-bold mt-0.5">{detailRecord.industryType}</p></div>
                  </> : <>
                    <div><p className="text-xs text-muted-foreground font-bold">{t.nameEnLabel}</p><p className="font-bold mt-0.5">{detailRecord.nameEn}</p></div>
                    <div><p className="text-xs text-muted-foreground font-bold">{t.dobLabel}</p><p className="font-bold mt-0.5 font-mono">{detailRecord.dob}</p></div>
                    <div><p className="text-xs text-muted-foreground font-bold">{t.nationalityLabel}</p><p className="font-bold mt-0.5">{detailRecord.nationality}</p></div>
                    <div><p className="text-xs text-muted-foreground font-bold">{t.genderLabel}</p><p className="font-bold mt-0.5">{detailRecord.gender}</p></div>
                    <div><p className="text-xs text-muted-foreground font-bold">{t.maritalStatusLabel}</p><p className="font-bold mt-0.5">{detailRecord.maritalStatus}</p></div>
                  </>}
                </div>
              </CardContent>
            </Card>
            {/* Identity & Address */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />{t.kycStep2}</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  {!isCorp && <><div><p className="text-xs text-muted-foreground font-bold">{t.natIdLabel}</p><p className="font-mono font-bold mt-0.5">{detailRecord.nationalId}</p></div>
                  <div><p className="text-xs text-muted-foreground font-bold">{t.idExpiryLabel}</p><p className="font-mono font-bold mt-0.5">{detailRecord.idExpiry}</p></div></>}
                  <div><p className="text-xs text-muted-foreground font-bold">{t.unifiedCodeLabel}</p><p className="font-mono font-bold mt-0.5">{detailRecord.unifiedCode}</p></div>
                  <div className="col-span-2 md:col-span-3"><p className="text-xs text-muted-foreground font-bold">{t.addressLine1Label}</p><p className="font-bold mt-0.5">{detailRecord.addressLine1}{detailRecord.addressLine2 ? ", " + detailRecord.addressLine2 : ""}</p></div>
                  <div><p className="text-xs text-muted-foreground font-bold">{t.cityLabel}</p><p className="font-bold mt-0.5">{detailRecord.city}</p></div>
                  <div><p className="text-xs text-muted-foreground font-bold">{t.governorateLabel}</p><p className="font-bold mt-0.5">{detailRecord.governorate}</p></div>
                  <div><p className="text-xs text-muted-foreground font-bold">{t.mobileLabel}</p><p className="font-mono font-bold mt-0.5">{detailRecord.mobile}</p></div>
                </div>
              </CardContent>
            </Card>
            {/* Bank */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><CreditCard className="w-4 h-4 text-primary" />{t.kycStep3}</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div><p className="text-xs text-muted-foreground font-bold">{t.bankNameLabel}</p><p className="font-bold mt-0.5">{detailRecord.bankName}</p></div>
                  <div><p className="text-xs text-muted-foreground font-bold">{t.accountNo}</p><p className="font-mono font-bold mt-0.5">{detailRecord.accountNo}</p></div>
                  <div><p className="text-xs text-muted-foreground font-bold">{t.ibanLabel}</p><p className="font-mono font-bold mt-0.5">{detailRecord.iban}</p></div>
                </div>
              </CardContent>
            </Card>
            {/* Risk */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-primary" />{t.kycStep4}</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div><p className="text-xs text-muted-foreground font-bold">{t.riskLevelLabel}</p><Badge variant="outline" className={`mt-1 ${RISK_COLORS[detailRecord.riskLevel]}`}>{detailRecord.riskLevel}</Badge></div>
                  <div><p className="text-xs text-muted-foreground font-bold">{t.sourceOfFundsLabel}</p><p className="font-bold mt-0.5">{detailRecord.sourceOfFunds}</p></div>
                  <div><p className="text-xs text-muted-foreground font-bold">PEP</p><Badge variant="outline" className={detailRecord.pepStatus ? "bg-red-500/10 text-red-600" : "bg-green-500/10 text-green-600"}>{detailRecord.pepStatus ? "YES" : "NO"}</Badge></div>
                  <div><p className="text-xs text-muted-foreground font-bold">{t.annualIncomeLabel}</p><p className="font-bold mt-0.5">{detailRecord.annualIncome}</p></div>
                  <div><p className="text-xs text-muted-foreground font-bold">{t.netWorthLabel}</p><p className="font-bold mt-0.5">{detailRecord.netWorth}</p></div>
                </div>
              </CardContent>
            </Card>
            {/* Docs & POA */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><FileCheck className="w-4 h-4 text-primary" />{t.kycStep5}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {detailRecord.uploadedDocs.map(d => <Badge key={d} variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 gap-1"><CheckCheck className="w-3 h-3" />{d}</Badge>)}
                </div>
                {detailRecord.hasPOA && (
                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800">
                    <p className="font-bold text-amber-700 dark:text-amber-400 text-sm mb-2">{t.poaSectionTitle}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs"><span className="text-muted-foreground">{t.poaHolderLabel}:</span><span className="font-bold">{detailRecord.poaHolderName}</span>
                    <span className="text-muted-foreground">{t.poaExpiryLabel}:</span><span className="font-bold font-mono">{detailRecord.poaExpiry}</span>
                    <span className="text-muted-foreground">{t.poaScopeLabel}:</span><span className="font-bold">{detailRecord.poaScope}</span></div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">{isChecker ? t.kycCheckerTitle : t.kycModuleTitle}</h2>
          <p className="text-muted-foreground text-sm">{isChecker ? t.kycCheckerDesc : t.kycModuleDesc}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <TabBtn id="kyc-list" active={kycTab === "list"} onClick={() => setKycTab("list")} icon={ListFilter}>{t.kycTabList}</TabBtn>
          {!isChecker && <TabBtn id="kyc-form" active={kycTab === "form"} onClick={() => { setKycTab("form"); setKycStep(1); }} icon={UserPlus}>{t.kycTabNew}</TabBtn>}
        </div>
      </div>

      {/* Alert banner */}
      {isChecker && pendingKYC.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-2xl px-5 py-3 text-orange-700 dark:text-orange-400 font-bold text-sm">
          {t.kycPendingCount(pendingKYC.length)}
        </div>
      )}

      {/* Records list */}
      {kycTab === "list" && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <CardTitle className="text-base shrink-0">{lang === "ar" ? "سجلات KYC" : "KYC Records"}</CardTitle>
                <div className="relative flex-1 min-w-0">
                  <Input
                    value={kycSearch}
                    onChange={e => setKycSearch(e.target.value)}
                    placeholder={lang === "ar" ? "ابحث بالاسم أو الرقم القومي أو الكود الموحد..." : "Search by name, ID, or unified code..."}
                    className="h-9 pr-20 text-sm"
                  />
                  <span className="absolute end-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground">⌕</span>
                  <button
                    type="button"
                    onClick={clearKYCSearch}
                    className={`absolute end-7 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full text-[11px] font-black flex items-center justify-center transition-opacity ${kycSearch ? "opacity-100 text-muted-foreground hover:text-foreground hover:bg-muted" : "opacity-0 pointer-events-none"}`}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                </div>
                <div className="flex bg-muted p-1 rounded-xl gap-1 shrink-0 flex-wrap">
                  {(["All", "Pending Review", "Approved", "Rejected", "Draft"] as const).map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                      className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${filterStatus === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                      {s === "All" ? t.filterAll : s === "Pending Review" ? t.kycStatusPending : s === "Approved" ? t.kycStatusApproved : s === "Rejected" ? t.kycStatusRejected : t.kycStatusDraft}
                    </button>
                  ))}
                </div>
              </div>
              {kycSearch && kycSearchSuggestions.length > 0 && (
                <div className="rounded-xl border border-border bg-background shadow-sm overflow-hidden max-h-56 overflow-y-auto">
                  {kycSearchSuggestions.map(client => (
                    <button
                      key={`${client.id}-${client.unifiedCode}`}
                      type="button"
                      onClick={() => setKycSearch(client.clientType === "corporate" ? (lang === "ar" ? client.companyNameAr : client.companyNameEn) : client.nameEn)}
                      className="w-full text-start px-3 py-2 hover:bg-muted/50 border-b border-border/50 last:border-b-0"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate">{client.clientType === "corporate" ? (lang === "ar" ? client.companyNameAr : client.companyNameEn) : clientName(client.nameAr, client.nameEn, lang)}</p>
                          <p className="text-[10px] text-muted-foreground font-mono truncate">{client.nationalId} · {client.unifiedCode}</p>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-[10px]">KYC</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary/5">
                    {[t.colKYCID, t.colClientType, lang === "ar" ? "الاسم / الشركة" : "Name / Company", t.colBranch, t.unifiedCodeLabel, t.colSubmittedAt, t.colStatus, t.colAction].map(col => (
                      <TableHead key={col} className="font-black text-[10px] uppercase tracking-widest text-primary/70 whitespace-nowrap">{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">{t.noRecords}</TableCell></TableRow>
                  ) : filteredRecords.map(rec => {
                    const isCorp = rec.clientType === "corporate";
                    const displayName = isCorp ? (lang === "ar" ? rec.companyNameAr : rec.companyNameEn) : clientName(rec.nameAr, rec.nameEn, lang);
                    return (
                      <TableRow key={rec.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-mono font-bold text-sm text-primary">{rec.id}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={isCorp ? "bg-blue-500/10 text-blue-600 border-blue-500/20" : "bg-primary/10 text-primary border-primary/20"}>
                            {isCorp ? <><Building2 className="w-3 h-3 me-1 inline" />{t.kycCorporate}</> : <><FileUser className="w-3 h-3 me-1 inline" />{t.kycIndividual}</>}
                          </Badge>
                        </TableCell>
                        <TableCell><p className="font-bold text-sm">{displayName}</p></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{rec.branch}</TableCell>
                        <TableCell className="font-mono text-sm">{rec.unifiedCode}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">{rec.submittedAt}</TableCell>
                        <TableCell><KYCBadge status={rec.status} /></TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <button onClick={() => setDetailRecord(rec)} className="text-primary font-black text-[10px] uppercase hover:underline">{t.viewDetailsBtn}</button>
                            {isChecker && rec.status === "Pending Review" && (
                              <>
                                <button onClick={() => handleApprove(rec.id)} className="text-green-600 font-black text-[10px] uppercase hover:underline">{t.approveBtn}</button>
                                <button onClick={() => handleReject(rec.id)} className="text-red-500 font-black text-[10px] uppercase hover:underline">{t.rejectBtn}</button>
                              </>
                            )}
                          </div>
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

      {/* Registration form */}
      {kycTab === "form" && !isChecker && (
        <div className="space-y-3">
          {/* Step progress — compact inline bar */}
          <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-1">
            {KYC_STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-1 flex-1 last:flex-none">
                <button type="button" onClick={() => { if (i + 1 < kycStep) setKycStep(i + 1); }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap text-xs font-bold ${kycStep === i + 1 ? "bg-primary text-primary-foreground shadow-sm" : kycStep > i + 1 ? "bg-green-500/10 text-green-600" : "text-muted-foreground"}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${kycStep === i + 1 ? "bg-white/20" : kycStep > i + 1 ? "bg-green-500 text-white" : "bg-muted-foreground/20"}`}>
                    {kycStep > i + 1 ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
                  </span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
                {i < KYC_STEPS.length - 1 && <div className={`flex-1 h-px mx-1 ${kycStep > i + 1 ? "bg-green-400" : "bg-border"}`} />}
              </div>
            ))}
          </div>

          {/* Step 1: Basic Info */}
          {kycStep === 1 && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-5">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="flex items-center gap-2 text-base"><FileUser className="w-4 h-4 text-primary" />{t.kycStep1}</CardTitle>
                  {/* Client type compact pill toggle */}
                  <div className="flex bg-muted p-1 rounded-xl gap-1 shrink-0">
                    {([["individual", t.kycTypeIndividual, FileUser], ["corporate", t.kycTypeCorporate, Building2]] as [KYCClientType, string, React.ElementType][]).map(([type, label, Icon]) => (
                      <button key={type} onClick={() => setClientType(type)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${clientType === type ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                        <Icon className="w-3.5 h-3.5" />{label}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 px-5 pb-4">
                {clientType === "individual" ? (
                  <>
                    <SectionLabel>{lang === "ar" ? "البيانات الشخصية" : "Personal Information"}</SectionLabel>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <FieldRow label={t.nameArLabel}><Input value={form.nameAr} onChange={e => setForm(p => ({ ...p, nameAr: e.target.value }))} dir="rtl" placeholder="مثال: أحمد محمد علي" className="h-8 text-sm" /></FieldRow>
                      <FieldRow label={t.nameEnLabel}><Input value={form.nameEn} onChange={e => setForm(p => ({ ...p, nameEn: e.target.value }))} dir="ltr" placeholder="e.g. Ahmed Mohamed Ali" className="h-8 text-sm" /></FieldRow>
                      <FieldRow label={t.dobLabel}><Input type="date" value={form.dob} onChange={e => setForm(p => ({ ...p, dob: e.target.value }))} dir="ltr" className="h-8 text-sm" /></FieldRow>
                      <FieldRow label={t.nationalityLabel}><Input value={form.nationality} onChange={e => setForm(p => ({ ...p, nationality: e.target.value }))} dir="auto" className="h-8 text-sm" /></FieldRow>
                      <FieldRow label={t.genderLabel}>
                        <select value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))} className="w-full h-8 border border-input rounded-md px-2 py-0 text-sm bg-background focus:ring-2 focus:ring-ring outline-none">
                          <option value="Male">{t.genderMale}</option><option value="Female">{t.genderFemale}</option>
                        </select>
                      </FieldRow>
                      <FieldRow label={t.maritalStatusLabel}>
                        <select value={form.maritalStatus} onChange={e => setForm(p => ({ ...p, maritalStatus: e.target.value }))} className="w-full h-8 border border-input rounded-md px-2 py-0 text-sm bg-background focus:ring-2 focus:ring-ring outline-none">
                          <option value="Single">{t.maritalSingle}</option><option value="Married">{t.maritalMarried}</option><option value="Divorced">{t.maritalDivorced}</option><option value="Widowed">{t.maritalWidowed}</option>
                        </select>
                      </FieldRow>
                      <FieldRow label={t.motherNameLabel}><Input value={form.motherName} onChange={e => setForm(p => ({ ...p, motherName: e.target.value }))} dir="auto" className="h-8 text-sm" /></FieldRow>
                    </div>
                  </>
                ) : (
                  <>
                    <SectionLabel>{lang === "ar" ? "بيانات الشركة" : "Company Information"}</SectionLabel>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <FieldRow label={t.companyNameArLabel}><Input value={form.companyNameAr} onChange={e => setForm(p => ({ ...p, companyNameAr: e.target.value }))} dir="rtl" placeholder="مثال: شركة دلتا للاستثمار" className="h-8 text-sm" /></FieldRow>
                      <FieldRow label={t.companyNameEnLabel}><Input value={form.companyNameEn} onChange={e => setForm(p => ({ ...p, companyNameEn: e.target.value }))} dir="ltr" placeholder="e.g. Delta Investment Co." className="h-8 text-sm" /></FieldRow>
                      <FieldRow label={t.commRegNoLabel}><Input value={form.commercialRegNo} onChange={e => setForm(p => ({ ...p, commercialRegNo: e.target.value }))} dir="ltr" placeholder="e.g. 12345/Cairo/2020" className="h-8 text-sm" /></FieldRow>
                      <FieldRow label={t.taxIdLabel}><Input value={form.taxId} onChange={e => setForm(p => ({ ...p, taxId: e.target.value }))} dir="ltr" placeholder="e.g. 200-456-789" className="h-8 text-sm" /></FieldRow>
                      <FieldRow label={t.legalFormLabel}>
                        <select value={form.legalForm} onChange={e => setForm(p => ({ ...p, legalForm: e.target.value }))} className="w-full h-8 border border-input rounded-md px-2 py-0 text-sm bg-background focus:ring-2 focus:ring-ring outline-none">
                          <option value="Joint Stock Company">{t.legalFormJSC}</option><option value="LLC">{t.legalFormLLC}</option><option value="Sole Proprietorship">{t.legalFormSP}</option><option value="Other">{t.legalFormOther}</option>
                        </select>
                      </FieldRow>
                      <FieldRow label={t.industryLabel}><Input value={form.industryType} onChange={e => setForm(p => ({ ...p, industryType: e.target.value }))} dir="auto" className="h-8 text-sm" /></FieldRow>
                      <FieldRow label={t.incDateLabel}><Input type="date" value={form.incorporationDate} onChange={e => setForm(p => ({ ...p, incorporationDate: e.target.value }))} dir="ltr" className="h-8 text-sm" /></FieldRow>
                    </div>
                  </>
                )}
                <div className="flex justify-end pt-2 border-t border-border">
                  <Button size="sm" onClick={() => setKycStep(2)}>{t.nextStep} →</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Identity & Address */}
          {kycStep === 2 && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="flex items-center gap-2 text-base"><MapPin className="w-4 h-4 text-primary" />{t.kycStep2}</CardTitle></CardHeader>
              <CardContent className="space-y-3 px-5 pb-4">
                <SectionLabel>{lang === "ar" ? "بيانات الهوية" : "Identity Details"}</SectionLabel>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {clientType === "individual" && <>
                    <FieldRow label={t.natIdLabel}><Input value={form.nationalId} onChange={e => setForm(p => ({ ...p, nationalId: e.target.value }))} dir="ltr" placeholder="28512111234567" maxLength={14} className="h-8 text-sm" /></FieldRow>
                    <FieldRow label={t.passportLabel}><Input value={form.passportNo} onChange={e => setForm(p => ({ ...p, passportNo: e.target.value }))} dir="ltr" className="h-8 text-sm" /></FieldRow>
                    <FieldRow label={t.idExpiryLabel}><Input type="date" value={form.idExpiry} onChange={e => setForm(p => ({ ...p, idExpiry: e.target.value }))} dir="ltr" className="h-8 text-sm" /></FieldRow>
                  </>}
                  <FieldRow label={t.unifiedCodeLabel}><Input value={form.unifiedCode} onChange={e => setForm(p => ({ ...p, unifiedCode: e.target.value }))} dir="ltr" placeholder="7700123" className="h-8 text-sm" /></FieldRow>
                </div>
                <SectionLabel>{lang === "ar" ? "العنوان" : "Address"}</SectionLabel>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <FieldRow label={t.addressLine1Label}><Input value={form.addressLine1} onChange={e => setForm(p => ({ ...p, addressLine1: e.target.value }))} dir="auto" className="h-8 text-sm" /></FieldRow>
                  <FieldRow label={t.addressLine2Label}><Input value={form.addressLine2} onChange={e => setForm(p => ({ ...p, addressLine2: e.target.value }))} dir="auto" className="h-8 text-sm" /></FieldRow>
                  <FieldRow label={t.cityLabel}><Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} dir="auto" className="h-8 text-sm" /></FieldRow>
                  <FieldRow label={t.governorateLabel}><Input value={form.governorate} onChange={e => setForm(p => ({ ...p, governorate: e.target.value }))} dir="auto" className="h-8 text-sm" /></FieldRow>
                  <FieldRow label={t.postalCodeLabel}><Input value={form.postalCode} onChange={e => setForm(p => ({ ...p, postalCode: e.target.value }))} dir="ltr" className="h-8 text-sm" /></FieldRow>
                  <FieldRow label={t.countryLabel}><Input value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} dir="auto" className="h-8 text-sm" /></FieldRow>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.mailingAddressSame} onChange={e => setForm(p => ({ ...p, mailingAddressSame: e.target.checked }))} className="rounded" />
                  <span className="text-xs font-bold text-muted-foreground">{t.mailingAddressSameLabel}</span>
                </label>
                {!form.mailingAddressSame && <FieldRow label={t.mailingAddressLabel}><textarea value={form.mailingAddress} onChange={e => setForm(p => ({ ...p, mailingAddress: e.target.value }))} rows={2} className="w-full border border-input rounded-md px-3 py-1.5 text-sm bg-background focus:ring-2 focus:ring-ring outline-none" dir="auto" /></FieldRow>}
                <SectionLabel>{lang === "ar" ? "بيانات التواصل" : "Contact Information"}</SectionLabel>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <FieldRow label={t.emailLabel}><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} dir="ltr" className="h-8 text-sm" /></FieldRow>
                  <FieldRow label={t.mobileLabel}><Input value={form.mobile} onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))} dir="ltr" placeholder="+20100..." className="h-8 text-sm" /></FieldRow>
                  <FieldRow label={t.phoneLabel}><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} dir="ltr" className="h-8 text-sm" /></FieldRow>
                </div>
                <div className="flex justify-between pt-2 border-t border-border">
                  <Button size="sm" variant="outline" onClick={() => setKycStep(1)}>← {lang === "ar" ? "السابق" : "Previous"}</Button>
                  <Button size="sm" onClick={() => setKycStep(3)}>{t.nextStep} →</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Bank Account */}
          {kycStep === 3 && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="flex items-center gap-2 text-base"><CreditCard className="w-4 h-4 text-primary" />{t.kycStep3}</CardTitle></CardHeader>
              <CardContent className="space-y-3 px-5 pb-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <FieldRow label={t.bankNameLabel}>
                    <select value={form.bankName} onChange={e => setForm(p => ({ ...p, bankName: e.target.value }))} className="w-full h-8 border border-input rounded-md px-2 py-0 text-sm bg-background focus:ring-2 focus:ring-ring outline-none">
                      {["National Bank of Egypt", "CIB", "Banque Misr", "HSBC Egypt", "Crédit Agricole Egypt", "Alex Bank"].map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </FieldRow>
                  <FieldRow label={t.accountNo}><Input value={form.accountNo} onChange={e => setForm(p => ({ ...p, accountNo: e.target.value }))} dir="ltr" placeholder="100234567" className="h-8 text-sm" /></FieldRow>
                  <FieldRow label={t.ibanLabel}><Input value={form.iban} onChange={e => setForm(p => ({ ...p, iban: e.target.value }))} dir="ltr" placeholder="EG290011-23456-78" className="h-8 text-sm" /></FieldRow>
                  <FieldRow label={t.currencyLabel}>
                    <select value={form.accountCurrency} onChange={e => setForm(p => ({ ...p, accountCurrency: e.target.value }))} className="w-full h-8 border border-input rounded-md px-2 py-0 text-sm bg-background focus:ring-2 focus:ring-ring outline-none">
                      {["EGP", "USD", "EUR", "GBP"].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </FieldRow>
                </div>
                <div className="flex justify-between pt-2 border-t border-border">
                  <Button size="sm" variant="outline" onClick={() => setKycStep(2)}>← {lang === "ar" ? "السابق" : "Previous"}</Button>
                  <Button size="sm" onClick={() => setKycStep(4)}>{t.nextStep} →</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Risk Assessment */}
          {kycStep === 4 && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="w-4 h-4 text-primary" />{t.kycStep4}</CardTitle></CardHeader>
              <CardContent className="space-y-3 px-5 pb-4">
                {/* Risk level compact pill row */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">{lang === "ar" ? "مستوى المخاطر" : "Risk Level"}</p>
                  <div className="flex gap-2">
                    {(["Low", "Medium", "High"] as const).map(lvl => (
                      <button key={lvl} onClick={() => setForm(p => ({ ...p, riskLevel: lvl }))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${form.riskLevel === lvl ? (lvl === "Low" ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700" : lvl === "Medium" ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700" : "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700") : "border-border text-muted-foreground hover:border-primary/30"}`}>
                        <AlertTriangle className={`w-3 h-3 ${lvl === "Low" ? "text-green-500" : lvl === "Medium" ? "text-amber-500" : "text-red-500"}`} />
                        {lvl === "Low" ? t.riskLow : lvl === "Medium" ? t.riskMedium : t.riskHigh}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <FieldRow label={t.sourceOfFundsLabel}>
                    <select value={form.sourceOfFunds} onChange={e => setForm(p => ({ ...p, sourceOfFunds: e.target.value }))} className="w-full h-8 border border-input rounded-md px-2 py-0 text-sm bg-background focus:ring-2 focus:ring-ring outline-none">
                      {["Employment Income", "Business Revenue", "Investment Returns", "Inheritance", "Savings", "Other"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </FieldRow>
                  <FieldRow label={t.occupationLabel}><Input value={form.occupation} onChange={e => setForm(p => ({ ...p, occupation: e.target.value }))} dir="auto" className="h-8 text-sm" /></FieldRow>
                  <FieldRow label={t.annualIncomeLabel}><Input value={form.annualIncome} onChange={e => setForm(p => ({ ...p, annualIncome: e.target.value }))} dir="ltr" placeholder="e.g. 300,000 EGP" className="h-8 text-sm" /></FieldRow>
                  <FieldRow label={t.netWorthLabel}><Input value={form.netWorth} onChange={e => setForm(p => ({ ...p, netWorth: e.target.value }))} dir="ltr" placeholder="e.g. 1,200,000 EGP" className="h-8 text-sm" /></FieldRow>
                </div>
                <div className="flex gap-6 p-3 bg-muted/40 rounded-lg border">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.pepStatus} onChange={e => setForm(p => ({ ...p, pepStatus: e.target.checked }))} className="rounded" />
                    <span className="text-xs font-bold">{t.pepStatusLabel}</span>
                    {form.pepStatus && <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px]">PEP</Badge>}
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.sanctionsCheck} onChange={e => setForm(p => ({ ...p, sanctionsCheck: e.target.checked }))} className="rounded" />
                    <span className="text-xs font-bold">{t.sanctionsLabel}</span>
                    {form.sanctionsCheck && <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">✓ Clear</Badge>}
                  </label>
                </div>
                <div className="flex justify-between pt-2 border-t border-border">
                  <Button size="sm" variant="outline" onClick={() => setKycStep(3)}>← {lang === "ar" ? "السابق" : "Previous"}</Button>
                  <Button size="sm" onClick={() => setKycStep(5)}>{t.nextStep} →</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Documents & POA */}
          {kycStep === 5 && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="flex items-center gap-2 text-base"><FileCheck className="w-4 h-4 text-primary" />{t.kycStep5}</CardTitle></CardHeader>
              <CardContent className="space-y-3 px-5 pb-4">
                <SectionLabel>{t.docsSectionTitle}</SectionLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {DOCS.map(doc => {
                    const uploaded = uploadedDocs.includes(doc);
                    return (
                      <div key={doc} className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${uploaded ? "border-green-500/40 bg-green-50/50 dark:bg-green-900/10" : "border-dashed border-border hover:border-primary/40"}`}>
                        <div className="flex items-center gap-2">
                          {uploaded ? <CheckCheck className="w-4 h-4 text-green-600 shrink-0" /> : <Upload className="w-4 h-4 text-muted-foreground shrink-0" />}
                          <span className="font-bold text-xs">{doc}</span>
                        </div>
                        {!uploaded ? (
                          <label className="cursor-pointer">
                            <input type="file" className="hidden" onChange={() => setUploadedDocs(prev => [...prev, doc])} />
                            <span className="flex items-center gap-1 text-[10px] font-black text-primary hover:underline">{t.uploadBtn}</span>
                          </label>
                        ) : <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">✓ Uploaded</Badge>}
                      </div>
                    );
                  })}
                </div>

                {/* POA */}
                <div className="border-t border-border pt-3">
                  <SectionLabel>{t.poaSectionTitle}</SectionLabel>
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input type="checkbox" checked={form.hasPOA} onChange={e => setForm(p => ({ ...p, hasPOA: e.target.checked }))} className="rounded" />
                    <span className="text-xs font-bold">{t.hasPOALabel}</span>
                  </label>
                  {form.hasPOA && (
                    <div className="grid grid-cols-3 gap-3 p-3 bg-amber-50/50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800">
                      <FieldRow label={t.poaHolderLabel}><Input value={form.poaHolderName} onChange={e => setForm(p => ({ ...p, poaHolderName: e.target.value }))} dir="auto" className="h-8 text-sm" /></FieldRow>
                      <FieldRow label={t.poaExpiryLabel}><Input type="date" value={form.poaExpiry} onChange={e => setForm(p => ({ ...p, poaExpiry: e.target.value }))} dir="ltr" className="h-8 text-sm" /></FieldRow>
                      <FieldRow label={t.poaScopeLabel}><Input value={form.poaScope} onChange={e => setForm(p => ({ ...p, poaScope: e.target.value }))} dir="auto" className="h-8 text-sm" /></FieldRow>
                    </div>
                  )}
                </div>

                <div className="flex justify-between pt-2 border-t border-border">
                  <Button size="sm" variant="outline" onClick={() => setKycStep(4)}>← {lang === "ar" ? "السابق" : "Previous"}</Button>
                  <Button size="sm" onClick={handleSubmitKYC} className="gap-2"><ClipboardCheck className="w-4 h-4" />{t.submitForReview}</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
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
    { key: "alloc", label: t.templateAlloc, subject: lang === "ar" ? "نتيجة تخصيص الأسهم" : "IPO Allocation Result", body: lang === "ar" ? "عزيزي العميل،\n\nيسعدنا إبلاغك بنتيجة تخصيص أسهم الاكتتاب.\n\nشكراً." : "Dear Client,\n\nWe are pleased to inform you of your IPO allocation result.\n\nThank you." },
    { key: "refund", label: t.templateRefund, subject: lang === "ar" ? "استرداد المبلغ الفائض" : "Excess Amount Refund Notice", body: lang === "ar" ? "عزيزي العميل،\n\nيتم معالجة استرداد المبلغ الفائض من اكتتابك حالياً.\n\nشكراً." : "Dear Client,\n\nThe excess amount from your IPO subscription is currently being refunded.\n\nThank you." },
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
        <div><h2 className="text-2xl font-black tracking-tight">{t.commTitle}</h2><p className="text-muted-foreground text-sm">{t.commDesc}</p></div>
        <div className="flex gap-2">
          <TabBtn id="comm-compose" active={tab === "compose"} onClick={() => setTab("compose")} icon={SendIcon}>{t.commTabCompose}</TabBtn>
          <TabBtn id="comm-history" active={tab === "history"} onClick={() => setTab("history")} icon={ScrollText}>{t.commTabHistory}</TabBtn>
        </div>
      </div>

      {tab === "compose" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-5">
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
            {audience === "group" && <Card><CardContent className="pt-4"><label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">{t.groupSelectLabel}</label><select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-ring outline-none"><option value="groupAllClients">{t.groupAllClients}</option><option value="groupIndividuals">{t.groupIndividuals}</option><option value="groupCorporates">{t.groupCorporates}</option></select></CardContent></Card>}
            {audience === "individual" && <Card><CardContent className="pt-4"><label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">{t.clientCodeLabel}</label><Input value={clientCode} onChange={e => setClientCode(e.target.value)} placeholder="8800318 / +20100..." dir="ltr" /></CardContent></Card>}
            {audience === "upload" && <Card><CardContent className="pt-4 space-y-3"><label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">{t.uploadListLabel}</label><input ref={uploadRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => setUploadedFile(e.target.files?.[0]?.name ?? null)} /><Button variant="outline" size="sm" className="w-full" onClick={() => uploadRef.current?.click()}><UploadIcon className="w-4 h-4 me-2" />{t.uploadListBtn}</Button>{uploadedFile && <p className="text-xs text-green-600 font-bold flex items-center gap-1"><CheckCheck className="w-3.5 h-3.5" />{uploadedFile}</p>}</CardContent></Card>}
            <Card className="bg-primary/5 border-primary/20"><CardContent className="pt-4 flex items-center justify-between"><span className="text-sm font-bold text-muted-foreground">{t.recipientsLabel}</span><span className="text-2xl font-black text-primary">{audienceRecipients[audience].toLocaleString()}</span></CardContent></Card>
          </div>
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm text-muted-foreground">Quick Templates</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {TEMPLATES.map(tpl => (<button key={tpl.key} onClick={() => { setSubject(tpl.subject); setBody(tpl.body); }} className="px-3 py-1.5 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 text-xs font-bold text-foreground transition-colors">{tpl.label}</button>))}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 space-y-4">
                <div><label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">{t.subjectLabel}</label><Input value={subject} onChange={e => setSubject(e.target.value)} placeholder={t.subjectPlaceholder} dir="auto" /></div>
                <div><label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">{t.messageLabel}</label><textarea value={body} onChange={e => setBody(e.target.value)} placeholder={t.messagePlaceholder} dir="auto" rows={10} className="w-full border border-input rounded-xl px-4 py-3 text-sm bg-background focus:ring-2 focus:ring-ring outline-none resize-none font-sans leading-relaxed" /></div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {channel === "email" && <Mail className="w-3.5 h-3.5" />}{channel === "sms" && <Smartphone className="w-3.5 h-3.5" />}{channel === "notification" && <Bell className="w-3.5 h-3.5" />}
                    <span>{channel === "email" ? t.channelEmail : channel === "sms" ? t.channelSMS : t.channelNotif}</span><span>•</span>
                    <span>{audienceRecipients[audience]} {lang === "ar" ? "مستلم" : "recipient(s)"}</span>
                  </div>
                  <Button onClick={handleSend} disabled={isSending || !subject.trim() || !body.trim()} className="gap-2">
                    {isSending ? <span className="animate-spin">⟳</span> : <SendIcon className="w-4 h-4" />}{t.sendBtn}
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
                <TableHeader><TableRow className="bg-muted/30">{[t.colSentAt, t.colChannel, t.colAudience, t.colSubject, t.colRecipients, t.colCommStatus].map(col => <TableHead key={col} className="font-black text-[10px] uppercase tracking-widest text-muted-foreground whitespace-nowrap">{col}</TableHead>)}</TableRow></TableHeader>
                <TableBody>
                  {history.map(msg => {
                    const Icon = channelIcon[msg.channel];
                    return (
                      <TableRow key={msg.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">{msg.timestamp}</TableCell>
                        <TableCell><Badge variant="outline" className={`${channelColors[msg.channel]} gap-1 whitespace-nowrap`}><Icon className="w-3 h-3" />{msg.channel === "email" ? t.channelEmail : msg.channel === "sms" ? t.channelSMS : t.channelNotif}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{msg.audience}</TableCell>
                        <TableCell className="font-bold text-sm max-w-[200px] truncate">{msg.subject}</TableCell>
                        <TableCell className="text-sm font-black text-primary text-right">{msg.recipients.toLocaleString()}</TableCell>
                        <TableCell><Badge variant="outline" className={msg.status === "Sent" ? "bg-green-500/10 text-green-600 border-green-500/20" : msg.status === "Pending" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"}>{msg.status === "Sent" ? t.commStatusSent : msg.status === "Pending" ? t.commStatusPending : t.commStatusFailed}</Badge></TableCell>
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
// Front Office (with KYC sub-tabs)
// ─────────────────────────────────────────────────────────────────────────────
interface BrokerClient { clientName: string; brokerCode?: string; ipoName: string; unifiedCode: string; qty: number; cost: number; date: string; ref?: string; custodian?: string; }
interface MCDRRow { clientName: string; ipoName: string; unifiedCode: string; eligibleQty: number; subscribedQty: number; settlementDate: string; }
interface ReconRow { name: string; branch: string; unifiedCode: string; eligibleShares: number; subscribedShares: number; remainingShares: number; status: string; source: string; }
interface FrozenSnapshot { totalSubscriptionsCount: number; eligibleIPOShares: number; hasMcdr: boolean; totalSharesSubscribed: number; totalCashDisplay: string; coverageRatio: number; uncoveredGap: number; }
interface BrokerBatch {
  id: string; broker: string; ipoId: string; ipoName: string;
  clients: BrokerClient[]; paymentMethod: string; txRef: string;
  fixMessage: string; submittedAt: string;
  status: "Pending Review" | "Approved" | "Rejected";
  phase: "covered" | "uncovered";
}

function FrontOffice({ onNewSubscription, kycRecords, onNewKYC, onApproveKYC, activeStock, ipoStocks, subscriptions, custodians }: {
  onNewSubscription: (s: Subscription) => void;
  kycRecords: KYCRecord[];
  onNewKYC: (r: KYCRecord) => void;
  onApproveKYC: (id: string, action: "Approved" | "Rejected") => void;
  activeStock: IPOStock | null;
  ipoStocks: IPOStock[];
  subscriptions: Subscription[];
  custodians: Custodian[];
}) {
  const { t, lang, isRTL } = useLang();
  const { toast } = useToast();
  const [foTab, setFoTab] = useState<"subs" | "kyc">("subs");
  const [cashVerified, setCashVerified] = useState<boolean | null>(null);
  const [step, setStep] = useState(1);
  const [ucInput, setUcInput] = useState("");
  const [foundClient, setFoundClient] = useState<ClientRecord | null>(null);
  const [pendingSub, setPendingSub] = useState<Subscription | null>(null);
  const [selectedCustodian, setSelectedCustodian] = useState<string>("");
  const [enteredName, setEnteredName] = useState("");
  const [enteredNameEn, setEnteredNameEn] = useState("");
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);
  const [txRef, setTxRef] = useState("");
  const [subDate, setSubDate] = useState(new Date().toISOString().slice(0, 10));
  const numLocale = lang === "ar" ? "ar-EG" : "en-US";
  const STEPS = [t.step1, t.step2, t.step3, t.step4];
  const DOCS = [t.doc1, t.doc2, t.doc3, t.doc4];
  const EVENTS = ipoStocks.map(s => ({ value: s.id, label: lang === "ar" ? s.securityNameAr : s.securityNameEn }));
  const paymentOptions = [{ v: "Cash Deposit", l: t.payCash }, { v: "Transfer", l: t.payTransfer }];
  const sharesSchema = z.object({ requestedShares: z.coerce.number().min(1, t.sharesError), paymentMethod: z.string().min(1) });
  const form = useForm<z.infer<typeof sharesSchema>>({ resolver: zodResolver(sharesSchema), defaultValues: { requestedShares: 0, paymentMethod: paymentOptions[0].v } });
  const watchedShares = form.watch("requestedShares");
  const totalDue = (Number(watchedShares) || 0) * TOTAL_PER_SHARE;

  const resetFlow = () => {
    setStep(1); setUcInput(""); setFoundClient(null); setPendingSub(null);
    form.reset({ requestedShares: 0, paymentMethod: paymentOptions[0].v });
    setSelectedCustodian("");
    setEnteredName("");
    setEnteredNameEn("");
    setUploadedDocs([]);
    setTxRef(""); setSubDate(new Date().toISOString().slice(0, 10));
    setCashVerified(null);
  };
  const handleVerifyCash = () => {
    if (txRef === "REF-TXT-001") {
      setCashVerified(false);
      toast({ title: lang === "ar" ? "تحقق من النقدية" : "Cash Verification Failed", description: t.verifyCashFail, variant: "destructive" });
    } else {
      setCashVerified(true);
      toast({ title: lang === "ar" ? "تحقق من النقدية" : "Cash Verified", description: t.verifyCashSuccess });
    }
  };

  const onSubmitStep2 = (values: z.infer<typeof sharesSchema>) => {
    if (!foundClient) return;
    const price = activeStock?.pricePerShare ?? TOTAL_PER_SHARE;
    const custodianObj = custodians.find(c => c.id === selectedCustodian) ?? null;
  const sub: Subscription = {
      id: "TX-" + Math.floor(1000 + Math.random() * 9000),
      nameAr: foundClient.isBankClient ? foundClient.nameAr : enteredName,
      nameEn: foundClient.isBankClient ? foundClient.nameEn : enteredNameEn,
      nationalId: foundClient.isBankClient ? foundClient.nationalId : "—", account: foundClient.isBankClient ? foundClient.account : "—", unifiedCode: foundClient.unifiedCode,
      requestedShares: values.requestedShares, amountDue: values.requestedShares * price,
      amountPaid: 0,
      allocatedShares: 0, refundAmount: 0, status: "Pending Review",
      branch: "Cairo-Main", submittedAt: new Date().toLocaleString(lang === "ar" ? "ar-EG" : "en-GB"),
      ipoId: activeStock?.id ?? "", date: subDate,
      phase: activeStock?.phase ?? "covered",
      custodian: custodianObj?.name ?? "", custodianCode: custodianObj?.code ?? "",
      uploadedDocs: [],
    };
    setPendingSub(sub); setStep(3);
  };
  const handleFinalSubmit = () => {
    if (!pendingSub) return;
    const finalStatus: SubStatus = cashVerified === false ? "Pending Cash" : "Submitted";
    onNewSubscription({ ...pendingSub, status: finalStatus, uploadedDocs });
    toast({ title: t.toastSentTitle, description: t.toastSentDesc(pendingSub.id) });
    resetFlow();
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-2 border-b border-border pb-3">
        <TabBtn id="fo-subs" active={foTab === "subs"} onClick={() => setFoTab("subs")} icon={ClipboardList}>{t.foTabSubs}</TabBtn>
        <TabBtn id="fo-kyc" active={foTab === "kyc"} onClick={() => setFoTab("kyc")} icon={FileUser}>{t.foTabKYC}</TabBtn>
      </div>

      {foTab === "kyc" && <KYCModule records={kycRecords} onNewRecord={onNewKYC} onApproveKYC={onApproveKYC} isChecker={false} />}


      {foTab === "subs" && (
        <div className="space-y-6">
          {/* Phase pool banner */}
          {activeStock && (
            <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border-2 ${activeStock.phase === "covered" ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800" : "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800"}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${activeStock.phase === "covered" ? "bg-amber-500/20 text-amber-600" : "bg-green-500/20 text-green-600"}`}>
                <Layers className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-black uppercase tracking-widest ${activeStock.phase === "covered" ? "text-amber-600" : "text-green-600"}`}>
                  {activeStock.phase === "covered" ? t.coveredPhaseBadge : t.uncoveredPhaseBadge} — {lang === "ar" ? "المجمع النشط" : "Active Pool"}
                </p>
                <p className={`text-sm font-bold mt-0.5 ${activeStock.phase === "covered" ? "text-amber-700 dark:text-amber-400" : "text-green-700 dark:text-green-400"}`}>
                  {lang === "ar"
                    ? activeStock.phase === "covered"
                      ? `جميع الاشتراكات ستُودَّع في مجمع مرحلة التغطية لـ ${activeStock.securityNameAr}`
                      : `جميع الاشتراكات ستُودَّع في مجمع مرحلة غير المغطى لـ ${activeStock.securityNameAr}`
                    : activeStock.phase === "covered"
                      ? `All subscriptions will be posted to the Covered Phase pool for ${activeStock.securityNameEn}`
                      : `All subscriptions will be posted to the Uncovered Phase pool for ${activeStock.securityNameEn}`}
                </p>
              </div>
              <Badge variant="outline" className={`shrink-0 font-black text-xs ${activeStock.phase === "covered" ? "bg-amber-500/10 text-amber-600 border-amber-500/30" : "bg-green-500/10 text-green-600 border-green-500/30"}`}>
                {lang === "ar" ? activeStock.securityNameAr : activeStock.securityNameEn}
              </Badge>
            </div>
          )}

              {/* Step progress bar */}
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

              {/* Step 1 – Identification */}
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
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">{t.clientNameLabel}</label>
                        {foundClient && !foundClient.isBankClient ? (
                          <div className="space-y-2">
                            <Input value={enteredName} onChange={e => setEnteredName(e.target.value)} placeholder={t.clientNamePlaceholder} dir="rtl" />
                            <Input value={enteredNameEn} onChange={e => setEnteredNameEn(e.target.value)} placeholder={lang === "ar" ? "اسم العميل بالإنجليزية" : "Client name in English"} dir="ltr" />
                          </div>
                        ) : (
                          <Input value={foundClient ? clientName(foundClient.nameAr, foundClient.nameEn, lang) : ""} disabled placeholder={t.clientNamePlaceholder} dir={isRTL ? "rtl" : "ltr"} className="bg-muted/50" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">{t.eventLabel}</label>
                        <select className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-ring outline-none">{EVENTS.map(ev => <option key={ev.value} value={ev.value}>{ev.label}</option>)}</select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">{t.custodianLabel}</label>
                        <select
                          value={selectedCustodian}
                          onChange={e => setSelectedCustodian(e.target.value)}
                          className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-ring outline-none"
                        >
                          <option value="">{t.custodianSelectPlaceholder}</option>
                          {custodians.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">{t.subDateLabel}</label>
                        <Input type="date" value={subDate} onChange={e => setSubDate(e.target.value)} dir="ltr" className="max-w-xs" />
                      </div>
                    </div>
                    {foundClient && (
                      <div className="bg-primary text-primary-foreground p-6 rounded-2xl shadow-lg space-y-4">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div>
                            <p className="text-primary-foreground/70 text-xs font-bold uppercase tracking-widest mb-1">{t.mcdrVerified}</p>
                            <h3 className="text-xl font-bold">{foundClient.isBankClient ? clientName(foundClient.nameAr, foundClient.nameEn, lang) : (lang === "ar" ? (enteredName || "—") : (enteredNameEn || "—"))}</h3>
                            <div className="flex flex-wrap gap-3 mt-2 text-sm text-primary-foreground/80">
                              <span>{t.unifiedCode}: <span className="font-mono text-primary-foreground">{foundClient.unifiedCode}</span></span>
                              {foundClient.isBankClient && <span>{t.accountNo}: <span className="font-mono text-primary-foreground">{foundClient.account}</span></span>}
                              <Badge variant="outline" className={foundClient.isBankClient ? "bg-green-500/20 text-green-100 border-green-300/30" : "bg-amber-500/20 text-amber-100 border-amber-300/30"}>{foundClient.isBankClient ? t.bankClientYes : t.bankClientNo}</Badge>
                            </div>
                          </div>
                          <Button variant="secondary" className="shrink-0 font-bold" onClick={() => setStep(2)}>{t.nextStep}</Button>
                        </div>
                        {foundClient.isBankClient && (
                          <div className="border-t border-white/20 pt-4">
                            <div className="bg-white/10 rounded-xl p-3 inline-block">
                              <p className="text-primary-foreground/60 text-xs mb-1">{t.eligibleIPOLabel}</p>
                              <p className="font-black text-lg">{foundClient.eligibleShares.toLocaleString(numLocale)} <span className="text-sm font-normal">{t.shares}</span></p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Step 2 – Ektitab */}
              {step === 2 && (
                <Card>
                  <CardHeader><CardTitle>{t.ektitabTitle}</CardTitle><CardDescription>{t.ektitabDesc}</CardDescription></CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmitStep2)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="md:col-span-2 space-y-4">
                            <FormField control={form.control} name="requestedShares" render={({ field }) => (<FormItem><FormLabel>{t.sharesLabel}</FormLabel><FormControl><Input type="number" placeholder="0" dir="ltr" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="paymentMethod" render={({ field }) => (<FormItem><FormLabel>{t.paymentLabel}</FormLabel><FormControl><select className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-ring outline-none" {...field}>{paymentOptions.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select></FormControl><FormMessage /></FormItem>)} />
                            {foundClient && foundClient.isBankClient && <div className="p-4 bg-muted/50 rounded-xl border"><p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">{t.eligibleIPOLabel}</p><p className="font-black text-primary">{foundClient.eligibleShares.toLocaleString(numLocale)} {t.shares}</p></div>}
                          </div>
                          <Card className="bg-muted/50 border-dashed">
                            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t.orderSummary}</CardTitle></CardHeader>
                            <CardContent className="space-y-2 text-sm">
                              <div className="flex justify-between"><span className="text-muted-foreground">{t.stockPriceLabel}</span><span className="font-bold">{TOTAL_PER_SHARE} {t.egp}</span></div>
                              <div className="flex justify-between"><span className="text-muted-foreground">{t.parValue}</span><span className="font-bold">{PAR_VALUE} {t.egp}</span></div>
                              <div className="flex justify-between"><span className="text-muted-foreground">{t.issueFees}</span><span className="font-bold">{ISSUE_FEES} {t.egp}</span></div>
                              <div className="border-t pt-3 flex justify-between items-center"><span className="font-bold">{t.totalDue}</span><span className="text-xl font-black text-primary">{totalDue.toLocaleString(numLocale)} {t.egp}</span></div>
                            </CardContent>
                          </Card>
                        </div>
                        <Button type="submit" className="px-10">{t.confirmDocs}</Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              )}

              {/* Step 3 – Documents */}
              {step === 3 && (
                <Card>
                  <CardHeader><CardTitle>{t.docsTitle}</CardTitle><CardDescription>{t.docsDesc}</CardDescription></CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {DOCS.map(doc => {
                        const isUploaded = uploadedDocs.includes(doc);
                        return (
                          <div key={doc} className={`border-2 p-5 rounded-xl flex items-center justify-between transition-colors ${isUploaded ? "border-green-500/40 bg-green-50/50 dark:bg-green-900/10" : "border-dashed border-border hover:border-primary/40"}`}>
                            <span className="font-bold text-sm">{doc}</span>
                            {isUploaded ? (
                              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 gap-1"><CheckCheck className="w-3.5 h-3.5" />{lang === "ar" ? "تم الرفع" : "Uploaded"}</Badge>
                            ) : (
                              <label className="cursor-pointer">
                                <input type="file" className="hidden" onChange={() => setUploadedDocs(prev => [...prev, doc])} />
                                <span className="flex items-center gap-1.5 bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"><Upload className="w-3.5 h-3.5" />{t.uploadBtn}</span>
                              </label>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <Button className="mt-2 px-10" disabled={uploadedDocs.length === 0} onClick={() => setStep(4)}>{lang === "ar" ? "التالي: مراجعة الطلب" : "Next: Review"}</Button>
                    {uploadedDocs.length === 0 && <p className="text-xs text-muted-foreground">{lang === "ar" ? "يرجى رفع ورقة علوة على الأقل" : "Please upload at least one document"}</p>}
                  </CardContent>
                </Card>
              )}

              {/* Step 4 – Final Receipt */}
              {step === 4 && pendingSub && (
                <Card>
                  <CardContent className="pt-8">
                    <div className="max-w-xl mx-auto text-center space-y-6">
                      <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto"><CheckCircle2 className="w-8 h-8" /></div>
                      <div><h2 className="text-2xl font-black">{t.subPrepared}</h2><p className="text-muted-foreground mt-1">{t.txPrefix}: <span className="font-mono font-bold text-foreground">{pendingSub.id}</span></p></div>
                      <Card className="bg-muted/50">
                        <CardContent className="pt-5 grid grid-cols-2 gap-4 text-sm">
                          <div><p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{t.clientLabel}</p><p className="font-bold">{clientName(pendingSub.nameAr, pendingSub.nameEn, lang)}</p></div>
                          <div><p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{t.sharesCol}</p><p className="font-bold text-primary">{pendingSub.requestedShares.toLocaleString(numLocale)} {t.shares}</p></div>
                          <div><p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{t.totalAmtLabel}</p><p className="font-bold">{pendingSub.amountDue.toLocaleString(numLocale)} {t.egp}</p></div>
                          <div><p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{t.statusLabel}</p><p className="font-bold text-orange-500">{t.awaitingVerif}</p></div>
                          {uploadedDocs.length > 0 && <div className="col-span-2"><p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{t.docsTitle}</p><div className="flex flex-wrap gap-1">{uploadedDocs.map(d => <Badge key={d} variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 gap-1"><CheckCheck className="w-3 h-3" />{d}</Badge>)}</div></div>}
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
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Requests Status (formerly Supervisor / Checker)
// ─────────────────────────────────────────────────────────────────────────────
function SupervisorChecker({ subscriptions, onApprove, kycRecords, onApproveKYC, brokerBatches, onApproveBatch, ipoStocks, onUpdateStatus, onReceiveCash }: {
  subscriptions: Subscription[]; onApprove: (ids: string[]) => void;
  kycRecords: KYCRecord[]; onApproveKYC: (id: string, action: "Approved" | "Rejected") => void;
  brokerBatches: BrokerBatch[]; onApproveBatch: (id: string, action: "Approved" | "Rejected") => void;
  ipoStocks: IPOStock[];
  onUpdateStatus: (id: string, status: SubStatus) => void;
  onReceiveCash: (id: string, amountPaid: number) => void;
}) {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [supTab, setSupTab] = useState<"subs" | "kyc" | "broker" | "followup">("subs");
  const [supIpoId, setSupIpoId] = useState<string>("all");
  const [supPhase, setSupPhase] = useState<"all" | "covered" | "uncovered">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);
  const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(null);
  // RPA/MCDR state removed — handled by external system
  // Follow Up + FIX state
  const [followUpSearch, setFollowUpSearch] = useState("");
  const [followUpFilter, setFollowUpFilter] = useState("All");
  const [followUpSelectedId, setFollowUpSelectedId] = useState<string | null>(null);
  const [supFix, setSupFix] = useState<string | null>(null);
  const [supFixSent, setSupFixSent] = useState(false);
  const [supFixVerified, setSupFixVerified] = useState<boolean | null>(null);
  // Cash Receipt Modal state
  const [cashModalOpen, setCashModalOpen] = useState(false);
  const [cashTargetSubId, setCashTargetSubId] = useState<string | null>(null);
  const [cashReceiptAmount, setCashReceiptAmount] = useState<number>(0);
  const openCashModal = (id: string, amount: number) => { setCashTargetSubId(id); setCashReceiptAmount(amount); setCashModalOpen(true); };
  const closeCashModal = () => { setCashModalOpen(false); setCashTargetSubId(null); setCashReceiptAmount(0); };
  const numLocale = lang === "ar" ? "ar-EG" : "en-US";
  const selectFollowUpSub = (id: string | null) => {
    setFollowUpSelectedId(id); setSupFix(null); setSupFixSent(false); setSupFixVerified(null);
  };
  const filteredSubs = subscriptions
    .filter(s => supIpoId === "all" || s.ipoId === supIpoId)
    .filter(s => supPhase === "all" || s.phase === supPhase);
  const filteredBatches = brokerBatches
    .filter(b => supIpoId === "all" || b.ipoId === supIpoId)
    .filter(b => supPhase === "all" || b.phase === supPhase);
  const pending = filteredSubs.filter(s => s.status === "Pending Review");
  const shown = filteredSubs.filter(s =>
    s.status === "Pending Review" || s.status === "Approved" || s.status === "Verified" || s.status === "Rejected" ||
    s.status === "Submitted" || s.status === "RPA Allocating" || s.status === "MCDR Accepted" || s.status === "MCDR Rejected" ||
    s.status === "Pending Cash" || s.status === "Pending MCDR Allocation"
  );
  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const handleApprove = (ids: string[]) => { onApprove(ids); setSelected(new Set()); toast({ title: t.toastApprovedTitle, description: t.toastApprovedDesc(ids.length) }); };
  const kycPending = kycRecords.filter(r => r.status === "Pending Review");
  const batchPending = filteredBatches.filter(b => b.status === "Pending Review");

  // RPA: MCDR allocation handled by external system — no manual FIX checks here


  return (
    <div className="space-y-5">
      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-border pb-3">
        <TabBtn id="sup-subs" active={supTab === "subs"} onClick={() => setSupTab("subs")} icon={ClipboardList}>
          {t.supTabSubs}
          {pending.length > 0 && <span className="ms-1.5 bg-orange-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">{pending.length}</span>}
        </TabBtn>
        <TabBtn id="sup-kyc" active={supTab === "kyc"} onClick={() => setSupTab("kyc")} icon={ClipboardCheck}>
          {t.supTabKYC}
          {kycPending.length > 0 && <span className="ms-1.5 bg-primary text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">{kycPending.length}</span>}
        </TabBtn>
        <TabBtn id="sup-broker" active={supTab === "broker"} onClick={() => setSupTab("broker")} icon={Building2}>
          {t.brokerBatchTab}
          {batchPending.length > 0 && <span className="ms-1.5 bg-teal-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">{batchPending.length}</span>}
        </TabBtn>
        <TabBtn id="sup-followup" active={supTab === "followup"} onClick={() => setSupTab("followup")} icon={ActivitySquare}>{t.supTabFollowUp}</TabBtn>
      </div>

      {/* IPO filter + Phase filter — same row */}
      {supTab !== "kyc" && (
        <div className="flex items-center gap-3 flex-wrap">
          {ipoStocks.length > 1 && (
            <>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t.filterByStock}:</span>
              {[{ id: "all", name: t.filterAll }, ...ipoStocks.map(s => ({ id: s.id, name: lang === "ar" ? s.securityNameAr : s.securityNameEn }))].map(opt => (
                <button key={opt.id} onClick={() => { setSupIpoId(opt.id); setSelected(new Set()); }}
                  className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${supIpoId === opt.id ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"}`}>
                  {opt.name}
                </button>
              ))}
              <span className="w-px h-5 bg-border shrink-0" />
            </>
          )}
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t.filterByPhase}:</span>
          {([
            { id: "all", label: t.filterAll },
            { id: "covered", label: t.coveredPhaseBadge },
            { id: "uncovered", label: t.uncoveredPhaseBadge },
          ] as const).map(opt => (
            <button key={opt.id}
              onClick={() => { setSupPhase(opt.id); setSelected(new Set()); }}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${supPhase === opt.id ? (opt.id === "covered" ? "bg-amber-500 text-white border-amber-500" : opt.id === "uncovered" ? "bg-green-600 text-white border-green-600" : "bg-primary text-white border-primary") : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"}`}>
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* KYC review panel */}
      {supTab === "kyc" && <KYCModule records={kycRecords} onNewRecord={() => {}} onApproveKYC={onApproveKYC} isChecker={true} />}

      {/* Broker Batches panel */}
      {supTab === "broker" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div><h2 className="text-2xl font-black tracking-tight">{t.brokerBatchesTitle}</h2><p className="text-muted-foreground text-sm">{t.fixMsgDesc}</p></div>
          </div>
          {filteredBatches.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-muted-foreground"><Building2 className="w-8 h-8 mx-auto mb-3 opacity-30" /><p className="font-bold">{t.noRecords}</p></CardContent></Card>
          ) : (
            <div className="space-y-4">
              {filteredBatches.map(batch => (
                <Card key={batch.id} className={`border-2 transition-colors ${batch.status === "Pending Review" ? "border-orange-200 dark:border-orange-800" : batch.status === "Approved" ? "border-emerald-200 dark:border-emerald-800" : "border-red-200 dark:border-red-800"}`}>
                  <CardContent className="pt-5 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-muted-foreground">{batch.id}</span>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black ${batch.status === "Pending Review" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" : batch.status === "Approved" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700"}`}>{batch.status}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${batch.phase === "covered" ? "bg-amber-500/10 text-amber-600 border-amber-500/30" : "bg-green-500/10 text-green-600 border-green-500/30"}`}><Layers className="w-3 h-3" />{batch.phase === "covered" ? t.coveredPhaseBadge : t.uncoveredPhaseBadge}</span>
                        </div>
                        <p className="font-black text-lg">{batch.broker}</p>
                        {(() => { const vc = batch.clients.filter(c => c.ref !== "REF-TXT-001" && c.unifiedCode !== "3400127"); return <p className="text-sm text-muted-foreground font-bold">{batch.ipoName} · {t.batchClients(vc.length)} · {batch.paymentMethod}</p>; })()}
                        <p className="text-xs text-muted-foreground font-mono">{lang === "ar" ? "أُرسلت:" : "Submitted:"} {batch.submittedAt}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {(() => { const vc = batch.clients.filter(c => c.ref !== "REF-TXT-001" && c.unifiedCode !== "3400127"); return (<>
                          <div className="text-end">
                            <p className="text-xl font-black text-primary">{vc.reduce((a, c) => a + c.qty, 0).toLocaleString(numLocale)}</p>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase">{lang === "ar" ? "إجمالي الأسهم" : "Total Shares"}</p>
                          </div>
                          <div className="text-end">
                            <p className="text-xl font-black">{vc.reduce((a, c) => a + c.cost, 0).toLocaleString(numLocale)}</p>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase">{t.egp}</p>
                          </div>
                        </>); })()}
                        {batch.status === "Pending Review" && batch.clients.filter(c => c.ref !== "REF-TXT-001" && c.unifiedCode !== "3400127").length > 0 && (
                          <>
                            <button onClick={() => { onApproveBatch(batch.id, "Approved"); toast({ title: t.batchApproveBtn, description: batch.broker }); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-colors"><CheckCircle2 className="w-3.5 h-3.5" />{t.batchApproveBtn}</button>
                            <button onClick={() => { onApproveBatch(batch.id, "Rejected"); toast({ title: t.batchRejectBtn, description: batch.broker }); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 text-xs font-black transition-colors"><X className="w-3.5 h-3.5" />{t.batchRejectBtn}</button>
                          </>
                        )}
                        <button onClick={() => setExpandedBatch(expandedBatch === batch.id ? null : batch.id)} className="px-3 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors">{expandedBatch === batch.id ? (lang === "ar" ? "إخفاء" : "Hide") : (lang === "ar" ? "عرض التفاصيل" : "View Details")}</button>
                      </div>
                    </div>
                    {expandedBatch === batch.id && (
                      <div className="space-y-3 pt-2 border-t border-border">
                        <div className="overflow-x-auto rounded-xl border border-border/50">
                          <Table>
                            <TableHeader><TableRow className="bg-muted/30">{[t.colClientName, t.colUnifiedCode, t.colDate, t.colSubQty, t.colCost, t.colRef, t.colCustodian].map(h => <TableHead key={h} className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">{h}</TableHead>)}</TableRow></TableHeader>
                            <TableBody>
                              {batch.clients.filter(c => c.ref !== "REF-TXT-001" && c.unifiedCode !== "3400127").map((c, i) => (
                                <TableRow key={i} className="hover:bg-muted/30">
                                  <TableCell className="font-bold text-sm">{c.clientName}</TableCell>
                                  <TableCell className="font-mono text-sm">{c.unifiedCode}</TableCell>
                                  <TableCell className="font-mono text-sm text-muted-foreground">{c.date}</TableCell>
                                  <TableCell className="font-mono text-sm">{c.qty.toLocaleString(numLocale)}</TableCell>
                                  <TableCell className="font-mono text-sm font-bold text-primary">{c.cost.toLocaleString(numLocale)}</TableCell>
                                  <TableCell className="font-mono text-xs text-muted-foreground">{c.ref || "—"}</TableCell>
                                  <TableCell className="text-xs font-bold text-muted-foreground whitespace-nowrap">{c.custodian || "—"}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Subscriptions review */}
      {supTab === "subs" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight">{t.checkerTitle}</h2>
              <p className="text-muted-foreground text-sm">{t.checkerDesc}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {pending.length > 0 && (
                <Button size="sm" onClick={() => handleApprove(pending.map(s => s.id))}>
                  <CheckCircle2 className="w-4 h-4 me-2" />{t.approveAllBtn} ({pending.length})
                </Button>
              )}
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
                      {[t.colInvestor, t.colIPOStock, t.phaseCol, t.colBranch, t.colBroker, t.colCustodian, t.sharesCol, t.totalAmtLabel, t.colSubmittedAt, t.colStatus, t.colAction].map(col => <TableHead key={col} className="font-black text-[10px] uppercase tracking-widest text-orange-600 whitespace-nowrap">{col}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shown.length === 0 ? <TableRow><TableCell colSpan={11} className="text-center py-10 text-muted-foreground">{t.noRecords}</TableCell></TableRow> : shown.map(sub => {
                      const ipoStock = ipoStocks.find(s => s.id === sub.ipoId);
                      const ipoName = ipoStock ? (lang === "ar" ? ipoStock.securityNameAr : ipoStock.securityNameEn) : sub.ipoId;
                      return (
                      <TableRow key={sub.id} className={`hover:bg-muted/30 transition-colors ${selected.has(sub.id) ? "bg-primary/5" : ""}`}>
                        <TableCell>{sub.status === "Pending Review" && <input type="checkbox" className="rounded" checked={selected.has(sub.id)} onChange={() => toggleSelect(sub.id)} />}</TableCell>
                        <TableCell><p className="font-bold text-sm">{clientName(sub.nameAr, sub.nameEn, lang)}</p><p className="text-xs font-mono text-muted-foreground">{sub.unifiedCode}</p></TableCell>
                        <TableCell><p className="font-bold text-sm text-primary whitespace-nowrap">{ipoName}</p><p className="text-[10px] font-mono text-muted-foreground">{ipoStock?.code ?? ""}</p></TableCell>
                        <TableCell><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border whitespace-nowrap ${sub.phase === "covered" ? "bg-amber-500/10 text-amber-600 border-amber-500/30" : "bg-green-500/10 text-green-600 border-green-500/30"}`}><Layers className="w-3 h-3" />{sub.phase === "covered" ? t.coveredPhaseBadge : t.uncoveredPhaseBadge}</span></TableCell>
                        <TableCell className="text-sm font-bold text-muted-foreground">{sub.branch}</TableCell>
                        <TableCell className="text-xs font-bold text-muted-foreground whitespace-nowrap">{sub.broker ?? "—"}</TableCell>
                        <TableCell className="text-xs font-bold text-muted-foreground whitespace-nowrap">{sub.custodian ?? "—"}</TableCell>
                        <TableCell className="text-sm font-bold">{sub.requestedShares.toLocaleString(numLocale)}</TableCell>
                        <TableCell className="text-sm font-black text-primary">{sub.amountDue.toLocaleString(numLocale)} {t.egp}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">{sub.submittedAt}</TableCell>
                        <TableCell><SubBadge status={sub.status} /></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => setExpandedSubId(prev => prev === sub.id ? null : sub.id)}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black border transition-colors whitespace-nowrap ${expandedSubId === sub.id ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"}`}>
                              <FileText className="w-3 h-3" />
                              {expandedSubId === sub.id ? (lang === "ar" ? "إخفاء المستندات" : "Hide Docs") : (lang === "ar" ? "عرض المستندات" : "View Docs")}
                            </button>
                            {/* Manual Approve/Reject for old "Pending Review" subscriptions (seed data / broker batches) */}
                            {sub.status === "Pending Review" && (
                              <div className="flex gap-2">
                                <button onClick={() => handleApprove([sub.id])} className="flex items-center gap-1 text-green-600 font-black text-[10px] uppercase hover:underline"><CheckCircle2 className="w-3 h-3" />{t.approveBtn}</button>
                                <button onClick={() => { onUpdateStatus(sub.id, "Rejected" as SubStatus); toast({ title: t.rejectBtn, description: clientName(sub.nameAr, sub.nameEn, lang) }); }} className="text-red-500 font-black text-[10px] uppercase hover:underline">{t.rejectBtn}</button>
                              </div>
                            )}
                            {/* Receive Cash button for subscriptions that got MCDR Accepted */}
                            {sub.status === "MCDR Accepted" && (
                              <button
                                onClick={() => openCashModal(sub.id, sub.amountDue)}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary text-white text-[10px] font-black hover:bg-primary/90 transition-colors">
                                <Wallet className="w-3 h-3" />
                                {lang === "ar" ? "استلام النقد" : "Receive Cash"}
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ); })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* ── Uploaded Documents Panel ── */}
          {expandedSubId && (() => {
            const sub = subscriptions.find(s => s.id === expandedSubId);
            if (!sub) return null;
            const DOC_MAP: Record<string, string> = {
              "National ID Copy": "/IPODemo/doc_nid.png",
              "Signed Subscription Form": "/IPODemo/doc_form.png",
              "Custodian Statement": "/IPODemo/doc_statement.png",
              "POA (if applicable)": "/IPODemo/doc_poa.png",
              "نسخة البطاقة القومية": "/IPODemo/doc_nid.png",
              "نموذج الاكتتاب الموقع": "/IPODemo/doc_form.png",
              "بيان الحافظ": "/IPODemo/doc_statement.png",
              "توكيل رسمي (إن وجد)": "/IPODemo/doc_poa.png",
            };
            return (
              <Card className="border-2 border-primary/30 bg-primary/5 dark:bg-primary/10">
                <CardContent className="pt-5 space-y-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="font-black text-sm tracking-tight">{lang === "ar" ? "المستندات المرفوعة" : "Uploaded Documents"}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{clientName(sub.nameAr, sub.nameEn, lang)} · {sub.unifiedCode}</p>
                    </div>
                    <button onClick={() => setExpandedSubId(null)} className="text-xs text-muted-foreground hover:text-foreground font-bold">✕ {lang === "ar" ? "إغلاق" : "Close"}</button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {(sub.uploadedDocs && sub.uploadedDocs.length > 0) ? sub.uploadedDocs.map((doc, i) => {
                      const imgUrl = DOC_MAP[doc] ?? "/IPODemo/doc_nid.png";
                      return (
                        <div key={i} className="border rounded-xl overflow-hidden bg-background hover:shadow-md transition-shadow cursor-pointer" onClick={() => setDocPreviewUrl(imgUrl)}>
                          <div className="aspect-[4/3] bg-muted/50 overflow-hidden flex items-center justify-center">
                            <img src={imgUrl} alt={doc} className="w-full h-full object-cover" loading="lazy" />
                          </div>
                          <div className="p-2.5 flex items-center gap-1.5">
                            <CheckCheck className="w-3.5 h-3.5 text-green-600 shrink-0" />
                            <span className="text-xs font-bold truncate">{doc}</span>
                          </div>
                        </div>
                      );
                    }) : (
                      <p className="text-xs text-muted-foreground col-span-full">{lang === "ar" ? "لا توجد مستندات مرفوعة" : "No documents uploaded"}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Document preview dialog */}
          <Dialog open={!!docPreviewUrl} onOpenChange={open => !open && setDocPreviewUrl(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
              <DialogHeader className="px-6 pt-6 pb-2">
                <DialogTitle>{lang === "ar" ? "معاينة المستند" : "Document Preview"}</DialogTitle>
                <DialogDescription>{lang === "ar" ? "اضغط خارج المربع أو اضغط Escape للإغلاق" : "Click outside or press Escape to close"}</DialogDescription>
              </DialogHeader>
              {docPreviewUrl && (
                <div className="px-6 pb-6 overflow-auto max-h-[70vh]">
                  <img src={docPreviewUrl} alt="Document" className="w-full h-auto rounded-lg border" />
                </div>
              )}
            </DialogContent>
          </Dialog>
          {/* FIX MCDR panel removed — handled by external RPA system */}
        </div>
      )}

      {/* ── FOLLOW UP TAB ── */}
      {supTab === "followup" && (() => {
        const followUpSubs = subscriptions.filter(s =>
          s.status === "Pending Cash" || s.status === "Pending MCDR Allocation"
        ).filter(s => {
          if (supIpoId !== "all" && s.ipoId !== supIpoId) return false;
          if (supPhase !== "all" && s.phase !== supPhase) return false;
          const name = (s.nameAr + " " + s.nameEn + " " + s.unifiedCode).toLowerCase();
          if (followUpSearch && !name.includes(followUpSearch.toLowerCase())) return false;
          if (followUpFilter !== "All" && s.status !== followUpFilter) return false;
          return true;
        });
        const selectedSub = followUpSelectedId ? subscriptions.find(s => s.id === followUpSelectedId) ?? null : null;
        const FILTERS = ["All", "Pending Cash", "Pending MCDR Allocation"];

        // Follow Up FIX handlers removed — MCDR allocation handled by external RPA system

        return (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1">
                <h2 className="text-xl font-black tracking-tight">{t.supTabFollowUp}</h2>
                <p className="text-muted-foreground text-sm">{lang === "ar" ? "اكتتابات تحتاج إلى متابعة — نقدية معلقة أو في انتظار تخصيص MCDR" : "Subscriptions requiring follow-up — Pending Cash or Pending MCDR Allocation"}</p>
              </div>
              <input
                className="border border-border rounded-xl px-3 py-2 text-sm bg-background w-full md:w-64"
                placeholder={lang === "ar" ? "بحث بالاسم أو الرمز الموحد..." : "Search by name or unified code..."}
                value={followUpSearch}
                onChange={e => setFollowUpSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {FILTERS.map(f => {
                const label = f === "All" ? (lang === "ar" ? "الكل" : "All") : f === "Pending Cash" ? t.statusPendingCash : t.statusPendingMCDR;
                return (
                  <button key={f} onClick={() => setFollowUpFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-black border transition-colors ${followUpFilter === f ? "bg-primary text-white border-primary" : "bg-muted text-muted-foreground border-border hover:border-primary/40"}`}>
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-[420px]">
              {/* List */}
              <div className="lg:col-span-2 border border-border rounded-2xl overflow-hidden">
                {followUpSubs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm">{lang === "ar" ? "لا توجد طلبات" : "No items"}</div>
                ) : followUpSubs.map(s => {
                  const isSel = followUpSelectedId === s.id;
                  return (
                    <div key={s.id} onClick={() => selectFollowUpSub(isSel ? null : s.id)}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 cursor-pointer transition-colors ${isSel ? "bg-primary/10" : "hover:bg-muted/40"}`}>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{clientName(s.nameAr, s.nameEn, lang)}</p>
                        <p className="text-xs font-mono text-muted-foreground">{s.unifiedCode} · {s.id}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <SubBadge status={s.status} />
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-black border ${s.phase === "covered" ? "bg-amber-500/10 text-amber-600 border-amber-500/30" : "bg-green-500/10 text-green-600 border-green-500/30"}`}>
                            <Layers className="w-2.5 h-2.5" />{s.phase === "covered" ? t.coveredPhaseBadge : t.uncoveredPhaseBadge}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs font-black text-primary shrink-0">{s.amountDue.toLocaleString(numLocale)} {t.egp}</p>
                    </div>
                  );
                })}
              </div>

              {/* Detail Panel */}
              <div className="lg:col-span-3 border border-border rounded-2xl p-5 space-y-4">
                {!selectedSub ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">{lang === "ar" ? "اختر طلباً للمراجعة" : "Select a subscription to review"}</div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-black text-lg">{clientName(selectedSub.nameAr, selectedSub.nameEn, lang)}</p>
                        <p className="text-xs font-mono text-muted-foreground">{selectedSub.id} · {selectedSub.unifiedCode}</p>
                      </div>
                      <SubBadge status={selectedSub.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-muted/40 rounded-xl p-3"><p className="text-[10px] font-black uppercase text-muted-foreground">{t.sharesCol}</p><p className="font-black text-base mt-0.5">{selectedSub.requestedShares.toLocaleString(numLocale)}</p></div>
                      <div className="bg-muted/40 rounded-xl p-3"><p className="text-[10px] font-black uppercase text-muted-foreground">{t.totalAmtLabel}</p><p className="font-black text-base mt-0.5 text-primary">{selectedSub.amountDue.toLocaleString(numLocale)} {t.egp}</p></div>
                    </div>

                    {/* Pending Cash resolve */}
                    {selectedSub.status === "Pending Cash" && (
                      <div className="border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10 rounded-xl p-4 space-y-2">
                        <p className="text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">{t.statusPendingCash}</p>
                        <p className="text-xs text-muted-foreground">{lang === "ar" ? "تأكيد استلام النقدية من الفرع وإعادة الطلب للمراجعة" : "Confirm cash received from branch and return subscription to review queue"}</p>
                        <Button size="sm" onClick={() => { onUpdateStatus(selectedSub.id, "Pending Review"); selectFollowUpSub(null); toast({ title: t.followUpResolvedCash, description: selectedSub.id }); }}>
                          <CheckCircle2 className="w-3.5 h-3.5 me-1.5" />{lang === "ar" ? "تأكيد النقدية وإعادة للمراجعة" : "Confirm Cash & Return to Review"}
                        </Button>
                      </div>
                    )}

                    {/* Pending MCDR Allocation — handled by external RPA system */}
                    {selectedSub.status === "Pending MCDR Allocation" && (
                      <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/30">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Zap className="w-4 h-4 text-primary" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{lang === "ar" ? "RPA — النظام الخارجي" : "RPA — External System"}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{lang === "ar" ? "التخصيص في MCDR يتم بواسطة روبوت RPA الخارجي. الطلب قيد المعالجة وسيتم تحديث الحالة تلقائيًا." : "MCDR allocation is handled by the external RPA robot. This request is being processed and the status will be updated automatically."}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}


      {/* Cash Receipt Modal */}
      <Dialog open={cashModalOpen} onOpenChange={open => !open && closeCashModal()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{lang === "ar" ? "استلام النقد" : "Receive Cash"}</DialogTitle>
            <DialogDescription>{lang === "ar" ? "أدخل مبلغ النقد المستلم وارفع إيصال الدفع" : "Enter the cash amount received and upload the payment receipt"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{lang === "ar" ? "المبلغ (ج.م)" : "Amount (EGP)"}</label>
              <Input
                type="number"
                value={cashReceiptAmount}
                onChange={e => setCashReceiptAmount(Number(e.target.value))}
                className="font-mono font-bold"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{lang === "ar" ? "إيصال الدفع" : "Payment Receipt"}</label>
              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center space-y-2">
                <Upload className="w-6 h-6 mx-auto text-muted-foreground" />
                <p className="text-xs text-muted-foreground font-bold">{lang === "ar" ? "اسحب الملف هنا أو انقر للرفع" : "Drag file here or click to upload"}</p>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1"
                onClick={() => {
                  if (cashTargetSubId) {
                    onReceiveCash(cashTargetSubId, cashReceiptAmount);
                    toast({ title: lang === "ar" ? "تم استلام النقد" : "Cash Received", description: `${cashReceiptAmount.toLocaleString()} ${lang === "ar" ? "ج.م" : "EGP"}` });
                  }
                  closeCashModal();
                }}
              >
                <CheckCircle2 className="w-4 h-4 me-2" />
                {lang === "ar" ? "تأكيد الاستلام" : "Confirm Receipt"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={closeCashModal}>
                {lang === "ar" ? "إلغاء" : "Cancel"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Back Office
// ─────────────────────────────────────────────────────────────────────────────
function BackOffice({ subscriptions, onAllocate, onRefund, activeStock, ipoStocks, onStocksChange, brokerBatches, page, onSwitchToUncovered,
  mcdrRows, setMcdrRows, reconRows, setReconRows, isReconciled, setIsReconciled, frozenSnapshot, setFrozenSnapshot,
  uncoveredMcdrRows, setUncoveredMcdrRows, uncoveredReconRows, setUncoveredReconRows, isUncoveredReconciled, setIsUncoveredReconciled,
  storedAllocationRatio, setStoredAllocationRatio, refundDone, setRefundDone,
  onSubmitBatch,
}: {
  subscriptions: Subscription[]; onAllocate: (allocationRatio: number, matchedCodes: Set<string>) => void; onRefund: () => void;
  activeStock: IPOStock | null; ipoStocks: IPOStock[]; onStocksChange: (s: IPOStock[]) => void; brokerBatches: BrokerBatch[];
  page: "covered" | "uncovered";
  onSubmitBatch: (batch: BrokerBatch) => void;
  onSwitchToUncovered: () => void;
  mcdrRows: MCDRRow[]; setMcdrRows: (v: MCDRRow[]) => void;
  reconRows: ReconRow[]; setReconRows: (v: ReconRow[]) => void;
  isReconciled: boolean; setIsReconciled: (v: boolean) => void;
  frozenSnapshot: FrozenSnapshot | null; setFrozenSnapshot: (v: FrozenSnapshot | null) => void;
  uncoveredMcdrRows: MCDRRow[]; setUncoveredMcdrRows: (v: MCDRRow[]) => void;
  uncoveredReconRows: ReconRow[]; setUncoveredReconRows: (v: ReconRow[]) => void;
  isUncoveredReconciled: boolean; setIsUncoveredReconciled: (v: boolean) => void;
  storedAllocationRatio: number | null; setStoredAllocationRatio: (v: number | null) => void;
  refundDone: boolean; setRefundDone: (v: boolean) => void;
}) {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [boTab, setBoTab] = useState<"MCDR" | "Allocation" | "Refunds" | "Reconciliation" | "CoveredHistory" | "Broker">("MCDR");
  const [reconFilter, setReconFilter] = useState("All");
  const [selectedBoIpoId, setSelectedBoIpoId] = useState<string>(activeStock?.id ?? (ipoStocks[0]?.id ?? ""));
  const [uncoveredReconFilter, setUncoveredReconFilter] = useState("All");
  const [drillCard, setDrillCard] = useState<"subscriptions" | "eligible" | "shares" | "cash" | null>(null);
  // Broker state
  const [brokerIPO, setBrokerIPO] = useState("");
  const [brokerPayMethod, setBrokerPayMethod] = useState("Bank Transfer");
  const [brokerTxRef, setBrokerTxRef] = useState("");
  const [fixAllocMsg, setFixAllocMsg] = useState("");
  const [fixAllocCopied, setFixAllocCopied] = useState(false);
  const [fixAllocSent, setFixAllocSent] = useState(false);
  // Broker wizard state
  const [brokerStep, setBrokerStep] = useState<1 | 2 | 3 | 4>(1);
  const [brokerAllClients, setBrokerAllClients] = useState<BrokerClient[]>([]);
  const [brokerAllFile, setBrokerAllFile] = useState<File | null>(null);
  const [multiBrokerFIX, setMultiBrokerFIX] = useState<Record<string, string>>({});
  const [brokerCashStatus, setBrokerCashStatus] = useState<Record<string, "pass" | "fail">>({});
  const [brokerMcdrStatus, setBrokerMcdrStatus] = useState<Record<string, "pass" | "fail">>({});
  const brokerRef = useRef<HTMLInputElement>(null);
  const mcdrRef = useRef<HTMLInputElement>(null);
  const uncoveredMcdrRef = useRef<HTMLInputElement>(null);
  const numLocale = lang === "ar" ? "ar-EG" : "en-US";
  // Reset to MCDR tab whenever the page (covered/uncovered) changes
  useEffect(() => { setBoTab("MCDR"); setDrillCard(null); }, [page]);

  const boActiveStock = ipoStocks.find(s => s.id === selectedBoIpoId) ?? activeStock;

  const boSubs = subscriptions.filter(s => s.ipoId === selectedBoIpoId);
  const clearingSubs = boSubs.filter(s => s.status !== "Pending Review");
  const allocatedSubs = boSubs.filter(s => s.allocatedShares > 0);
  const refundedSubs = boSubs.filter(s => s.refundAmount > 0);
  const approvedBoSubs = boSubs.filter(s => (["Verified", "Pending Payment", "Shortfall", "Allocated", "Refunded"] as SubStatus[]).includes(s.status));
  const approvedBoBatches = brokerBatches.filter(b => b.ipoId === selectedBoIpoId && b.status === "Approved");

  // Separate covered vs uncovered transactions using the explicit phase field
  const coveredApprovedSubs = approvedBoSubs.filter(s => s.phase === "covered");
  const uncoveredApprovedSubs = approvedBoSubs.filter(s => s.phase === "uncovered");
  const coveredApprovedBatches = approvedBoBatches.filter(b => b.phase === "covered");
  const uncoveredApprovedBatches = approvedBoBatches.filter(b => b.phase === "uncovered");

  // Stat cards: covered page always uses covered-phase data; uncovered page uses uncovered-phase data
  const pageSubs = page === "covered" ? coveredApprovedSubs : uncoveredApprovedSubs;
  const pageBatches = page === "covered" ? coveredApprovedBatches : uncoveredApprovedBatches;
  const brokerClientCount = pageBatches.reduce((a, b) => a + b.clients.length, 0);

  const totalSubscriptionsCount = pageSubs.length + brokerClientCount;
  const totalSharesSubscribed = pageSubs.reduce((a, s) => a + s.requestedShares, 0) + pageBatches.reduce((a, b) => a + b.clients.reduce((x, c) => x + c.qty, 0), 0);
  const totalCashAmount = pageSubs.reduce((a, s) => a + s.amountPaid, 0) + pageBatches.reduce((a, b) => a + b.clients.reduce((x, c) => x + c.cost, 0), 0);

  // Eligible IPO Shares:
  //   covered page  = covered MCDR upload total
  //   uncovered page = fixed gap: covered MCDR snapshot − covered subscribed (NOT affected by uncovered MCDR upload)
  const mcdrEligibleTotal = mcdrRows.reduce((a, r) => a + r.eligibleQty, 0);
  const uncoveredMcdrEligibleTotal = uncoveredMcdrRows.reduce((a, r) => a + r.eligibleQty, 0);
  void uncoveredMcdrEligibleTotal; // used only for reconciliation, not for stat cards
  const coveredSharesTotal = coveredApprovedSubs.reduce((a, s) => a + s.requestedShares, 0) + coveredApprovedBatches.reduce((a, b) => a + b.clients.reduce((x, c) => x + c.qty, 0), 0);
  const storedEligible = boActiveStock?.eligibleSharesSnapshot ?? 0;
  const uncoveredEligible = Math.max(0, storedEligible - coveredSharesTotal);
  const eligibleIPOShares = page === "covered" ? mcdrEligibleTotal : uncoveredEligible;
  // Coverage ratio = totalSharesSubscribed / eligibleIPOShares * 100 (covered page — percentage, capped 100)
  const coverageRatio = eligibleIPOShares > 0 ? Math.min(100, Math.round((totalSharesSubscribed / eligibleIPOShares) * 100)) : 0;
  // Uncovered page: raw subscription multiplier (e.g. 2.57×), NOT a percentage
  const uncoveredRatio = uncoveredEligible > 0 ? (totalSharesSubscribed / uncoveredEligible) : 0;
  const totalCashDisplay = totalCashAmount >= 1_000_000 ? `${(totalCashAmount / 1_000_000).toFixed(2)}M` : totalCashAmount.toLocaleString(numLocale);
  const activeMcdrRows = page === "covered" ? mcdrRows : uncoveredMcdrRows;

  const RECON_FILTERS = [
    { key: "All", label: t.filterAll },
    { key: "Partial", label: t.filterPartial },
    { key: "NotSubscribed", label: t.filterNotSubscribed },
  ];
  const filteredReconRows = useMemo(() => {
    if (reconFilter === "Partial") return reconRows.filter(r => r.subscribedShares > 0 && r.remainingShares > 0);
    if (reconFilter === "NotSubscribed") return reconRows.filter(r => r.subscribedShares === 0);
    return reconRows;
  }, [reconFilter, reconRows]);
  const filteredUncoveredReconRows = useMemo(() => {
    if (uncoveredReconFilter === "Partial") return uncoveredReconRows.filter(r => r.subscribedShares > 0 && r.remainingShares > 0);
    if (uncoveredReconFilter === "NotSubscribed") return uncoveredReconRows.filter(r => r.subscribedShares === 0);
    return uncoveredReconRows;
  }, [uncoveredReconFilter, uncoveredReconRows]);

  const handleAllocate = () => {
    // Only allocate clients who are fully or partially matched in reconciliation (subscribedShares > 0)
    const matchedCodes = new Set(uncoveredReconRows.filter(r => r.subscribedShares > 0).map(r => r.unifiedCode));
    // allocationRatio = totalOfferedShares / totalRequestedShares
    const allocationRatio = totalSharesSubscribed > 0 ? uncoveredEligible / totalSharesSubscribed : 0;
    setStoredAllocationRatio(allocationRatio);
    setRefundDone(false);
    onAllocate(allocationRatio, matchedCodes);
    toast({ title: t.toastAllocTitle, description: t.toastAllocDesc });
    setBoTab("Allocation");
  };
  const handleRefund = () => { onRefund(); setRefundDone(true); toast({ title: t.toastRefundTitle, description: t.toastRefundDesc }); };
  const handleExport = () => { exportCSV(clearingSubs, lang); toast({ title: t.toastExported, description: t.toastExportedDesc }); };

  const parseMCDR = (text: string) => {
    const lines = text.split('\n').filter(l => l.trim());
    const rows = lines.slice(1).map(line => {
      const p = line.split(',');
      return { clientName: p[0]?.trim() ?? "", ipoName: p[1]?.trim() ?? "", unifiedCode: p[2]?.trim() ?? "", eligibleQty: parseInt(p[3]?.trim() ?? "0", 10) || 0, subscribedQty: parseInt(p[4]?.trim() ?? "0", 10) || 0, settlementDate: p[5]?.trim() ?? "" };
    }).filter(r => r.clientName);
    setMcdrRows(rows);
    setIsReconciled(false);
    setReconRows([]);
    // Persist eligible total into the stock so gap survives role switching
    if (page === "covered" && boActiveStock) {
      const total = rows.reduce((a, r) => a + r.eligibleQty, 0);
      onStocksChange(ipoStocks.map(s => s.id === boActiveStock.id ? { ...s, eligibleSharesSnapshot: total } : s));
    }
  };

  const parseUncoveredMCDR = (text: string) => {
    const lines = text.split('\n').filter(l => l.trim());
    const rows = lines.slice(1).map(line => {
      const p = line.split(',');
      return { clientName: p[0]?.trim() ?? "", ipoName: p[1]?.trim() ?? "", unifiedCode: p[2]?.trim() ?? "", eligibleQty: parseInt(p[3]?.trim() ?? "0", 10) || 0, subscribedQty: parseInt(p[4]?.trim() ?? "0", 10) || 0, settlementDate: p[5]?.trim() ?? "" };
    }).filter(r => r.clientName);
    setUncoveredMcdrRows(rows);
    setIsUncoveredReconciled(false);
    setUncoveredReconRows([]);
    toast({ title: lang === "ar" ? "تم رفع MCDR غير المغطى" : "Uncovered MCDR Uploaded", description: lang === "ar" ? `${rows.length} سجل` : `${rows.length} records loaded` });
  };

  const handleReconcile = () => {
    const subByCode: Record<string, Subscription> = {};
    coveredApprovedSubs.forEach(s => { subByCode[s.unifiedCode] = s; });
    const brokerByCode: Record<string, { name: string; qty: number }> = {};
    coveredApprovedBatches.forEach(b => b.clients.forEach(c => { brokerByCode[c.unifiedCode] = { name: c.clientName, qty: c.qty }; }));
    const rows = mcdrRows.map(r => {
      const sub = subByCode[r.unifiedCode];
      const broker = brokerByCode[r.unifiedCode];
      const subscribedShares = sub ? sub.requestedShares : broker ? broker.qty : 0;
      const name = sub ? clientName(sub.nameAr, sub.nameEn, lang) : broker ? broker.name : r.clientName;
      const branch = sub ? sub.branch : broker ? (lang === "ar" ? "وسيط" : "Broker") : "—";
      const status = sub ? sub.status : broker ? (lang === "ar" ? "معتمد" : "Approved") : t.statusNotSubscribed;
      return { name, branch, unifiedCode: r.unifiedCode, eligibleShares: r.eligibleQty, subscribedShares, remainingShares: Math.max(0, r.eligibleQty - subscribedShares), status, source: sub ? "Individual" : broker ? "Broker" : "MCDR Only" };
    });
    setReconRows(rows);
    setIsReconciled(true);
    setReconFilter("All");
    toast({ title: lang === "ar" ? "تمت المطابقة" : "Reconciliation Complete", description: lang === "ar" ? `${rows.length} سجل تمت مطابقته` : `${rows.length} records reconciled` });
  };

  const handleUncoveredReconcile = () => {
    const subByCode: Record<string, Subscription> = {};
    uncoveredApprovedSubs.forEach(s => { subByCode[s.unifiedCode] = s; });
    const brokerByCode: Record<string, { name: string; qty: number }> = {};
    uncoveredApprovedBatches.forEach(b => b.clients.forEach(c => { brokerByCode[c.unifiedCode] = { name: c.clientName, qty: c.qty }; }));
    const rows = uncoveredMcdrRows.map(r => {
      const sub = subByCode[r.unifiedCode];
      const broker = brokerByCode[r.unifiedCode];
      const subscribedShares = sub ? sub.requestedShares : broker ? broker.qty : 0;
      const name = sub ? clientName(sub.nameAr, sub.nameEn, lang) : broker ? broker.name : r.clientName;
      const branch = sub ? sub.branch : broker ? (lang === "ar" ? "وسيط" : "Broker") : "—";
      const status = sub ? sub.status : broker ? (lang === "ar" ? "معتمد" : "Approved") : t.statusNotSubscribed;
      return { name, branch, unifiedCode: r.unifiedCode, eligibleShares: r.eligibleQty, subscribedShares, remainingShares: Math.max(0, r.eligibleQty - subscribedShares), status, source: sub ? "Individual" : broker ? "Broker" : "MCDR Only" };
    });
    setUncoveredReconRows(rows);
    setIsUncoveredReconciled(true);
    setUncoveredReconFilter("All");
    toast({ title: lang === "ar" ? "تمت المطابقة" : "Reconciliation Complete", description: lang === "ar" ? `${rows.length} سجل تمت مطابقته` : `${rows.length} records reconciled` });
  };

  const handleFinalizeCovered = () => {
    if (!boActiveStock || boActiveStock.coveredFinalized) return;
    const gap = Math.max(0, eligibleIPOShares - totalSharesSubscribed);
    setFrozenSnapshot({
      totalSubscriptionsCount,
      eligibleIPOShares,
      hasMcdr: activeMcdrRows.length > 0,
      totalSharesSubscribed,
      totalCashDisplay,
      coverageRatio,
      uncoveredGap: gap,
    });
    onStocksChange(ipoStocks.map(s =>
      s.id === boActiveStock.id ? { ...s, phase: "uncovered" as const, coveredFinalized: true } : s
    ));
    toast({
      title: t.coveredFinalizedLabel,
      description: lang === "ar"
        ? `تم إغلاق مرحلة المغطى لـ ${boActiveStock.securityNameAr} — تم حفظ لقطة البيانات`
        : `Covered phase closed for ${boActiveStock.securityNameEn} — data snapshot saved`,
    });
  };

  return (
    <div className="space-y-4">
      {/* Compact header — title + IPO selector + action buttons in one row */}
      <div className={`flex flex-wrap items-center gap-3 px-4 py-3 rounded-2xl border-2 ${page === "covered" ? "bg-amber-50/60 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800" : "bg-green-50/60 dark:bg-green-900/10 border-green-200 dark:border-green-800"}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${page === "covered" ? "bg-amber-500/20 text-amber-600" : "bg-green-500/20 text-green-600"}`}>
          <Layers className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-black tracking-tight leading-tight">
              {page === "covered"
                ? (lang === "ar" ? "عمليات مرحلة التغطية" : "Covered Phase Operations")
                : (lang === "ar" ? "عمليات مرحلة غير المغطى" : "Uncovered Phase Operations")}
            </h2>
            <Badge variant="outline" className={`text-[10px] font-black ${page === "covered" ? "bg-amber-500/10 text-amber-600 border-amber-500/30" : "bg-green-500/10 text-green-600 border-green-500/30"}`}>
              {page === "covered" ? t.coveredPhaseBadge : t.uncoveredPhaseBadge}
            </Badge>
          </div>
          <p className={`text-xs mt-0.5 font-bold ${page === "covered" ? "text-amber-700/70 dark:text-amber-400/70" : "text-green-700/70 dark:text-green-400/70"}`}>
            {page === "covered"
              ? (lang === "ar" ? "رفع MCDR والمطابقة والسجل التاريخي لمرحلة الاكتتاب المغطى" : "MCDR upload, reconciliation & history for the covered subscription stage")
              : (lang === "ar" ? "رفع MCDR والتخصيص وإعادة الأموال والمطابقة لمرحلة غير المغطى" : "MCDR upload, allocation, refunds & reconciliation for the uncovered subscription stage")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background/70">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide whitespace-nowrap">{t.selectIpoLabel}</label>
            <select value={selectedBoIpoId} onChange={e => setSelectedBoIpoId(e.target.value)} className="border-0 bg-transparent text-sm outline-none font-bold text-foreground">
              {ipoStocks.map(s => <option key={s.id} value={s.id}>{lang === "ar" ? s.securityNameAr : s.securityNameEn}</option>)}
            </select>
            {boActiveStock && <span className="font-mono text-[10px] text-muted-foreground hidden sm:inline">{boActiveStock.isin}</span>}
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}><FileSpreadsheet className="w-4 h-4 me-2" />{t.exportData}</Button>
          {page === "covered" && !boActiveStock?.coveredFinalized && (
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white border-0" onClick={handleFinalizeCovered}>
              <CheckCircle2 className="w-4 h-4 me-2" />{t.finalizeCoveredBtn}
            </Button>
          )}
          {page === "covered" && boActiveStock?.coveredFinalized && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="text-xs font-black">{t.coveredFinalizedLabel}</span>
            </div>
          )}
          {page === "uncovered" && boTab === "Allocation" && (
            <Button size="sm" onClick={handleAllocate} disabled={!isUncoveredReconciled || uncoveredReconRows.filter(r => r.subscribedShares > 0).length === 0} title={!isUncoveredReconciled ? (lang === "ar" ? "يجب تشغيل المطابقة أولاً" : "Run Reconciliation first") : undefined}>
              <ArrowLeftRight className="w-4 h-4 me-2" />{t.executeAlloc}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Grid — 5 compact cards (first 4 are drillable) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Card className={`cursor-pointer select-none transition-all ${drillCard === "subscriptions" ? "ring-2 ring-primary shadow-md" : "hover:border-primary/50"}`} onClick={() => setDrillCard(drillCard === "subscriptions" ? null : "subscriptions")}>
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">{t.stat0}</p>
            {(() => {
              const snap = page === "covered" ? frozenSnapshot : null;
              const count = snap ? snap.totalSubscriptionsCount : totalSubscriptionsCount;
              return (
                <>
                  <p className="text-2xl font-black text-foreground mt-0.5">{count.toLocaleString(numLocale)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {snap
                      ? (lang === "ar" ? "لقطة مجمدة عند الإغلاق" : "Snapshot at finalize")
                      : (lang === "ar" ? `${pageSubs.length} فردي · ${brokerClientCount} وسيط` : `${pageSubs.length} indiv · ${brokerClientCount} broker`)}
                  </p>
                </>
              );
            })()}
          </CardContent>
        </Card>
        <Card className={`cursor-pointer select-none transition-all ${drillCard === "eligible" ? "ring-2 ring-amber-500 shadow-md" : "hover:border-amber-400/50"}`} onClick={() => setDrillCard(drillCard === "eligible" ? null : "eligible")}>
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">{t.eligibleSharesCard}</p>
            {(() => {
              const snap = page === "covered" ? frozenSnapshot : null;
              // covered page: guard on MCDR upload; uncovered page: guard on covered snapshot existing
              const hasValue = page === "covered"
                ? (snap ? snap.hasMcdr : activeMcdrRows.length > 0)
                : storedEligible > 0;
              // covered page after finalize: show frozen gap; covered before finalize: show MCDR total; uncovered: always show fixed gap
              const eligible = page === "covered"
                ? (snap ? snap.uncoveredGap : eligibleIPOShares)
                : uncoveredEligible;
              const subtext = page === "covered"
                ? (hasValue ? (snap ? (lang === "ar" ? "فجوة غير المغطى المجمدة" : "Frozen uncovered gap") : t.mcdrRecords(activeMcdrRows.length)) : t.mcdrUploadFirst)
                : (lang === "ar" ? "ثابت — فجوة مرحلة المغطى" : "Fixed — covered phase gap");
              return (
                <>
                  <p className={`text-2xl font-black mt-0.5 ${hasValue ? "text-amber-600" : "text-muted-foreground"}`}>
                    {hasValue ? eligible.toLocaleString(numLocale) : "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{subtext}</p>
                </>
              );
            })()}
          </CardContent>
        </Card>
        <Card className={`cursor-pointer select-none transition-all ${drillCard === "shares" ? "ring-2 ring-primary shadow-md" : "hover:border-primary/50"}`} onClick={() => setDrillCard(drillCard === "shares" ? null : "shares")}>
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">{t.totalSubscribedCard}</p>
            {(() => {
              const snap = page === "covered" ? frozenSnapshot : null;
              const shares = snap ? snap.totalSharesSubscribed : totalSharesSubscribed;
              return (
                <>
                  <p className="text-2xl font-black text-primary mt-0.5">{shares.toLocaleString(numLocale)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {snap ? (lang === "ar" ? "لقطة مجمدة" : "Snapshot") : (lang === "ar" ? "طلبات معتمدة" : "Approved requests")}
                  </p>
                </>
              );
            })()}
          </CardContent>
        </Card>
        <Card className={`cursor-pointer select-none transition-all ${drillCard === "cash" ? "ring-2 ring-emerald-500 shadow-md" : "hover:border-emerald-400/50"}`} onClick={() => setDrillCard(drillCard === "cash" ? null : "cash")}>
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">{t.totalCashCard}</p>
            {(() => {
              const snap = page === "covered" ? frozenSnapshot : null;
              const cash = snap ? snap.totalCashDisplay : (totalSharesSubscribed > 0 ? totalCashDisplay : "—");
              return (
                <>
                  <p className="text-2xl font-black text-emerald-600 mt-0.5">{cash}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{t.egp}</p>
                </>
              );
            })()}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">{t.coverageRatioCard}</p>
            {(() => {
              if (page === "uncovered") {
                // Raw subscription multiplier: totalSharesSubscribed ÷ uncoveredEligible (e.g. 2.57×)
                const hasValue = uncoveredEligible > 0;
                const display = hasValue ? `${uncoveredRatio.toFixed(2)}×` : "—";
                const color = !hasValue ? "text-muted-foreground" : uncoveredRatio >= 1 ? "text-red-500" : "text-teal-600";
                return (
                  <>
                    <p className={`text-2xl font-black mt-0.5 ${color}`}>{display}</p>
                    {hasValue && (
                      <div className="w-full h-1 rounded-full bg-muted mt-1.5 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${uncoveredRatio >= 1 ? "bg-red-500" : "bg-teal-500"}`} style={{ width: `${Math.min(100, uncoveredRatio * 100)}%` }} />
                      </div>
                    )}
                  </>
                );
              }
              // Covered page: percentage display (capped at 100%)
              const snap = frozenSnapshot;
              const ratio = snap ? snap.coverageRatio : coverageRatio;
              const hasValue = snap ? snap.hasMcdr : activeMcdrRows.length > 0;
              return (
                <>
                  <p className={`text-2xl font-black mt-0.5 ${ratio >= 100 ? "text-red-500" : ratio > 0 ? "text-teal-600" : "text-muted-foreground"}`}>
                    {hasValue ? `${ratio}%` : "—"}
                  </p>
                  {hasValue && (
                    <div className="w-full h-1 rounded-full bg-muted mt-1.5 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${ratio >= 100 ? "bg-red-500" : "bg-teal-500"}`} style={{ width: `${Math.min(100, ratio)}%` }} />
                    </div>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>
        {/* Uncovered Gap — only on covered page */}
        {page === "covered" && (
          <Card className={`${frozenSnapshot ? "border-amber-400 bg-amber-50/40 dark:bg-amber-900/10" : ""}`}>
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">{t.reconGapLabel}</p>
              {(() => {
                const gap = frozenSnapshot
                  ? frozenSnapshot.uncoveredGap
                  : (activeMcdrRows.length > 0 ? Math.max(0, eligibleIPOShares - totalSharesSubscribed) : null);
                return (
                  <>
                    <p className={`text-2xl font-black mt-0.5 ${gap === null ? "text-muted-foreground" : gap === 0 ? "text-green-600" : "text-amber-600"}`}>
                      {gap === null ? "—" : gap.toLocaleString(numLocale)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {frozenSnapshot
                        ? (lang === "ar" ? "→ بداية مرحلة غير المغطى" : "→ Start of Uncovered Stage")
                        : (lang === "ar" ? "الأهلي − المكتتب" : "Eligible − Subscribed")}
                    </p>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Drill-down panel */}
      {drillCard !== null && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-black">
                {drillCard === "subscriptions" && (lang === "ar" ? "تفاصيل الاشتراكات" : "Subscription Breakdown")}
                {drillCard === "eligible" && (lang === "ar" ? "تفاصيل الأهلية (MCDR)" : "MCDR Eligibility Detail")}
                {drillCard === "shares" && (lang === "ar" ? "تفاصيل الأسهم المكتتبة" : "Subscribed Shares Detail")}
                {drillCard === "cash" && (lang === "ar" ? "تفاصيل إجمالي المدفوع" : "Cash Amount Detail")}
              </CardTitle>
              <button onClick={() => setDrillCard(null)} className="text-muted-foreground hover:text-foreground text-xs font-black px-2 py-1 rounded-lg hover:bg-muted transition-colors">✕</button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            {drillCard === "subscriptions" && (
              <div className="overflow-x-auto rounded-xl border border-border/50">
                <Table>
                  <TableHeader><TableRow className="bg-muted/30">
                    {[t.colInvestor, t.colBranch, t.colBroker, t.colCustodian, t.colIPOName, t.sharesCol, t.totalAmtLabel, t.colSubmittedAt, t.colStatus, t.colRef].map(col => (
                      <TableHead key={col} className="font-black text-[10px] uppercase tracking-widest text-muted-foreground whitespace-nowrap">{col}</TableHead>
                    ))}
                  </TableRow></TableHeader>
                  <TableBody>
                    {pageSubs.length === 0 && brokerClientCount === 0 ? (
                      <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">{t.noRecords}</TableCell></TableRow>
                    ) : <>
                      {pageSubs.map(sub => (
                        <TableRow key={sub.id} className="hover:bg-muted/30">
                          <TableCell><p className="font-bold text-sm">{clientName(sub.nameAr, sub.nameEn, lang)}</p><p className="text-[10px] font-mono text-muted-foreground">{sub.unifiedCode}</p></TableCell>
                          <TableCell className="text-sm font-bold text-muted-foreground">{sub.branch}</TableCell>
                          <TableCell className="text-xs font-bold text-muted-foreground whitespace-nowrap">{sub.broker ?? "—"}</TableCell>
                          <TableCell className="text-xs font-bold text-muted-foreground whitespace-nowrap">{sub.custodian ?? "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{boActiveStock ? (lang === "ar" ? boActiveStock.securityNameAr : boActiveStock.securityNameEn) : "—"}</TableCell>
                          <TableCell className="font-bold text-sm">{sub.requestedShares.toLocaleString(numLocale)}</TableCell>
                          <TableCell className="font-black text-sm text-primary">{sub.amountPaid.toLocaleString(numLocale)}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">{sub.submittedAt}</TableCell>
                          <TableCell><SubBadge status={sub.status} /></TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{sub.id}</TableCell>
                        </TableRow>
                      ))}
                      {pageBatches.flatMap(b => b.clients.map((c, i) => (
                        <TableRow key={`${b.id}-${i}`} className="hover:bg-muted/30 bg-blue-500/5">
                          <TableCell><p className="font-bold text-sm">{c.clientName}</p><p className="text-[10px] font-mono text-muted-foreground">{c.unifiedCode}</p></TableCell>
                          <TableCell className="text-sm font-bold text-muted-foreground">{lang === "ar" ? `وسيط: ${b.broker}` : `Broker: ${b.broker}`}</TableCell>
                          <TableCell className="text-xs font-bold text-muted-foreground whitespace-nowrap">{b.broker}</TableCell>
                          <TableCell className="text-xs font-bold text-muted-foreground whitespace-nowrap">{c.custodian || "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{boActiveStock ? (lang === "ar" ? boActiveStock.securityNameAr : boActiveStock.securityNameEn) : "—"}</TableCell>
                          <TableCell className="font-bold text-sm">{c.qty.toLocaleString(numLocale)}</TableCell>
                          <TableCell className="font-black text-sm text-primary">{c.cost.toLocaleString(numLocale)}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">{c.date}</TableCell>
                          <TableCell><Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-black text-[10px]">{lang === "ar" ? "وسيط" : "Broker"}</Badge></TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{c.ref || "—"}</TableCell>
                        </TableRow>
                      )))}
                    </>}
                  </TableBody>
                </Table>
              </div>
            )}
            {drillCard === "eligible" && (
              <div className="overflow-x-auto rounded-xl border border-border/50">
                <Table>
                  <TableHeader><TableRow className="bg-muted/30">
                    {[t.colName, t.colUnified, t.colEligible, t.colSubscribed, t.colSettlementDate].map(col => (
                      <TableHead key={col} className="font-black text-[10px] uppercase tracking-widest text-muted-foreground whitespace-nowrap">{col}</TableHead>
                    ))}
                  </TableRow></TableHeader>
                  <TableBody>
                    {(page === "covered" ? mcdrRows : uncoveredMcdrRows).length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t.mcdrUploadFirst}</TableCell></TableRow>
                    ) : (page === "covered" ? mcdrRows : uncoveredMcdrRows).map((r, i) => (
                      <TableRow key={i} className="hover:bg-muted/30">
                        <TableCell className="font-bold text-sm">{r.clientName}</TableCell>
                        <TableCell className="font-mono text-sm">{r.unifiedCode}</TableCell>
                        <TableCell className="font-bold text-amber-600">{r.eligibleQty.toLocaleString(numLocale)}</TableCell>
                        <TableCell className="font-bold text-primary">{r.subscribedQty.toLocaleString(numLocale)}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{r.settlementDate}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {drillCard === "shares" && (
              <div className="overflow-x-auto rounded-xl border border-border/50">
                <Table>
                  <TableHeader><TableRow className="bg-muted/30">
                    {[t.colInvestor, t.colBranch, t.sharesCol, t.colStatus].map(col => (
                      <TableHead key={col} className="font-black text-[10px] uppercase tracking-widest text-muted-foreground whitespace-nowrap">{col}</TableHead>
                    ))}
                  </TableRow></TableHeader>
                  <TableBody>
                    {pageSubs.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{t.noRecords}</TableCell></TableRow>
                    ) : [...pageSubs].sort((a, b) => b.requestedShares - a.requestedShares).map(sub => (
                      <TableRow key={sub.id} className="hover:bg-muted/30">
                        <TableCell><p className="font-bold text-sm">{clientName(sub.nameAr, sub.nameEn, lang)}</p><p className="text-[10px] font-mono text-muted-foreground">{sub.unifiedCode}</p></TableCell>
                        <TableCell className="text-sm font-bold text-muted-foreground">{sub.branch}</TableCell>
                        <TableCell className="font-black text-primary">{sub.requestedShares.toLocaleString(numLocale)}</TableCell>
                        <TableCell><SubBadge status={sub.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {drillCard === "cash" && (
              <div className="overflow-x-auto rounded-xl border border-border/50">
                <Table>
                  <TableHeader><TableRow className="bg-muted/30">
                    {[t.colInvestor, t.colBranch, t.totalAmtLabel, t.sharesCol, t.colStatus].map(col => (
                      <TableHead key={col} className="font-black text-[10px] uppercase tracking-widest text-muted-foreground whitespace-nowrap">{col}</TableHead>
                    ))}
                  </TableRow></TableHeader>
                  <TableBody>
                    {pageSubs.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t.noRecords}</TableCell></TableRow>
                    ) : [...pageSubs].sort((a, b) => b.amountPaid - a.amountPaid).map(sub => (
                      <TableRow key={sub.id} className="hover:bg-muted/30">
                        <TableCell><p className="font-bold text-sm">{clientName(sub.nameAr, sub.nameEn, lang)}</p><p className="text-[10px] font-mono text-muted-foreground">{sub.unifiedCode}</p></TableCell>
                        <TableCell className="text-sm font-bold text-muted-foreground">{sub.branch}</TableCell>
                        <TableCell className="font-black text-emerald-600">{sub.amountPaid.toLocaleString(numLocale)} <span className="text-[10px] font-normal">{t.egp}</span></TableCell>
                        <TableCell className="font-bold text-primary">{sub.requestedShares.toLocaleString(numLocale)}</TableCell>
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

      {/* Tabs — split by page */}
      <div className="flex flex-wrap gap-1 border-b border-border pb-2">
        {page === "covered" && <>
          <TabBtn id="bo-MCDR" active={boTab === "MCDR"} onClick={() => setBoTab("MCDR")}>{t.boTabMCDR}</TabBtn>
          <TabBtn id="bo-Reconciliation" active={boTab === "Reconciliation"} onClick={() => setBoTab("Reconciliation")}>{t.boTabRecon}</TabBtn>
          {boActiveStock?.coveredFinalized && <TabBtn id="bo-CoveredHistory" active={boTab === "CoveredHistory"} onClick={() => setBoTab("CoveredHistory")}>{t.boTabCoveredHistory}</TabBtn>}
        </>}
        {page === "uncovered" && <>
          <TabBtn id="bo-MCDR" active={boTab === "MCDR"} onClick={() => setBoTab("MCDR")}>{t.boTabMCDR}</TabBtn>
          <TabBtn id="bo-Reconciliation" active={boTab === "Reconciliation"} onClick={() => setBoTab("Reconciliation")}>{t.boTabRecon}</TabBtn>
          <TabBtn id="bo-Allocation" active={boTab === "Allocation"} onClick={() => setBoTab("Allocation")}>{t.boTabAlloc}</TabBtn>
          <TabBtn id="bo-Refunds" active={boTab === "Refunds"} onClick={() => setBoTab("Refunds")}>{t.boTabRefunds}</TabBtn>
        </>}
        <TabBtn id="bo-Broker" active={boTab === "Broker"} onClick={() => setBoTab("Broker")} icon={Building2}>{t.boTabBroker}</TabBtn>
      </div>
      {page === "covered" && (boTab === "Allocation" || boTab === "Refunds") && (() => { setBoTab("MCDR"); return null; })()}
      {page === "covered" && !boActiveStock?.coveredFinalized && boTab === "CoveredHistory" && (() => { setBoTab("MCDR"); return null; })()}

      {boTab === "MCDR" && page === "covered" && (
        <Card>
          <CardHeader><CardTitle>{t.mcdrUploadTitle}</CardTitle><CardDescription>{t.mcdrUploadDesc}</CardDescription></CardHeader>
          <CardContent>
            {mcdrRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl py-16 gap-5">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center"><FileSpreadsheet className="w-7 h-7 text-muted-foreground" /></div>
                <div className="text-center"><p className="font-bold">{t.mcdrUploadTitle}</p><p className="text-sm text-muted-foreground mt-1">{t.mcdrUploadDesc}</p></div>
                <input ref={mcdrRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = ev => parseMCDR(ev.target?.result as string);
                  reader.readAsText(file);
                  e.target.value = "";
                }} />
                <Button onClick={() => mcdrRef.current?.click()}><Upload className="w-4 h-4 me-2" />{t.uploadMCDRBtn}</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-green-600 font-bold text-sm"><CheckCircle2 className="w-5 h-5" />{t.mcdrTitle} — {t.mcdrRecords(mcdrRows.length)}</div>
                  <Button variant="outline" size="sm" onClick={() => setMcdrRows([])}><Upload className="w-3.5 h-3.5 me-1" />{t.uploadMCDRBtn}</Button>
                </div>
                <div className="overflow-x-auto rounded-xl border border-border/50">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        {[t.colName, t.colIPOName, t.colUnified, t.colEligible, t.colSubscribed, t.colSettlementDate, t.colStatus].map(col => (
                          <TableHead key={col} className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">{col}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mcdrRows.map((r, i) => {
                        const isFull = r.subscribedQty >= r.eligibleQty;
                        return (
                          <TableRow key={i} className="hover:bg-muted/30">
                            <TableCell className="font-bold text-sm">{r.clientName}</TableCell>
                            <TableCell className="text-sm font-bold text-primary">{r.ipoName}</TableCell>
                            <TableCell className="text-sm font-mono font-bold">{r.unifiedCode}</TableCell>
                            <TableCell className="text-sm font-bold">{r.eligibleQty.toLocaleString(numLocale)}</TableCell>
                            <TableCell className="text-sm font-black text-primary">{r.subscribedQty.toLocaleString(numLocale)}</TableCell>
                            <TableCell className="text-sm font-mono text-muted-foreground">{r.settlementDate}</TableCell>
                            <TableCell><Badge variant="outline" className={isFull ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"}>{isFull ? t.mcdrStatusFull : t.mcdrStatusPartial}</Badge></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {boTab === "Allocation" && (() => {
        // Compute allocation rows upfront so header buttons and table share the same data
        const allocMatchedRows = uncoveredReconRows.filter(r => r.subscribedShares > 0);
        const allocRatioPct = storedAllocationRatio !== null ? `${(storedAllocationRatio * 100).toFixed(1)}%` : "";
        const allocAmounts = storedAllocationRatio !== null
          ? applyLargestRemainder(allocMatchedRows.map(r => r.subscribedShares), storedAllocationRatio, uncoveredEligible)
          : [];
        const paidByCode = new Map<string, number>();
        for (const s of pageSubs) paidByCode.set(s.unifiedCode, (paidByCode.get(s.unifiedCode) ?? 0) + s.amountPaid);
        const allocExportRows = allocMatchedRows.map((row, idx) => ({
          name: row.name, unifiedCode: row.unifiedCode,
          subscribedShares: row.subscribedShares,
          allocated: allocAmounts[idx] ?? 0,
          paid: paidByCode.get(row.unifiedCode) ?? row.subscribedShares * TOTAL_PER_SHARE,
          refundable: (row.subscribedShares - (allocAmounts[idx] ?? 0)) * PAR_VALUE,
        }));
        const handleGenerateFixAlloc = () => {
          const stock = boActiveStock;
          const ts = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
          const price = stock?.pricePerShare ?? 0;
          const symbol = stock?.symbol ?? "IPO";
          const isin = stock?.isin ?? "—";
          const lines: string[] = [
            `=== FIX 4.4 ALLOCATION — ${symbol} | ${t.fixAllocMsgs} ===`,
            `Ratio: ${allocRatioPct} | Records: ${allocExportRows.length} | Generated: ${new Date().toLocaleString()}`,
            "",
          ];
          allocExportRows.forEach((row, i) => {
            const seq = String(i + 1).padStart(3, "0");
            lines.push(
              `--- ${t.fixAllocRecord} ${seq}: ${row.name} (${row.unifiedCode}) ---`,
              `8=FIX.4.4`, `9=212`, `35=J`, `49=QNB-CLEARING`, `56=MCDR`,
              `34=${i + 1}`, `52=${ts}`,
              `70=ALLOC-${ts}-${seq}`, `71=0`, `626=1`,
              `55=${symbol}`, `48=${isin}`, `22=4`, `54=1`,
              `38=${row.subscribedShares}`, `800=${row.allocated}`,
              `44=${price.toFixed(2)}`, `74=1`,
              `78=1`, `79=${row.name}`, `467=${row.unifiedCode}`,
              `80=${row.allocated}`, `81=0`, `736=${(row.refundable).toFixed(2)}`,
              `60=${ts}`, `10=000`, ``,
            );
          });
          setFixAllocMsg(lines.join("\n"));
          setFixAllocSent(false);
        };

        return (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex justify-end gap-2">
                  {storedAllocationRatio !== null && (
                    <Button variant="outline" size="sm" onClick={() => { exportAllocationCSV(allocExportRows, allocRatioPct, lang); toast({ title: t.toastExported, description: t.toastExportedDesc }); }}>
                      <FileSpreadsheet className="w-4 h-4 me-2" />{t.exportData}
                    </Button>
                  )}
                  {storedAllocationRatio !== null && <Button size="sm" onClick={() => setBoTab("Refunds")}>{t.proceedRefunds}</Button>}
                </div>
              </CardHeader>
              <CardContent>
                {storedAllocationRatio === null ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="font-bold">{t.noRecords}</p>
                    <p className="text-sm mt-1">
                      {!isUncoveredReconciled
                        ? (lang === "ar" ? "يجب تشغيل المطابقة أولاً ثم نفّذ التخصيص." : "Run Reconciliation first, then Execute Allocation.")
                        : (lang === "ar" ? "نفّذ التخصيص من الزر أعلاه." : "Click Execute Allocation above.")}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border/50">
                    <Table>
                      <TableHeader><TableRow className="bg-primary/5">{[t.colName, t.colRequested, t.colAllocShares, t.colRatioPct, t.colTotalPaid, t.colRefundable].map(col => <TableHead key={col} className="font-black text-[10px] uppercase tracking-widest text-primary/70">{col}</TableHead>)}</TableRow></TableHeader>
                      <TableBody>
                        {allocExportRows.map(row => (
                          <TableRow key={row.unifiedCode} className="hover:bg-muted/30">
                            <TableCell className="font-bold text-sm">{row.name}</TableCell>
                            <TableCell className="text-sm font-bold text-muted-foreground">{row.subscribedShares.toLocaleString(numLocale)}</TableCell>
                            <TableCell className="text-sm font-black text-primary">{row.allocated.toLocaleString(numLocale)}</TableCell>
                            <TableCell><Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">{allocRatioPct}</Badge></TableCell>
                            <TableCell className="text-sm font-bold text-muted-foreground">{row.paid.toLocaleString(numLocale)}</TableCell>
                            <TableCell className="text-sm font-black text-red-500">{row.refundable.toLocaleString(numLocale)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        );
      })()}

      {boTab === "Refunds" && (() => {
        if (storedAllocationRatio === null) {
          return (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                <p className="font-bold">{t.noRecords}</p>
                <p className="text-sm mt-1">{lang === "ar" ? "نفّذ التخصيص أولاً." : "Run Execute Allocation first."}</p>
              </CardContent>
            </Card>
          );
        }
        // Drive refund display from reconciliation rows — largest-remainder for exact totals
        const reconMatched = uncoveredReconRows.filter(r => r.subscribedShares > 0);
        const allocatedAmounts = applyLargestRemainder(reconMatched.map(r => r.subscribedShares), storedAllocationRatio, uncoveredEligible);
        const matchedRows = reconMatched.map((r, idx) => {
          const allocated = allocatedAmounts[idx];
          const refundedShares = r.subscribedShares - allocated;
          return { name: r.name, unifiedCode: r.unifiedCode, subscribedShares: r.subscribedShares, allocated, refundedShares, refundAmount: refundedShares * PAR_VALUE };
        });
        const cols = [t.colName, lang === "ar" ? "الأسهم المطلوبة" : "Requested Shares", t.colAllocShares, lang === "ar" ? "أسهم مردودة" : "Refunded Shares", t.colRefundAmt];
        const borderColor = refundDone ? "border-emerald-200/60" : "border-amber-200/60";
        const headerBg = refundDone ? "bg-emerald-50/50 dark:bg-emerald-900/10" : "bg-amber-50/60 dark:bg-amber-900/10";
        const headerText = refundDone ? "text-emerald-600" : "text-amber-700";
        return (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>{t.refundsTitle}</CardTitle>
                <div className="flex gap-2">
                  {!refundDone && <Button size="sm" onClick={handleRefund}><ArrowLeftRight className="w-4 h-4 me-2" />{lang === "ar" ? "معالجة المردودات" : "Process Refunds"}</Button>}
                  <Button variant="outline" size="sm" onClick={() => { exportRefundCSV(matchedRows, lang); toast({ title: t.toastExported, description: t.toastExportedDesc }); }}>
                    <FileSpreadsheet className="w-4 h-4 me-2" />{t.exportData}
                  </Button>
                  {refundDone && <Button size="sm" variant="outline" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" onClick={handleExport}><FileSpreadsheet className="w-4 h-4 me-2" />{t.exportBankFile}</Button>}
                </div>
              </div>
              {refundDone && <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mt-1">{lang === "ar" ? "تم الاسترداد" : "Refunds Processed"}</p>}
              {!refundDone && <p className="text-xs font-black text-amber-600 uppercase tracking-widest mt-1">{lang === "ar" ? "في انتظار المعالجة" : "Pending Processing"}</p>}
            </CardHeader>
            <CardContent>
              <div className={`overflow-x-auto rounded-xl border ${borderColor}`}>
                <Table>
                  <TableHeader><TableRow className={headerBg}>{cols.map(col => <TableHead key={col} className={`font-black text-[10px] uppercase tracking-widest ${headerText}`}>{col}</TableHead>)}</TableRow></TableHeader>
                  <TableBody>
                    {matchedRows.map(row => (
                      <TableRow key={row.unifiedCode} className="hover:bg-muted/30">
                        <TableCell className="font-bold text-sm">{row.name}</TableCell>
                        <TableCell className="text-sm font-bold text-muted-foreground">{row.subscribedShares.toLocaleString(numLocale)}</TableCell>
                        <TableCell className="text-sm font-black text-primary">{row.allocated.toLocaleString(numLocale)}</TableCell>
                        <TableCell className={`text-sm font-bold ${refundDone ? "text-emerald-600" : "text-amber-600"}`}>{row.refundedShares.toLocaleString(numLocale)}</TableCell>
                        <TableCell className={`text-sm font-black ${refundDone ? "text-emerald-600" : "text-red-500"}`}>{row.refundAmount.toLocaleString(numLocale)} {t.egp}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {boTab === "Reconciliation" && page === "covered" && (
        <div className="space-y-3">
          {/* Reconcile action bar */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div>
                  <p className="font-black text-sm">{t.reconTitle}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{lang === "ar" ? "مقارنة الاكتتابات المعتمدة (أفراد + وسطاء) مع بيانات MCDR" : "Compare approved subscriptions (individuals + brokers) against MCDR data"}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {isReconciled && (
                    <div className="flex bg-muted p-1 rounded-xl gap-1">
                      {RECON_FILTERS.map(({ key, label }) => (
                        <button key={key} onClick={() => setReconFilter(key)} className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${reconFilter === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>
                      ))}
                    </div>
                  )}
                  {isReconciled && <Button size="sm" variant="outline" onClick={() => { exportReconCSV(filteredReconRows, lang, "reconciliation-covered.csv"); toast({ title: t.toastExported, description: t.toastExportedDesc }); }} className="shrink-0"><FileSpreadsheet className="w-4 h-4 me-2" />{t.exportReconBtn}</Button>}
                  <Button size="sm" onClick={handleReconcile} disabled={mcdrRows.length === 0} className="shrink-0">
                    <CheckCheck className="w-4 h-4 me-2" />{t.reconBtn}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results table */}
          <Card>
            <CardContent className="pt-4 pb-4">
              {!isReconciled ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                  <CheckCheck className="w-10 h-10 text-muted-foreground/40" />
                  <p className="font-bold text-sm text-muted-foreground">{mcdrRows.length === 0 ? t.reconNeedsMCDR : t.reconRunFirst}</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border/50">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        {[t.colInvestor, t.colBranch, t.colEligibleShares, t.colSubscribedShares, t.colRemainingShares, t.colStatus].map((col, i) => (
                          <TableHead key={i} className="font-black text-[10px] uppercase tracking-widest text-muted-foreground whitespace-nowrap">{col}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReconRows.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">{t.noRecords}</TableCell></TableRow>
                      ) : filteredReconRows.map((row, i) => (
                        <TableRow key={i} className={`hover:bg-muted/30 ${row.subscribedShares === 0 ? "bg-red-500/5" : row.remainingShares > 0 ? "bg-amber-500/5" : ""}`}>
                          <TableCell>
                            <p className="font-bold text-sm">{row.name}</p>
                            <p className="text-[10px] font-mono text-muted-foreground">{row.unifiedCode}</p>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground font-bold">{row.branch}</TableCell>
                          <TableCell className="text-sm font-bold text-amber-600">{row.eligibleShares.toLocaleString(numLocale)}</TableCell>
                          <TableCell className="text-sm font-black text-primary">{row.subscribedShares.toLocaleString(numLocale)}</TableCell>
                          <TableCell>
                            {row.remainingShares > 0 ? (
                              <span className="font-black text-sm text-red-500">{row.remainingShares.toLocaleString(numLocale)}</span>
                            ) : (
                              <span className="font-bold text-sm text-green-600">0 ✓</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              row.status === t.statusNotSubscribed ? "bg-red-500/10 text-red-600 border-red-500/20 font-black text-[10px]" :
                              row.remainingShares > 0 ? "bg-amber-500/10 text-amber-600 border-amber-500/20 font-black text-[10px]" :
                              "bg-green-500/10 text-green-600 border-green-500/20 font-black text-[10px]"
                            }>{row.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Covered History ── */}
      {boTab === "CoveredHistory" && page === "covered" && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-black tracking-tight">{t.boTabCoveredHistory}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{t.coveredHistoryDesc}</p>
          </div>
          {/* Individual subscriptions */}
          {coveredApprovedSubs.length > 0 ? (
            <Card>
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="text-sm font-black">{lang === "ar" ? "الاشتراكات الفردية" : "Individual Subscriptions"}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto rounded-xl border border-border/50">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        {[t.colInvestor, t.colBranch, t.colBroker, t.colCustodian, t.sharesCol, t.totalAmtLabel, t.colSubmittedAt, t.colStatus].map(col => (
                          <TableHead key={col} className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">{col}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {coveredApprovedSubs.map(sub => (
                        <TableRow key={sub.id} className="hover:bg-muted/30">
                          <TableCell><p className="font-bold text-sm">{clientName(sub.nameAr, sub.nameEn, lang)}</p><p className="text-xs font-mono text-muted-foreground">{sub.unifiedCode}</p></TableCell>
                          <TableCell className="text-sm text-muted-foreground font-bold">{sub.branch}</TableCell>
                          <TableCell className="text-xs font-bold text-muted-foreground whitespace-nowrap">{sub.broker ?? "—"}</TableCell>
                          <TableCell className="text-xs font-bold text-muted-foreground whitespace-nowrap">{sub.custodian ?? "—"}</TableCell>
                          <TableCell className="font-bold">{sub.requestedShares.toLocaleString(numLocale)}</TableCell>
                          <TableCell className="font-black text-primary">{sub.amountPaid.toLocaleString(numLocale)} {t.egp}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">{sub.submittedAt}</TableCell>
                          <TableCell><SubBadge status={sub.status} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground font-bold text-sm">{lang === "ar" ? "لا توجد اشتراكات فردية في مرحلة التغطية." : "No individual covered-stage subscriptions."}</p></CardContent></Card>
          )}
          {/* Broker batches */}
          {coveredApprovedBatches.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest">{lang === "ar" ? "دفعات الوسطاء" : "Broker Batches"}</h3>
              {coveredApprovedBatches.map(b => (
                <Card key={b.id}>
                  <CardHeader className="pb-2 pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <p className="font-black text-base">{b.broker}</p>
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 font-black text-[10px]">{b.status}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="font-mono text-xs">{b.submittedAt}</span>
                        <span>{lang === "ar" ? `${b.clients.length} عميل` : `${b.clients.length} client${b.clients.length !== 1 ? "s" : ""}`}</span>
                        <span className="font-black text-primary">{b.clients.reduce((a, c) => a + c.qty, 0).toLocaleString(numLocale)} {lang === "ar" ? "سهم" : "shares"}</span>
                        <span className="font-black text-emerald-600">{b.clients.reduce((a, c) => a + c.cost, 0).toLocaleString(numLocale)} {t.egp}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="overflow-x-auto rounded-xl border border-border/50">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            {[t.colClientName, t.colUnifiedCode, t.colDate, t.colSubQty, t.colCost, t.colRef, t.colCustodian].map(col => (
                              <TableHead key={col} className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">{col}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {b.clients.map((c, i) => (
                            <TableRow key={i} className="hover:bg-muted/30">
                              <TableCell className="font-bold text-sm">{c.clientName}</TableCell>
                              <TableCell className="font-mono text-sm">{c.unifiedCode}</TableCell>
                              <TableCell className="font-mono text-sm text-muted-foreground">{c.date}</TableCell>
                              <TableCell className="font-mono text-sm font-bold">{c.qty.toLocaleString(numLocale)}</TableCell>
                              <TableCell className="font-mono text-sm font-black text-primary">{c.cost.toLocaleString(numLocale)}</TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">{c.ref || "—"}</TableCell>
                              <TableCell className="text-xs font-bold text-muted-foreground whitespace-nowrap">{c.custodian || "—"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Uncovered MCDR Upload ── */}
      {boTab === "MCDR" && page === "uncovered" && (
        <Card>
          <CardHeader><CardTitle>{t.mcdrUploadTitle}</CardTitle><CardDescription>{lang === "ar" ? "رفع بيانات MCDR لمرحلة غير المغطى" : "Upload MCDR file for the uncovered stage"}</CardDescription></CardHeader>
          <CardContent>
            {uncoveredMcdrRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl py-16 gap-5">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center"><FileSpreadsheet className="w-7 h-7 text-muted-foreground" /></div>
                <div className="text-center"><p className="font-bold">{t.mcdrUploadTitle}</p><p className="text-sm text-muted-foreground mt-1">{t.mcdrUploadDesc}</p></div>
                <input ref={uncoveredMcdrRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = ev => parseUncoveredMCDR(ev.target?.result as string);
                  reader.readAsText(file);
                  e.target.value = "";
                }} />
                <Button onClick={() => uncoveredMcdrRef.current?.click()}><Upload className="w-4 h-4 me-2" />{t.uploadMCDRBtn}</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-green-600 font-bold text-sm"><CheckCircle2 className="w-5 h-5" />{t.mcdrTitle} — {t.mcdrRecords(uncoveredMcdrRows.length)}</div>
                  <Button variant="outline" size="sm" onClick={() => setUncoveredMcdrRows([])}><Upload className="w-3.5 h-3.5 me-1" />{t.uploadMCDRBtn}</Button>
                </div>
                <div className="overflow-x-auto rounded-xl border border-border/50">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        {[t.colName, t.colIPOName, t.colUnified, t.colEligible, t.colSubscribed, t.colSettlementDate, t.colStatus].map(col => (
                          <TableHead key={col} className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">{col}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uncoveredMcdrRows.map((r, i) => (
                        <TableRow key={i} className="hover:bg-muted/30">
                          <TableCell className="font-bold text-sm">{r.clientName}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{r.ipoName}</TableCell>
                          <TableCell className="font-mono text-sm">{r.unifiedCode}</TableCell>
                          <TableCell className="font-bold text-amber-600">{r.eligibleQty.toLocaleString(numLocale)}</TableCell>
                          <TableCell className="font-bold text-primary">{r.subscribedQty.toLocaleString(numLocale)}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{r.settlementDate}</TableCell>
                          <TableCell><Badge variant="outline" className="font-black text-[10px] bg-green-500/10 text-green-600 border-green-500/20">{lang === "ar" ? "مؤهل" : "Eligible"}</Badge></TableCell>
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

      {/* ── Uncovered Reconciliation ── */}
      {boTab === "Reconciliation" && page === "uncovered" && (
        <div className="space-y-3">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div>
                  <p className="font-black text-sm">{t.reconTitle}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{lang === "ar" ? "مقارنة اشتراكات غير المغطى مع بيانات MCDR" : "Compare uncovered subscriptions against uncovered MCDR data"}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {isUncoveredReconciled && (
                    <div className="flex bg-muted p-1 rounded-xl gap-1">
                      {RECON_FILTERS.map(({ key, label }) => (
                        <button key={key} onClick={() => setUncoveredReconFilter(key)} className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${uncoveredReconFilter === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>
                      ))}
                    </div>
                  )}
                  {isUncoveredReconciled && <Button size="sm" variant="outline" onClick={() => { exportReconCSV(filteredUncoveredReconRows, lang, "reconciliation-uncovered.csv"); toast({ title: t.toastExported, description: t.toastExportedDesc }); }} className="shrink-0"><FileSpreadsheet className="w-4 h-4 me-2" />{t.exportReconBtn}</Button>}
                  <Button size="sm" onClick={handleUncoveredReconcile} disabled={uncoveredMcdrRows.length === 0} className="shrink-0">
                    <CheckCheck className="w-4 h-4 me-2" />{t.reconBtn}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              {!isUncoveredReconciled ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                  <CheckCheck className="w-10 h-10 text-muted-foreground/40" />
                  <p className="font-bold text-sm text-muted-foreground">{uncoveredMcdrRows.length === 0 ? t.reconNeedsMCDR : t.reconRunFirst}</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border/50">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        {[t.colInvestor, t.colBranch, t.colEligibleShares, t.colSubscribedShares, t.colRemainingShares, t.colStatus].map((col, i) => (
                          <TableHead key={i} className="font-black text-[10px] uppercase tracking-widest text-muted-foreground whitespace-nowrap">{col}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUncoveredReconRows.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">{t.noRecords}</TableCell></TableRow>
                      ) : filteredUncoveredReconRows.map((row, i) => (
                        <TableRow key={i} className={`hover:bg-muted/30 ${row.subscribedShares === 0 ? "bg-red-500/5" : row.remainingShares > 0 ? "bg-amber-500/5" : ""}`}>
                          <TableCell><p className="font-bold text-sm">{row.name}</p><p className="text-[10px] font-mono text-muted-foreground">{row.unifiedCode}</p></TableCell>
                          <TableCell className="text-sm text-muted-foreground font-bold">{row.branch}</TableCell>
                          <TableCell className="text-sm font-bold text-amber-600">{row.eligibleShares.toLocaleString(numLocale)}</TableCell>
                          <TableCell className="text-sm font-black text-primary">{row.subscribedShares.toLocaleString(numLocale)}</TableCell>
                          <TableCell>{row.remainingShares > 0 ? <span className="font-black text-sm text-red-500">{row.remainingShares.toLocaleString(numLocale)}</span> : <span className="font-bold text-sm text-green-600">0 ✓</span>}</TableCell>
                          <TableCell><Badge variant="outline" className={row.status === t.statusNotSubscribed ? "bg-red-500/10 text-red-600 border-red-500/20 font-black text-[10px]" : row.remainingShares > 0 ? "bg-amber-500/10 text-amber-600 border-amber-500/20 font-black text-[10px]" : "bg-green-500/10 text-green-600 border-green-500/20 font-black text-[10px]"}>{row.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── BROKER SUBSCRIPTIONS TAB ── */}
      {boTab === "Broker" && (() => {
        const stock = ipoStocks.find(s => s.id === brokerIPO);

        // Group all clients by broker code
        const brokerGroups = brokerAllClients.reduce<Record<string, BrokerClient[]>>((acc, c) => {
          const code = c.brokerCode ?? "UNKNOWN";
          if (!acc[code]) acc[code] = [];
          acc[code].push(c);
          return acc;
        }, {});
        const brokerCodes = Object.keys(brokerGroups);

        const parseCSV = (text: string): BrokerClient[] =>
          text.split('\n').filter(l => l.trim()).slice(1).map(line => {
            const p = line.split(',');
            return { clientName: p[0]?.trim() ?? "", ipoName: p[1]?.trim() ?? (stock ? (lang === "ar" ? stock.securityNameAr : stock.securityNameEn) : ""), unifiedCode: p[2]?.trim() ?? "", qty: parseInt(p[3]?.trim() ?? "0", 10) || 0, cost: parseFloat(p[4]?.trim() ?? "0") || 0, date: p[5]?.trim() ?? "", brokerCode: p[6]?.trim() ?? "", custodian: p[7]?.trim() ?? "", ref: p[8]?.trim() ?? "" };
          }).filter(c => c.clientName);

        const handleFileUpload = (file: File) => {
          setBrokerAllFile(file);
          const reader = new FileReader();
          reader.onload = (ev) => {
            const clients = parseCSV(ev.target?.result as string);
            setBrokerAllClients(clients);
            setMultiBrokerFIX({}); setBrokerCashStatus({}); setBrokerMcdrStatus({});
          };
          reader.readAsText(file);
        };

        const generateFixForCode = (code: string) => {
          if (!stock) return;
          const clients = brokerGroups[code] ?? [];
          const symbol = stock.symbol ?? brokerIPO;
          const price = stock.pricePerShare ?? 0;
          const now = new Date();
          const ts = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
          const batchId = `BRK${Date.now().toString().slice(-6)}`;
          const lines = clients.map((c, i) =>
            `8=FIX.4.2|35=D|49=QNB|56=${code}|34=${i+1}|52=${ts}|11=${batchId}-${String(i+1).padStart(3,'0')}|55=${symbol}|54=1|38=${c.qty}|44=${price.toFixed(2)}|40=2|453=1|448=${c.unifiedCode}|447=P|452=1|10=000`
          );
          setMultiBrokerFIX(prev => ({ ...prev, [code]: `=== GROUP IPO SUBSCRIPTION — FIX 4.2 ===\nBroker: ${code} | Symbol: ${symbol} | Records: ${clients.length} | Batch: ${batchId}\n\n${lines.join('\n')}` }));
        };

        const allFIXGenerated = brokerCodes.length > 0 && brokerCodes.every(c => multiBrokerFIX[c]);

        const verifyCash = () => {
          const result: Record<string, "pass" | "fail"> = {};
          brokerAllClients.forEach(c => { result[c.unifiedCode] = (c.ref === "REF-TXT-001") ? "fail" : "pass"; });
          setBrokerCashStatus(result);
        };

        const verifyMcdr = () => {
          const result: Record<string, "pass" | "fail"> = {};
          brokerAllClients.forEach(c => { result[c.unifiedCode] = (c.unifiedCode === "3400127") ? "fail" : "pass"; });
          setBrokerMcdrStatus(result);
        };

        const cashVerified = Object.keys(brokerCashStatus).length > 0;
        const mcdrVerifiedAll = Object.keys(brokerMcdrStatus).length > 0;
        const cashPassCount = Object.values(brokerCashStatus).filter(v => v === "pass").length;
        const cashFailCount = Object.values(brokerCashStatus).filter(v => v === "fail").length;
        const mcdrPassCount = Object.values(brokerMcdrStatus).filter(v => v === "pass").length;
        const mcdrFailCount = Object.values(brokerMcdrStatus).filter(v => v === "fail").length;
        const totalQty = brokerAllClients.reduce((s, c) => s + c.qty, 0);
        const totalCost = brokerAllClients.reduce((s, c) => s + c.cost, 0);

        const resetWizard = () => {
          setBrokerStep(1); setBrokerAllClients([]); setBrokerAllFile(null);
          setMultiBrokerFIX({}); setBrokerCashStatus({}); setBrokerMcdrStatus({});
          setBrokerIPO(""); setBrokerPayMethod("Bank Transfer"); setBrokerTxRef("");
        };

        const submitAll = () => {
          brokerCodes.filter(code => multiBrokerFIX[code]).forEach(code => {
            const clients = brokerGroups[code] ?? [];
            const batch: BrokerBatch = {
              id: `BRK-${Date.now()}-${code}`,
              broker: code, ipoId: brokerIPO,
              ipoName: lang === "ar" ? (stock?.securityNameAr ?? brokerIPO) : (stock?.securityNameEn ?? brokerIPO),
              clients, paymentMethod: brokerPayMethod,
              txRef: brokerTxRef, fixMessage: multiBrokerFIX[code],
              submittedAt: new Date().toLocaleString(lang === "ar" ? "ar-EG" : "en-GB"),
              status: "Pending Review", phase: stock?.phase ?? "covered",
            };
            onSubmitBatch(batch);
          });
          toast({ title: t.toastSentTitle, description: t.brokerFileLoaded(brokerAllClients.length) });
          resetWizard();
        };

        const steps = [t.brokerWizardStep1, t.brokerWizardStep2, t.brokerWizardStep3, t.brokerWizardStep4];

        return (
          <div className="space-y-4">
            {/* ── Step indicator ── */}
            <div className="flex items-start">
              {steps.map((label, i) => {
                const stepNum = (i + 1) as 1 | 2 | 3 | 4;
                const isDone = brokerStep > stepNum;
                const isActive = brokerStep === stepNum;
                return (
                  <div key={i} className="flex items-start flex-1">
                    <div className="flex flex-col items-center gap-1 flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black border-2 transition-all ${isDone ? "bg-primary border-primary text-primary-foreground" : isActive ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground"}`}>
                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : stepNum}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wide text-center leading-tight px-1 ${isActive ? "text-primary" : isDone ? "text-primary/60" : "text-muted-foreground"}`}>{label}</span>
                    </div>
                    {i < steps.length - 1 && <div className={`h-0.5 flex-1 mt-4 mx-1 transition-all ${isDone ? "bg-primary" : "bg-border"}`} />}
                  </div>
                );
              })}
            </div>

            {/* ── Step 1: Upload ── */}
            {brokerStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t.brokerWizardStep1}</CardTitle>
                  <CardDescription className="font-mono text-xs">{t.brokerCsvHint}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t.eventLabel}</p>
                      <select value={brokerIPO} onChange={e => { setBrokerIPO(e.target.value); setMultiBrokerFIX({}); }} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-ring outline-none">
                        <option value="">{t.selectIPO}</option>
                        {ipoStocks.map(s => <option key={s.id} value={s.id}>{lang === "ar" ? s.securityNameAr : s.securityNameEn}</option>)}
                      </select>
                      {brokerIPO && stock && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${stock.phase === "covered" ? "bg-amber-500/10 text-amber-600 border-amber-500/30" : "bg-green-500/10 text-green-600 border-green-500/30"}`}>
                          <Layers className="w-3 h-3" />{stock.phase === "covered" ? t.coveredPhaseBadge : t.uncoveredPhaseBadge}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t.paymentLabel}</p>
                      <select value={brokerPayMethod} onChange={e => setBrokerPayMethod(e.target.value)} className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-ring outline-none">
                        <option value="Bank Transfer">{t.payTransfer}</option>
                        <option value="Debit Note">{t.payDebitNote}</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t.txRefLabel}</p>
                      <Input placeholder={t.txRefPlaceholder} dir="ltr" value={brokerTxRef} onChange={e => setBrokerTxRef(e.target.value)} />
                    </div>
                  </div>
                  {!brokerAllFile ? (
                    <div
                      className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl py-14 gap-4 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f); }}
                      onClick={() => brokerRef.current?.click()}
                    >
                      <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center"><FileSpreadsheet className="w-6 h-6 text-muted-foreground" /></div>
                      <div className="text-center">
                        <p className="font-bold">{t.uploadBrokerBtn}</p>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">{t.brokerCsvHint}</p>
                      </div>
                      <input ref={brokerRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }} />
                      <Button variant="outline" onClick={e => { e.stopPropagation(); brokerRef.current?.click(); }}><Upload className="w-4 h-4 me-2" />{t.uploadBrokerBtn}</Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-3 text-green-700 dark:text-green-400">
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-sm">{brokerAllFile.name}</p>
                          <p className="text-xs">{t.brokerFileLoaded(brokerAllClients.length)} · {t.brokersFound(brokerCodes.length)}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => { setBrokerAllFile(null); setBrokerAllClients([]); setMultiBrokerFIX({}); setBrokerCashStatus({}); setBrokerMcdrStatus({}); }}>
                        <X className="w-3.5 h-3.5 me-1" />{t.uploadBrokerBtn}
                      </Button>
                    </div>
                  )}
                  <div className="flex justify-end">
                    <Button disabled={!brokerIPO || brokerAllClients.length === 0} onClick={() => setBrokerStep(2)}>
                      {t.brokerStepNext} <ChevronRight className="w-4 h-4 ms-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Step 2: Review Requests ── */}
            {brokerStep === 2 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle>{t.brokerWizardStep2}</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { v: t.brokersFound(brokerCodes.length), c: "text-primary border-primary/30" },
                        { v: `${brokerAllClients.length} ${t.totalClients}`, c: "" },
                        { v: `${totalQty.toLocaleString(numLocale)} ${t.shares}`, c: "" },
                        { v: `${totalCost.toLocaleString(numLocale)} ${t.egp}`, c: "text-green-600 border-green-500/30" },
                      ].map(({ v, c }) => <Badge key={v} variant="outline" className={`font-bold text-xs ${c}`}>{v}</Badge>)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {brokerCodes.map(code => {
                    const clients = brokerGroups[code] ?? [];
                    const grpQty = clients.reduce((s, c) => s + c.qty, 0);
                    const grpCost = clients.reduce((s, c) => s + c.cost, 0);
                    return (
                      <div key={code} className="rounded-xl border border-border/50 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-primary" />
                            <span className="font-black text-sm text-primary">{code}</span>
                            <Badge variant="outline" className="text-[10px] font-bold">{clients.length} {t.totalClients}</Badge>
                          </div>
                          <div className="flex gap-4 text-xs font-bold text-muted-foreground">
                            <span>{grpQty.toLocaleString(numLocale)} {t.shares}</span>
                            <span className="text-primary font-black">{grpCost.toLocaleString(numLocale)} {t.egp}</span>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader><TableRow className="bg-muted/20">
                              {["#", t.colClientName, t.colUnifiedCode, t.colDate, t.colSubQty, t.colCost, t.colRef, t.colCustodian].map((h, i) => (
                                <TableHead key={i} className={`font-black text-[10px] uppercase tracking-widest text-muted-foreground ${i >= 4 && i <= 6 ? "text-end" : ""}`}>{h}</TableHead>
                              ))}
                            </TableRow></TableHeader>
                            <TableBody>
                              {clients.map((c, i) => (
                                <TableRow key={i} className="hover:bg-muted/30">
                                  <TableCell className="text-xs text-muted-foreground w-8">{i + 1}</TableCell>
                                  <TableCell className="font-bold text-sm">{c.clientName}</TableCell>
                                  <TableCell className="font-mono text-sm">{c.unifiedCode}</TableCell>
                                  <TableCell className="font-mono text-sm text-muted-foreground">{c.date}</TableCell>
                                  <TableCell className="text-end font-mono text-sm">{c.qty.toLocaleString(numLocale)}</TableCell>
                                  <TableCell className="text-end font-mono text-sm text-primary font-bold">{c.cost.toLocaleString(numLocale)}</TableCell>
                                  <TableCell className="text-end font-mono text-xs text-muted-foreground">{c.ref || "—"}</TableCell>
                                  <TableCell className="text-xs font-bold text-muted-foreground whitespace-nowrap">{c.custodian || "—"}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex justify-between pt-2">
                    <Button variant="outline" onClick={() => setBrokerStep(1)}><ChevronLeft className="w-4 h-4 me-1" />{t.brokerStepBack}</Button>
                    <Button onClick={() => setBrokerStep(3)}>{t.brokerStepNext} <ChevronRight className="w-4 h-4 ms-1" /></Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Step 3: Generate FIX ── */}
            {brokerStep === 3 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{t.brokerWizardStep3}</CardTitle>
                    {!allFIXGenerated && (
                      <Button variant="outline" className="border-primary text-primary hover:bg-primary/10 font-bold" onClick={() => brokerCodes.forEach(generateFixForCode)}>
                        <Zap className="w-4 h-4 me-2" />{t.generateFixAll}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {brokerCodes.map(code => {
                    const clients = brokerGroups[code] ?? [];
                    const fixMsg = multiBrokerFIX[code];
                    return (
                      <div key={code} className={`rounded-xl border transition-all ${fixMsg ? "border-blue-500/30 bg-blue-500/5" : "border-border/50 bg-muted/10"}`}>
                        <div className="flex items-center gap-3 p-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><Building2 className="w-4 h-4 text-primary" /></div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-sm">{code}</p>
                            <p className="text-xs text-muted-foreground">{clients.length} {t.totalClients}</p>
                          </div>
                          {fixMsg
                            ? <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-black text-[10px]">FIX ✓</Badge>
                            : <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/10 font-bold flex-shrink-0" onClick={() => generateFixForCode(code)}>
                                <Zap className="w-3.5 h-3.5 me-1" />{t.fixGenerateBtn}
                              </Button>
                          }
                        </div>
                        {fixMsg && (
                          <div className="px-4 pb-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t.fixMsgTitle}</p>
                              <button onClick={() => { navigator.clipboard.writeText(fixMsg); toast({ title: t.fixCopied }); }} className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-border text-[10px] font-bold hover:text-primary transition-all">
                                <FileSpreadsheet className="w-3 h-3" />{t.fixCopyBtn}
                              </button>
                            </div>
                            <pre className="bg-zinc-900 text-green-400 rounded-lg p-3 font-mono text-[10px] overflow-x-auto max-h-32 leading-relaxed whitespace-pre-wrap">{fixMsg}</pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="flex justify-between pt-2">
                    <Button variant="outline" onClick={() => setBrokerStep(2)}><ChevronLeft className="w-4 h-4 me-1" />{t.brokerStepBack}</Button>
                    <Button disabled={!allFIXGenerated} onClick={() => { setBrokerCashStatus({}); setBrokerMcdrStatus({}); setBrokerStep(4); }}>{t.brokerStepNext} <ChevronRight className="w-4 h-4 ms-1" /></Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Step 4: Verify & Submit ── */}
            {brokerStep === 4 && (
              <Card>
                <CardHeader><CardTitle>{t.brokerWizardStep4}</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  {/* Cash verification */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">{t.cashVerification}</p>
                      {!cashVerified
                        ? <Button size="sm" variant="outline" className="border-primary text-primary font-bold" onClick={verifyCash}><Zap className="w-3.5 h-3.5 me-1" />{t.verifyAll}</Button>
                        : <div className="flex gap-2">
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 font-bold text-[10px]"><CheckCircle2 className="w-3 h-3 me-1" />{cashPassCount} {t.cashPass}</Badge>
                            {cashFailCount > 0 && <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 font-bold text-[10px]"><AlertCircle className="w-3 h-3 me-1" />{cashFailCount} {t.cashFail}</Badge>}
                          </div>
                      }
                    </div>
                    {cashVerified && (
                      <div className="overflow-x-auto rounded-xl border border-border/50">
                        <Table>
                          <TableHeader><TableRow className="bg-muted/30">
                            {[t.colClientName, t.colUnifiedCode, t.brokerLabel, t.colCustodian, t.colSubQty, t.colCost, t.colRef, "Status"].map(h => (
                              <TableHead key={h} className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">{h}</TableHead>
                            ))}
                          </TableRow></TableHeader>
                          <TableBody>
                            {brokerAllClients.map((c, i) => {
                              const st = brokerCashStatus[c.unifiedCode];
                              return (
                                <TableRow key={i} className="hover:bg-muted/30">
                                  <TableCell className="font-bold text-sm">{c.clientName}</TableCell>
                                  <TableCell className="font-mono text-sm">{c.unifiedCode}</TableCell>
                                  <TableCell className="font-bold text-sm text-muted-foreground">{c.brokerCode}</TableCell>
                                  <TableCell className="text-xs font-bold text-muted-foreground whitespace-nowrap">{c.custodian || "—"}</TableCell>
                                  <TableCell className="font-mono text-sm">{c.qty.toLocaleString(numLocale)}</TableCell>
                                  <TableCell className="font-mono text-sm text-primary font-bold">{c.cost.toLocaleString(numLocale)}</TableCell>
                                  <TableCell className="font-mono text-xs text-muted-foreground">{c.ref || "—"}</TableCell>
                                  <TableCell>
                                    {st === "pass" && <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 font-bold text-[10px]"><CheckCircle2 className="w-3 h-3 me-1" />{t.cashPass}</Badge>}
                                    {st === "fail" && <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 font-bold text-[10px]"><AlertCircle className="w-3 h-3 me-1" />{t.cashFail}</Badge>}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>

                  {/* MCDR allocation verification */}
                  <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">{t.mcdrVerification}</p>
                        {!mcdrVerifiedAll
                          ? <Button size="sm" variant="outline" className="border-primary text-primary font-bold" onClick={verifyMcdr}><Zap className="w-3.5 h-3.5 me-1" />{t.verifyAll}</Button>
                          : <div className="flex gap-2">
                              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 font-bold text-[10px]"><CheckCircle2 className="w-3 h-3 me-1" />{mcdrPassCount} {t.mcdrPass}</Badge>
                              {mcdrFailCount > 0 && <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 font-bold text-[10px]"><AlertCircle className="w-3 h-3 me-1" />{mcdrFailCount} {t.mcdrFail}</Badge>}
                            </div>
                        }
                      </div>
                      {mcdrVerifiedAll && (
                        <div className="overflow-x-auto rounded-xl border border-border/50">
                          <Table>
                            <TableHeader><TableRow className="bg-muted/30">
                              {[t.colClientName, t.colUnifiedCode, t.brokerLabel, t.colCustodian, t.colSubQty, t.colCost, t.colRef, "Status"].map(h => (
                                <TableHead key={h} className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">{h}</TableHead>
                              ))}
                            </TableRow></TableHeader>
                            <TableBody>
                              {brokerAllClients.map((c, i) => {
                                const st = brokerMcdrStatus[c.unifiedCode];
                                return (
                                  <TableRow key={i} className="hover:bg-muted/30">
                                    <TableCell className="font-bold text-sm">{c.clientName}</TableCell>
                                    <TableCell className="font-mono text-sm">{c.unifiedCode}</TableCell>
                                    <TableCell className="font-bold text-sm text-muted-foreground">{c.brokerCode}</TableCell>
                                    <TableCell className="text-xs font-bold text-muted-foreground whitespace-nowrap">{c.custodian || "—"}</TableCell>
                                    <TableCell className="font-mono text-sm">{c.qty.toLocaleString(numLocale)}</TableCell>
                                    <TableCell className="font-mono text-sm text-primary font-bold">{c.cost.toLocaleString(numLocale)}</TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground">{c.ref || "—"}</TableCell>
                                    <TableCell>
                                      {st === "pass" && <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 font-bold text-[10px]"><CheckCircle2 className="w-3 h-3 me-1" />{t.mcdrPass}</Badge>}
                                      {st === "fail" && <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 font-bold text-[10px]"><AlertCircle className="w-3 h-3 me-1" />{t.mcdrFail}</Badge>}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                  </div>

                  <div className="flex justify-between pt-2 border-t border-border/50">
                    <Button variant="outline" onClick={() => { setBrokerCashStatus({}); setBrokerMcdrStatus({}); setBrokerStep(3); }}><ChevronLeft className="w-4 h-4 me-1" />{t.brokerStepBack}</Button>
                    <Button disabled={!mcdrVerifiedAll} onClick={submitAll}><Send className="w-4 h-4 me-2" />{t.submitAllBatches}</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );
      })()}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// System Admin
// ─────────────────────────────────────────────────────────────────────────────
function SystemAdmin({ ipoStocks, onStocksChange }: { ipoStocks: IPOStock[]; onStocksChange: (s: IPOStock[]) => void }) {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [adminTab, setAdminTab] = useState<"Users" | "CreateUser" | "Groups" | "AuditLogs">("Users");
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>(INITIAL_USERS);
  const [userGroups] = useState(INITIAL_GROUPS);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const ALL_PERMISSIONS = ["create_subscription", "view_clients", "print_receipt", "kyc_maker", "view_subscriptions", "reconcile", "allocate", "export_data", "approve_subscription", "reject_subscription", "kyc_checker", "view_branch_data", "manage_users", "manage_groups", "view_audit", "full_access"];
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
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="border border-input rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-ring outline-none font-bold">{ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
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
                <CardHeader className="pb-3"><div className="flex justify-between items-start"><div><CardTitle className="text-base">{lang === "ar" ? group.nameAr : group.nameEn}</CardTitle><p className="text-xs text-muted-foreground mt-0.5">{group.members} {t.groupMembers}</p></div><button className="text-primary font-black text-[10px] uppercase hover:underline">{t.editAction}</button></div></CardHeader>
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
                  {INITIAL_AUDIT.map(log => (<TableRow key={log.id} className="hover:bg-muted/30"><TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">{log.timestamp}</TableCell><TableCell><p className="font-bold text-sm">{log.user}</p></TableCell><TableCell><Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 whitespace-nowrap text-[10px]">{log.role}</Badge></TableCell><TableCell className="text-sm font-bold whitespace-nowrap">{log.action}</TableCell><TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">{log.entity}</TableCell><TableCell className="text-xs text-red-500 max-w-[120px] truncate">{log.oldValue}</TableCell><TableCell className="text-xs text-green-600 max-w-[150px] truncate font-bold">{log.newValue}</TableCell><TableCell className="text-xs font-mono text-muted-foreground">{log.ip}</TableCell></TableRow>))}
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
// ─────────────────────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────────────────────
type DrillType = "kyc_all" | "kyc_approved" | "kyc_pending" | "kyc_rejected" | "kyc_draft"
  | "subs_all" | "subs_pending" | "subs_verified" | "subs_shortfall" | "subs_allocated" | "subs_refunded"
  | "mcdr_all" | "users_all" | "aml_high" | "aml_pep" | null;

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, drillable, active, onClick, accent }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string;
  drillable?: boolean; active?: boolean; onClick?: () => void; accent?: string;
}) {
  const base = "relative rounded-2xl border p-5 flex flex-col gap-3 transition-all duration-200";
  const interactive = drillable ? "cursor-pointer hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5" : "";
  const highlighted = active ? "border-primary/60 bg-primary/5 shadow-md" : "bg-card border-border";
  return (
    <div className={`${base} ${interactive} ${highlighted}`} onClick={drillable ? onClick : undefined}>
      <div className="flex items-start justify-between gap-2">
        <div className={`p-2.5 rounded-xl ${accent ?? "bg-primary/10"}`}>
          <Icon className={`w-5 h-5 ${accent ? "text-white" : "text-primary"}`} />
        </div>
        {drillable && (
          <div className={`flex items-center gap-1 text-[10px] font-bold transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>
            {active ? <ChevronUp className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-black text-foreground leading-none">{value}</p>
        <p className="text-xs font-semibold text-muted-foreground mt-1">{label}</p>
        {sub && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function StatusRow({ label, count, total, color, onClick, active }: {
  label: string; count: number; total: number; color: string; onClick?: () => void; active?: boolean;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <button type="button" onClick={onClick}
      className={`w-full text-start p-3 rounded-xl transition-all duration-150 group ${active ? "bg-primary/8 ring-1 ring-primary/30" : "hover:bg-muted/60"}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">{pct}%</span>
          <span className="text-xs font-black text-foreground">{count}</span>
        </div>
      </div>
      <MiniBar value={count} max={total} color={color} />
    </button>
  );
}

function DrillModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-4xl bg-card rounded-2xl border border-border shadow-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-black text-base text-foreground">{title}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="overflow-auto flex-1 p-2">{children}</div>
      </div>
    </div>
  );
}

function Dashboard({ subscriptions, kycRecords, users, loggedInUser, onNavigate, ipoStocks, activeStockId, onStockChange, brokerBatches }: {
  subscriptions: Subscription[];
  kycRecords: KYCRecord[];
  users: SystemUser[];
  loggedInUser: SystemUser;
  onNavigate: (role: UserRole) => void;
  ipoStocks: IPOStock[];
  activeStockId: string;
  onStockChange: (id: string) => void;
  brokerBatches: BrokerBatch[];
}) {
  const { lang, t, isRTL } = useLang();
  const [drillType, setDrillType] = useState<DrillType>(null);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [spinning, setSpinning] = useState(false);
  const activeStock = ipoStocks.find(s => s.id === activeStockId) ?? null;

  const handleRefresh = () => {
    setSpinning(true);
    setLastRefreshed(new Date());
    setTimeout(() => setSpinning(false), 700);
  };

  useEffect(() => {
    const id = setInterval(() => { setLastRefreshed(new Date()); }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const toggle = (type: DrillType) => setDrillType(prev => prev === type ? null : type);

  // ── Subscription stats (filtered by active stock) ──
  const filteredSubs = activeStockId ? subscriptions.filter(s => s.ipoId === activeStockId) : subscriptions;
  const filteredBatches = activeStockId ? brokerBatches.filter(b => b.ipoId === activeStockId) : brokerBatches;

  // Pipeline view — all non-rejected (includes Pending Review for broker batches)
  const approvedBatches = filteredBatches.filter(b => b.status !== "Rejected");
  const brokerClientCount = approvedBatches.reduce((a, b) => a + b.clients.length, 0);

  // Supervisor-approved only — used for financial totals and MCDR coverage
  const svApprovedSubs = filteredSubs.filter(s => ("Approved,Verified,Allocated,Refunded,Pending Payment,Shortfall" as string).includes(s.status));
  const svApprovedBatches = filteredBatches.filter(b => b.status === "Approved");
  const svBrokerCost = svApprovedBatches.reduce((a, b) => a + b.clients.reduce((x, c) => x + c.cost, 0), 0);
  const svBrokerShares = svApprovedBatches.reduce((a, b) => a + b.clients.reduce((x, c) => x + c.qty, 0), 0);
  const svBrokerClients = svApprovedBatches.reduce((a, b) => a + b.clients.length, 0);

  const brokerTotalShares = svBrokerShares;
  const totalSubs = filteredSubs.length + brokerClientCount;
  const subPending = filteredSubs.filter(s => s.status === "Pending Review").length + filteredBatches.filter(b => b.status === "Pending Review").reduce((a, b) => a + b.clients.length, 0);
  const subVerified = filteredSubs.filter(s => s.status === "Verified").length;
  const subShortfall = filteredSubs.filter(s => s.status === "Shortfall").length;
  const subAllocated = filteredSubs.filter(s => s.status === "Allocated").length;
  const subRefunded = filteredSubs.filter(s => s.status === "Refunded").length;

  // Financial totals: supervisor-approved only
  const totalDue = svApprovedSubs.reduce((a, s) => a + s.amountDue, 0) + svBrokerCost;
  const totalPaid = svApprovedSubs.reduce((a, s) => a + s.amountPaid, 0) + svBrokerCost;
  const shortfallAmt = svApprovedSubs.reduce((a, s) => a + Math.max(0, s.amountDue - s.amountPaid), 0);
  const collectionPct = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0;

  // ── KYC stats ──
  const totalKYC = kycRecords.length;
  const kycApproved = kycRecords.filter(r => r.status === "Approved").length;
  const kycPending = kycRecords.filter(r => r.status === "Pending Review").length;
  const kycRejected = kycRecords.filter(r => r.status === "Rejected").length;
  const kycDraft = kycRecords.filter(r => r.status === "Draft").length;

  // ── AML / Risk ──
  const amlHigh = kycRecords.filter(r => r.riskLevel === "High").length;
  const amlMed = kycRecords.filter(r => r.riskLevel === "Medium").length;
  const amlLow = kycRecords.filter(r => r.riskLevel === "Low").length;
  const pepCount = kycRecords.filter(r => r.pepStatus).length;
  const sanctionsOk = kycRecords.filter(r => r.sanctionsCheck).length;

  // ── MCDR Coverage (derived from supervisor-approved transactions) ──
  const totalEligible = activeStock?.eligibleSharesSnapshot ?? 0;
  const totalSubscribedMCDR = svApprovedSubs.reduce((a, s) => a + s.requestedShares, 0) + svBrokerShares;
  const mcdrCoveragePct = totalEligible > 0 ? Math.min(100, Math.round((totalSubscribedMCDR / totalEligible) * 100)) : 0;
  const mcdrIndivClients = svApprovedSubs.length;
  const mcdrTotal = mcdrIndivClients + svBrokerClients;

  // ── Users ──
  const activeUsers = users.filter(u => u.status === "Active").length;

  // ── Drill data ──
  const drillData = useMemo(() => {
    switch (drillType) {
      case "kyc_all": return { kind: "kyc" as const, items: kycRecords };
      case "kyc_approved": return { kind: "kyc" as const, items: kycRecords.filter(r => r.status === "Approved") };
      case "kyc_pending": return { kind: "kyc" as const, items: kycRecords.filter(r => r.status === "Pending Review") };
      case "kyc_rejected": return { kind: "kyc" as const, items: kycRecords.filter(r => r.status === "Rejected") };
      case "kyc_draft": return { kind: "kyc" as const, items: kycRecords.filter(r => r.status === "Draft") };
      case "aml_high": return { kind: "kyc" as const, items: kycRecords.filter(r => r.riskLevel === "High") };
      case "aml_pep": return { kind: "kyc" as const, items: kycRecords.filter(r => r.pepStatus) };
      case "subs_all": return { kind: "subs" as const, items: subscriptions };
      case "subs_pending": return { kind: "subs" as const, items: subscriptions.filter(s => s.status === "Pending Review") };
      case "subs_verified": return { kind: "subs" as const, items: subscriptions.filter(s => s.status === "Verified") };
      case "subs_shortfall": return { kind: "subs" as const, items: subscriptions.filter(s => s.status === "Shortfall") };
      case "subs_allocated": return { kind: "subs" as const, items: subscriptions.filter(s => s.status === "Allocated") };
      case "subs_refunded": return { kind: "subs" as const, items: subscriptions.filter(s => s.status === "Refunded") };
      case "mcdr_all": return { kind: "mcdr" as const, items: INITIAL_MCDR };
      case "users_all": return { kind: "users" as const, items: users };
      default: return null;
    }
  }, [drillType, kycRecords, subscriptions, users]);

  const fmtEGP = (n: number) => n.toLocaleString("en-EG") + " EGP";
  const fmtNum = (n: number) => n.toLocaleString("en-EG");

  const subStatusColor: Record<SubStatus, string> = {
    "Pending Review": "bg-amber-500", "Approved": "bg-emerald-500", "Pending Payment": "bg-blue-500",
    "Verified": "bg-teal-500", "Shortfall": "bg-red-500", "Allocated": "bg-indigo-500", "Refunded": "bg-purple-500",
    "Pending Cash": "bg-red-600", "Pending MCDR Allocation": "bg-purple-600",
    "Rejected": "bg-red-700",
    "Submitted": "bg-blue-500", "RPA Allocating": "bg-amber-600",
    "MCDR Accepted": "bg-emerald-500", "MCDR Rejected": "bg-red-700",
  };
  const subStatusLabel = (s: SubStatus) => {
    const m: Record<SubStatus, string> = {
      "Pending Review": lang === "ar" ? "في انتظار الاعتماد" : "Pending Review",
      "Approved": lang === "ar" ? "معتمد" : "Approved",
      "Pending Payment": lang === "ar" ? "قيد الدفع" : "Pending Payment",
      "Verified": lang === "ar" ? "موثق" : "Verified",
      "Shortfall": lang === "ar" ? "عجز" : "Shortfall",
      "Allocated": lang === "ar" ? "مخصص" : "Allocated",
      "Refunded": lang === "ar" ? "مرتد فائض" : "Refunded",
      "Pending Cash": lang === "ar" ? "نقدية معلقة" : "Pending Cash",
      "Pending MCDR Allocation": lang === "ar" ? "في انتظار تخصيص MCDR" : "Pending MCDR Allocation",
      "Rejected": lang === "ar" ? "مرفوض" : "Rejected",
      "Submitted": lang === "ar" ? "مرسل" : "Submitted",
      "RPA Allocating": lang === "ar" ? "في تخصيص RPA" : "RPA Allocating",
      "MCDR Accepted": lang === "ar" ? "MCDR مقبول" : "MCDR Accepted",
      "MCDR Rejected": lang === "ar" ? "MCDR مرفوض" : "MCDR Rejected",
    };
    return m[s];
  };
  const kycStatusBadgeClass = (s: KYCStatus) => {
    if (s === "Approved") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    if (s === "Pending Review") return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    if (s === "Rejected") return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    return "bg-muted text-muted-foreground";
  };

  const drillTitle = drillType
    ? drillType.startsWith("kyc") || drillType.startsWith("aml")
      ? t.dashDrillKYC
      : drillType.startsWith("subs")
        ? t.dashDrillSubs
        : drillType === "mcdr_all"
          ? t.dashDrillMCDR
          : t.dashDrillUsers
    : "";

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-foreground">{t.dashTitle}</h2>
          <p className="text-sm text-muted-foreground">{t.dashWelcome(loggedInUser.name)} — {t.dashSubtitle}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* IPO Stock filter */}
          {ipoStocks.length > 0 && (
            <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-xl border border-border">
              <BarChart3 className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-xs font-bold text-muted-foreground">{t.filterByStock}:</span>
              <select
                value={activeStockId}
                onChange={e => onStockChange(e.target.value)}
                className="text-xs font-bold bg-transparent border-none outline-none text-foreground cursor-pointer"
              >
                {ipoStocks.map(s => (
                  <option key={s.id} value={s.id}>{lang === "ar" ? s.securityNameAr : s.securityNameEn}</option>
                ))}
              </select>
              {activeStock && (
                <Badge variant="outline" className={`text-[10px] font-black ${activeStock.phase === "covered" ? "bg-amber-500/10 text-amber-600 border-amber-500/30" : "bg-green-500/10 text-green-600 border-green-500/30"}`}>
                  {activeStock.phase === "covered" ? t.coveredPhaseBadge : t.uncoveredPhaseBadge}
                </Badge>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-xl border border-border">
            <CalendarClock className="w-3.5 h-3.5 shrink-0" />
            {lastRefreshed.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            <span className="text-border">|</span>
            <span className="text-[10px] font-bold text-muted-foreground/70">
              {lang === "ar" ? "آخر تحديث:" : "Updated:"}{" "}
              {lastRefreshed.toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-GB", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleRefresh}
              title={lang === "ar" ? "تحديث البيانات" : "Refresh data"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-bold text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 transition-transform duration-700 ${spinning ? "animate-spin" : ""}`} />
              {lang === "ar" ? "تحديث" : "Refresh"}
            </button>
            <span className="text-[10px] text-muted-foreground/60 italic hidden sm:block">
              {lang === "ar" ? "يتجدد تلقائياً كل ٥ دقائق" : "Auto-refreshes every 5 min"}
            </span>
          </div>
        </div>
      </div>

      {/* Row 1 — Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={UserCheck2} label={t.dashTotalKYC} value={totalKYC}
          sub={`${kycApproved} ${lang === "ar" ? "معتمد" : "approved"} · ${kycPending} ${lang === "ar" ? "قيد المراجعة" : "pending"}`}
          drillable active={drillType === "kyc_all"} onClick={() => toggle("kyc_all")} />
        <StatCard icon={FileSpreadsheet} label={t.dashTotalSubs} value={totalSubs}
          sub={`${subPending} ${lang === "ar" ? "قيد الاعتماد" : "pending approval"}`}
          drillable active={drillType === "subs_all"} onClick={() => toggle("subs_all")} />
        <StatCard icon={Layers} label={t.dashMCDRClients} value={mcdrTotal}
          sub={mcdrTotal > 0 ? `${mcdrIndivClients} ${lang === "ar" ? "فردي" : "indiv"} · ${svBrokerClients} ${lang === "ar" ? "وسيط" : "broker"}` : (lang === "ar" ? "لا توجد اشتراكات معتمدة" : "No approved subscriptions")}
          drillable active={drillType === "mcdr_all"} onClick={() => toggle("mcdr_all")} />
        <StatCard icon={Users} label={t.dashActiveUsers} value={activeUsers}
          sub={`${lang === "ar" ? "من إجمالي" : "of"} ${users.length} ${lang === "ar" ? "مستخدم" : "users"}`}
          drillable active={drillType === "users_all"} onClick={() => toggle("users_all")} />
      </div>

      {/* Row 2 — IPO Breakdown + KYC Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* IPO Subscriptions Breakdown */}
        <Card className="border-border">
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm font-black">{t.dashIPOBreakdown}</CardTitle>
              </div>
              <button type="button" onClick={() => { onNavigate("Supervisor"); }} className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1">{t.dashViewAll}<ArrowUpRight className="w-3 h-3" /></button>
            </div>
            <p className="text-[11px] text-muted-foreground">{lang === "ar" ? `${totalSubs} طلب إجمالي` : `${totalSubs} total requests`}</p>
          </CardHeader>
          <CardContent className="px-3 pb-4 space-y-1">
            <StatusRow label={lang === "ar" ? "في انتظار الاعتماد" : "Pending Review"} count={subPending} total={totalSubs} color="bg-amber-500" onClick={() => toggle("subs_pending")} active={drillType === "subs_pending"} />
            <StatusRow label={lang === "ar" ? "موثق" : "Verified"} count={subVerified} total={totalSubs} color="bg-teal-500" onClick={() => toggle("subs_verified")} active={drillType === "subs_verified"} />
            <StatusRow label={lang === "ar" ? "عجز في الدفع" : "Shortfall"} count={subShortfall} total={totalSubs} color="bg-red-500" onClick={() => toggle("subs_shortfall")} active={drillType === "subs_shortfall"} />
            <StatusRow label={lang === "ar" ? "مخصص" : "Allocated"} count={subAllocated} total={totalSubs} color="bg-indigo-500" onClick={() => toggle("subs_allocated")} active={drillType === "subs_allocated"} />
            <StatusRow label={lang === "ar" ? "مرتد فائض" : "Refunded"} count={subRefunded} total={totalSubs} color="bg-purple-500" onClick={() => toggle("subs_refunded")} active={drillType === "subs_refunded"} />
          </CardContent>
        </Card>

        {/* KYC Pipeline */}
        <Card className="border-border">
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm font-black">{t.dashKYCPipeline}</CardTitle>
              </div>
              <button type="button" onClick={() => { onNavigate("FrontOffice"); }} className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1">{t.dashViewAll}<ArrowUpRight className="w-3 h-3" /></button>
            </div>
            <p className="text-[11px] text-muted-foreground">{lang === "ar" ? `${totalKYC} سجل إجمالي` : `${totalKYC} total records`}</p>
          </CardHeader>
          <CardContent className="px-3 pb-4 space-y-1">
            <StatusRow label={lang === "ar" ? "معتمد" : "Approved"} count={kycApproved} total={totalKYC} color="bg-emerald-500" onClick={() => toggle("kyc_approved")} active={drillType === "kyc_approved"} />
            <StatusRow label={lang === "ar" ? "في انتظار الاعتماد" : "Pending Review"} count={kycPending} total={totalKYC} color="bg-amber-500" onClick={() => toggle("kyc_pending")} active={drillType === "kyc_pending"} />
            <StatusRow label={lang === "ar" ? "مرفوض" : "Rejected"} count={kycRejected} total={totalKYC} color="bg-red-500" onClick={() => toggle("kyc_rejected")} active={drillType === "kyc_rejected"} />
            <StatusRow label={lang === "ar" ? "مسودة" : "Draft"} count={kycDraft} total={totalKYC} color="bg-slate-400" onClick={() => toggle("kyc_draft")} active={drillType === "kyc_draft"} />
          </CardContent>
        </Card>
      </div>

      {/* Row 3 — AML + MCDR Coverage + Financial */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* AML & Risk */}
        <Card className="border-border">
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500" />
              <CardTitle className="text-sm font-black">{t.dashAMLInsights}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-3">
            <button type="button" onClick={() => toggle("aml_high")}
              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${drillType === "aml_high" ? "border-red-400 bg-red-50 dark:bg-red-900/20" : "border-border hover:bg-muted/50"}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-xs font-bold">{t.dashHighRisk}</span>
              </div>
              <span className="text-sm font-black text-red-600">{amlHigh}</span>
            </button>
            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-xs font-bold">{t.dashMedRisk}</span>
              </div>
              <span className="text-sm font-black text-amber-600">{amlMed}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold">{t.dashLowRisk}</span>
              </div>
              <span className="text-sm font-black text-emerald-600">{amlLow}</span>
            </div>
            <div className="my-1 border-t border-border" />
            <button type="button" onClick={() => toggle("aml_pep")}
              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${drillType === "aml_pep" ? "border-orange-400 bg-orange-50 dark:bg-orange-900/20" : "border-border hover:bg-muted/50"}`}>
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-xs font-bold">{t.dashPEP}</span>
              </div>
              <span className="text-sm font-black text-orange-600">{pepCount}</span>
            </button>
            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
                <span className="text-xs font-bold">{t.dashSanctions}</span>
              </div>
              <span className="text-sm font-black text-teal-600">{sanctionsOk}</span>
            </div>
          </CardContent>
        </Card>

        {/* MCDR Coverage */}
        <Card className="border-border">
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm font-black">{t.dashMCDRCoverage}</CardTitle>
              </div>
              <button type="button" onClick={() => toggle("mcdr_all")} className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1">{t.dashViewAll}<ArrowUpRight className="w-3 h-3" /></button>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            <div className="text-center py-2">
              <p className={`text-4xl font-black ${totalEligible > 0 ? "text-primary" : "text-muted-foreground"}`}>
                {totalEligible > 0 ? `${mcdrCoveragePct}%` : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{t.dashCoverageRatio}</p>
              <div className="w-full h-3 rounded-full bg-muted mt-3 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-teal-400 rounded-full transition-all duration-700" style={{ width: `${mcdrCoveragePct}%` }} />
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t.dashEligibleShares}</span>
                <span className="font-black">{totalEligible > 0 ? fmtNum(totalEligible) : "—"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t.dashSubscribedShares}</span>
                <span className={`font-black ${totalSubscribedMCDR > 0 ? "text-primary" : "text-muted-foreground"}`}>
                  {totalSubscribedMCDR > 0 ? fmtNum(totalSubscribedMCDR) : "—"}
                </span>
              </div>
              <div className="my-1 border-t border-border" />
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-teal-500" /><span>{lang === "ar" ? "اشتراكات فردية معتمدة" : "Approved Individual"}</span></div>
                <span className="font-black text-teal-600">{mcdrIndivClients}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-500" /><span>{lang === "ar" ? "عملاء وسطاء معتمدون" : "Approved Broker Clients"}</span></div>
                <span className="font-black text-indigo-600">{svBrokerClients}</span>
              </div>
              {totalEligible === 0 && (
                <p className="text-[10px] text-amber-600 text-center pt-1">
                  {lang === "ar" ? "لم يتم رفع ملف MCDR بعد" : "MCDR file not yet uploaded by Back Office"}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card className="border-border">
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-black">{t.dashFinancial}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            <div className="rounded-xl border border-border p-4 space-y-3 bg-muted/20">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t.dashTotalDue}</p>
                <p className="text-xl font-black text-foreground">{fmtEGP(totalDue)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t.dashTotalPaid}</p>
                <p className="text-xl font-black text-primary">{fmtEGP(totalPaid)}</p>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-bold text-muted-foreground">{t.dashCollectionRate}</span>
                <span className="font-black text-foreground">{collectionPct}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-to-r from-teal-500 to-primary rounded-full transition-all duration-700" style={{ width: `${collectionPct}%` }} />
              </div>
            </div>
            {shortfallAmt > 0 && (
              <div className="flex items-center justify-between p-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-xs font-bold text-red-600 dark:text-red-400">{t.dashShortfall}</span>
                </div>
                <span className="text-xs font-black text-red-600 dark:text-red-400">{fmtEGP(shortfallAmt)}</span>
              </div>
            )}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40">
                <span className="text-muted-foreground">{lang === "ar" ? "إجمالي الأسهم المطلوبة" : "Total Requested Shares"}</span>
                <span className="font-black">{fmtNum(filteredSubs.reduce((a, s) => a + s.requestedShares, 0) + brokerTotalShares)}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40">
                <span className="text-muted-foreground">{lang === "ar" ? "إجمالي الأسهم المخصصة" : "Total Allocated Shares"}</span>
                <span className="font-black text-indigo-600">{fmtNum(filteredSubs.reduce((a, s) => a + s.allocatedShares, 0))}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 4 — Recent System Activity */}
      <Card className="border-border">
        <CardHeader className="pb-3 pt-5 px-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-black">{t.dashRecentActivity}</CardTitle>
            </div>
            <button type="button" onClick={() => onNavigate("SystemAdmin")} className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1">{t.dashViewAll}<ArrowUpRight className="w-3 h-3" /></button>
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">{lang === "ar" ? "التوقيت" : "Timestamp"}</TableHead>
                <TableHead className="text-xs">{lang === "ar" ? "المستخدم" : "User"}</TableHead>
                <TableHead className="text-xs">{lang === "ar" ? "الإجراء" : "Action"}</TableHead>
                <TableHead className="text-xs">{lang === "ar" ? "الكيان" : "Entity"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {INITIAL_AUDIT.slice(0, 5).map(log => (
                <TableRow key={log.id} className="hover:bg-muted/40">
                  <TableCell className="text-xs text-muted-foreground font-mono">{log.timestamp}</TableCell>
                  <TableCell className="text-xs font-bold">{log.user}</TableCell>
                  <TableCell className="text-xs">
                    <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0.5">{log.action}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{log.entity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Drill-down modal */}
      {drillType && drillData && (
        <DrillModal title={`${drillTitle} (${drillData.items.length})`} onClose={() => setDrillType(null)}>
          {drillData.kind === "kyc" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t.colKYCID}</TableHead>
                  <TableHead className="text-xs">{lang === "ar" ? "الاسم" : "Name"}</TableHead>
                  <TableHead className="text-xs">{t.colClientType}</TableHead>
                  <TableHead className="text-xs">{lang === "ar" ? "الحالة" : "Status"}</TableHead>
                  <TableHead className="text-xs">{lang === "ar" ? "مستوى المخاطر" : "Risk"}</TableHead>
                  <TableHead className="text-xs">PEP</TableHead>
                  <TableHead className="text-xs">{lang === "ar" ? "تاريخ الإرسال" : "Submitted"}</TableHead>
                  <TableHead className="text-xs">{lang === "ar" ? "الفرع" : "Branch"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(drillData.items as KYCRecord[]).map(r => (
                  <TableRow key={r.id} className="hover:bg-muted/40">
                    <TableCell className="text-xs font-mono font-bold text-primary">{r.id}</TableCell>
                    <TableCell className="text-xs font-bold">{r.clientType === "corporate" ? (lang === "ar" ? r.companyNameAr : r.companyNameEn) : (lang === "ar" ? r.nameAr : r.nameEn)}</TableCell>
                    <TableCell className="text-xs">{r.clientType === "individual" ? t.kycIndividual : t.kycCorporate}</TableCell>
                    <TableCell><span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black ${kycStatusBadgeClass(r.status)}`}>{r.status}</span></TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black ${r.riskLevel === "High" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : r.riskLevel === "Medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"}`}>{r.riskLevel}</span>
                    </TableCell>
                    <TableCell className="text-xs">{r.pepStatus ? <span className="text-orange-600 font-black">✓</span> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.submittedAt}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.branch}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {drillData.kind === "subs" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{lang === "ar" ? "رقم العملية" : "TX ID"}</TableHead>
                  <TableHead className="text-xs">{lang === "ar" ? "المستثمر" : "Investor"}</TableHead>
                  <TableHead className="text-xs">{lang === "ar" ? "الأسهم المطلوبة" : "Shares"}</TableHead>
                  <TableHead className="text-xs">{lang === "ar" ? "المستحق (ج.م)" : "Due (EGP)"}</TableHead>
                  <TableHead className="text-xs">{lang === "ar" ? "المدفوع (ج.م)" : "Paid (EGP)"}</TableHead>
                  <TableHead className="text-xs">{lang === "ar" ? "الحالة" : "Status"}</TableHead>
                  <TableHead className="text-xs">{lang === "ar" ? "الفرع" : "Branch"}</TableHead>
                  <TableHead className="text-xs">{lang === "ar" ? "التاريخ" : "Date"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(drillData.items as Subscription[]).map(s => (
                  <TableRow key={s.id} className="hover:bg-muted/40">
                    <TableCell className="text-xs font-mono font-bold text-primary">{s.id}</TableCell>
                    <TableCell className="text-xs font-bold">{lang === "ar" ? s.nameAr : s.nameEn}</TableCell>
                    <TableCell className="text-xs">{fmtNum(s.requestedShares)}</TableCell>
                    <TableCell className="text-xs">{fmtNum(s.amountDue)}</TableCell>
                    <TableCell className="text-xs">{fmtNum(s.amountPaid)}</TableCell>
                    <TableCell><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${subStatusColor[s.status]} bg-opacity-15 text-foreground`} style={{ backgroundColor: undefined }}>
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${subStatusColor[s.status]}`} />
                      {subStatusLabel(s.status)}
                    </span></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.branch}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.submittedAt}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {drillData.kind === "mcdr" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t.colName}</TableHead>
                  <TableHead className="text-xs">{t.colUnified}</TableHead>
                  <TableHead className="text-xs">{t.colNatId}</TableHead>
                  <TableHead className="text-xs">{t.colEligible}</TableHead>
                  <TableHead className="text-xs">{t.colSubscribed}</TableHead>
                  <TableHead className="text-xs">{t.colBalance}</TableHead>
                  <TableHead className="text-xs">{lang === "ar" ? "الحالة" : "Status"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(drillData.items as typeof INITIAL_MCDR).map(m => (
                  <TableRow key={m.id} className="hover:bg-muted/40">
                    <TableCell className="text-xs font-bold">{lang === "ar" ? m.nameAr : m.nameEn}</TableCell>
                    <TableCell className="text-xs font-mono">{m.unifiedCode}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{m.nationalId}</TableCell>
                    <TableCell className="text-xs">{fmtNum(m.eligibleShares)}</TableCell>
                    <TableCell className="text-xs font-bold text-primary">{fmtNum(m.subscribedShares)}</TableCell>
                    <TableCell className="text-xs">{fmtNum(m.balanceEGP)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black ${m.status === "Full" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                        {m.status === "Full" ? t.mcdrStatusFull : t.mcdrStatusPartial}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {drillData.kind === "users" && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{lang === "ar" ? "الاسم" : "Name"}</TableHead>
                  <TableHead className="text-xs">{lang === "ar" ? "اسم المستخدم" : "Username"}</TableHead>
                  <TableHead className="text-xs">{lang === "ar" ? "الدور" : "Role"}</TableHead>
                  <TableHead className="text-xs">{lang === "ar" ? "الفرع" : "Branch"}</TableHead>
                  <TableHead className="text-xs">{lang === "ar" ? "الحالة" : "Status"}</TableHead>
                  <TableHead className="text-xs">{lang === "ar" ? "آخر دخول" : "Last Login"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(drillData.items as SystemUser[]).map(u => (
                  <TableRow key={u.id} className="hover:bg-muted/40">
                    <TableCell className="text-xs font-bold">{u.name}</TableCell>
                    <TableCell className="text-xs font-mono text-primary">{u.username}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] font-bold">{u.role}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{u.branch}</TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black ${u.status === "Active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>{u.status}</span>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{u.lastLogin}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DrillModal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Basic Data Screens — Brokers & Custodians
// ─────────────────────────────────────────────────────────────────────────────
function BasicDataScreen<T extends { id: string; name: string; code: string; email: string }>({
  title, desc, addBtn, records, onAdd, icon: Icon,
}: {
  title: string; desc: string; addBtn: string;
  records: T[]; onAdd: (r: T) => void; icon: React.ElementType;
}) {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const schema = z.object({
    name: z.string().min(1, t.requiredField),
    code: z.string().min(1, t.requiredField),
    email: z.string().email(t.requiredField),
  });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { name: "", code: "", email: "" } });
  const handleSave = (values: z.infer<typeof schema>) => {
    const newRecord = { id: `${Date.now()}`, ...values } as T;
    onAdd(newRecord);
    toast({ title: t.bdSavedOk, description: values.name });
    form.reset(); setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary p-2.5 rounded-xl"><Icon className="w-5 h-5" /></div>
          <div><h2 className="text-2xl font-black tracking-tight">{title}</h2><p className="text-muted-foreground text-sm">{desc}</p></div>
        </div>
        <Button onClick={() => setShowForm(v => !v)}>
          <PlusCircle className="w-4 h-4 me-2" />{addBtn}
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <CardHeader><CardTitle className="text-base">{addBtn}</CardTitle></CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSave)} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.bdName}</FormLabel>
                    <FormControl><Input placeholder={t.bdName} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="code" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.bdCode}</FormLabel>
                    <FormControl><Input placeholder={t.bdCode} className="font-mono uppercase" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.bdEmail}</FormLabel>
                    <FormControl><Input type="email" placeholder={t.bdEmail} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="md:col-span-3 flex gap-2">
                  <Button type="submit"><CheckCircle2 className="w-4 h-4 me-2" />{lang === "ar" ? "حفظ" : "Save"}</Button>
                  <Button type="button" variant="outline" onClick={() => { setShowForm(false); form.reset(); }}>{lang === "ar" ? "إلغاء" : "Cancel"}</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-4">
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">{t.bdName}</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">{t.bdCode}</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">{t.bdEmail}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-10 text-muted-foreground">{t.noRecords}</TableCell></TableRow>
                ) : records.map(r => (
                  <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-black">{r.code.slice(0, 2)}</div>
                        <p className="font-bold text-sm">{r.name}</p>
                      </div>
                    </TableCell>
                    <TableCell><span className="font-mono font-black text-xs bg-muted px-2 py-1 rounded-lg">{r.code}</span></TableCell>
                    <TableCell><a href={`mailto:${r.email}`} className="text-sm text-primary hover:underline">{r.email}</a></TableCell>
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

function IPOSystem() {
  const { toast } = useToast();
  const [lang, setLang] = useState<Lang>("en");
  const [userRole, setUserRole] = useState<UserRole>("FrontOffice");
  const [activeView, setActiveView] = useState<"dashboard" | UserRole | "IPOStocks" | "Brokers" | "Custodians" | "Reports">("dashboard");
  const [backOfficePage, setBackOfficePage] = useState<"covered" | "uncovered">("covered");
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [showClearingMenu, setShowClearingMenu] = useState(false);
  const [showBasicDataMenu, setShowBasicDataMenu] = useState(false);
  const [brokers, setBrokers] = useState<Broker[]>(INITIAL_BROKERS);
  const [custodians, setCustodians] = useState<Custodian[]>(INITIAL_CUSTODIANS);
  // Lifted BackOffice state — persists across navigation
  const [boMcdrRows, setBoMcdrRows] = useState<MCDRRow[]>([]);
  const [boReconRows, setBoReconRows] = useState<ReconRow[]>([]);
  const [boIsReconciled, setBoIsReconciled] = useState(false);
  const [boFrozenSnapshot, setBoFrozenSnapshot] = useState<FrozenSnapshot | null>(null);
  const [boUncoveredMcdrRows, setBoUncoveredMcdrRows] = useState<MCDRRow[]>([]);
  const [boUncoveredReconRows, setBoUncoveredReconRows] = useState<ReconRow[]>([]);
  const [boIsUncoveredReconciled, setBoIsUncoveredReconciled] = useState(false);
  const [boStoredAllocationRatio, setBoStoredAllocationRatio] = useState<number | null>(null);
  const [boRefundDone, setBoRefundDone] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(INITIAL_SUBSCRIPTIONS);
  const [kycRecords, setKycRecords] = useState<KYCRecord[]>(INITIAL_KYC_RECORDS);
  const [isAuthed, setIsAuthed] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [forgotUsername, setForgotUsername] = useState("");
  const [recoveredPassword, setRecoveredPassword] = useState("");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState(false);
  const [prefs, setPrefs] = useState<UserPrefs>({ darkMode: false, notifications: true, lang: "en" });
  const [showProfile, setShowProfile] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifRead, setNotifRead] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loggedInUser, setLoggedInUser] = useState<SystemUser>(INITIAL_USERS[4]);
  const [ipoStocks, setIpoStocks] = useState<IPOStock[]>(INITIAL_IPO_STOCKS);
  const [activeStockId, setActiveStockId] = useState<string>(INITIAL_IPO_STOCKS[0]?.id ?? "");
  const [brokerBatches, setBrokerBatches] = useState<BrokerBatch[]>([]);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifPanelRef = useRef<HTMLDivElement>(null);
  const activeStock = ipoStocks.find(s => s.id === activeStockId) ?? null;

  const t = T[lang];
  const isRTL = lang === "ar";
  const defaultUsername = "admin";
  const defaultPassword = "12345678";

  useEffect(() => {
    if (prefs.darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [prefs.darkMode]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false);
      if (notifPanelRef.current && !notifPanelRef.current.contains(e.target as Node)) setShowNotifPanel(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // RPA simulation: deterministic timed workflow
  // Submitted (t=0) → RPA Allocating (t=5s) → MCDR Acknowledge (t=15s) → Manual Cash → Verified
  const scheduledRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Step 1: Submitted → RPA Allocating (exactly 5 seconds)
    subscriptions.filter(s => s.status === "Submitted" && !scheduledRef.current.has(`step1-${s.id}`)).forEach(sub => {
      scheduledRef.current.add(`step1-${sub.id}`);
      const timer = setTimeout(() => {
        setSubscriptions(prev => {
          const current = prev.find(s => s.id === sub.id);
          if (!current || current.status !== "Submitted") return prev;
          const client = lang === "ar" ? current.nameAr : current.nameEn;
          pushNotification(
            lang === "ar" ? `RPA تخصيص — ${client}` : `RPA Allocating — ${client}`,
            lang === "ar" ? `بدأت عملية RPA لتخصيص الكود الموحد ${current.unifiedCode}`
              : `RPA allocation process started for Unified Code ${current.unifiedCode}`,
            "subscription"
          );
          return prev.map(s => s.id === sub.id ? { ...s, status: "RPA Allocating" as const } : s);
        });
      }, 5000);
      timers.push(timer);
    });

    // Step 2: RPA Allocating → MCDR Accepted/Rejected (exactly 10 seconds after step 1, total 15s)
    subscriptions.filter(s => s.status === "RPA Allocating" && !scheduledRef.current.has(`step2-${s.id}`)).forEach(sub => {
      scheduledRef.current.add(`step2-${sub.id}`);
      const timer = setTimeout(() => {
        setSubscriptions(prev => {
          const current = prev.find(s => s.id === sub.id);
          if (!current || current.status !== "RPA Allocating") return prev;
          const accepted = current.unifiedCode !== "3400127";
          const newStatus: SubStatus = accepted ? "MCDR Accepted" : "MCDR Rejected";
          const client = lang === "ar" ? current.nameAr : current.nameEn;
          pushNotification(
            lang === "ar" ? `رد MCDR — ${client}` : `MCDR Response — ${client}`,
            lang === "ar" ? `MCDR رد على الكود الموحد ${current.unifiedCode}: ${accepted ? "مقبول" : "مرفوض"} — الحالة: ${newStatus}`
              : `MCDR acknowledged Unified Code ${current.unifiedCode}: ${accepted ? "Accepted" : "Rejected"} — Status: ${newStatus}`,
            "subscription"
          );
          return prev.map(s => s.id === sub.id ? { ...s, status: newStatus } : s);
        });
      }, 10000);
      timers.push(timer);
    });

    return () => timers.forEach(clearTimeout);
  }, [subscriptions, lang]);

  useEffect(() => {
    if (activeView === "Supervisor") setUserRole("Supervisor");
  }, [activeView]);

  const handlePrefsChange = (p: Partial<UserPrefs>) => setPrefs(prev => ({ ...prev, ...p }));
  const handleLogin = () => {
    if (loginForm.username === defaultUsername && loginForm.password === defaultPassword) {
      setIsAuthed(true); setLoginError(false); setActiveView("dashboard");
      setLoggedInUser(INITIAL_USERS.find(u => u.username === loginForm.username) ?? INITIAL_USERS[4]);
    } else setLoginError(true);
  };
  const handleForgotPassword = () => setRecoveredPassword(forgotUsername === defaultUsername ? defaultPassword : "");
  const handleAllocate = (allocationRatio: number, matchedCodes: Set<string>) => {
    // Only allocate uncovered-phase subs matched in reconciliation
    setSubscriptions(prev => prev.map(s => {
      if (s.phase !== "uncovered") return s;
      if (s.status !== "Verified") return s;
      if (!matchedCodes.has(s.unifiedCode)) return s;
      return { ...s, allocatedShares: Math.floor(s.requestedShares * allocationRatio), status: "Allocated" as const };
    }));
  };
  const handleRefund = () => setSubscriptions(prev => prev.map(s => (s.phase !== "uncovered" || s.status !== "Allocated") ? s : { ...s, refundAmount: (s.requestedShares - s.allocatedShares) * PAR_VALUE, status: "Refunded" as const }));
  const handleApprove = (ids: string[]) => {
    setSubscriptions(prev => prev.map(s => ids.includes(s.id) ? { ...s, status: "Verified" as const, allocatedShares: s.phase === "covered" ? s.requestedShares : s.allocatedShares } : s));
    ids.forEach(id => {
      const sub = subscriptions.find(s => s.id === id);
      if (sub) {
        const client = lang === "ar" ? sub.nameAr : sub.nameEn;
        pushNotification(
          lang === "ar" ? `تم اعتماد اكتتاب — ${client}` : `Subscription Approved — ${client}`,
          lang === "ar" ? `تم اعتماد اكتتاب ${client} بنجاح` : `Subscription for ${client} has been approved`,
          "subscription"
        );
      }
    });
  };
  const handleReceiveCash = (id: string, amount: number) => {
    setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, amountPaid: amount, status: "Verified" as const, allocatedShares: s.phase === "covered" ? s.requestedShares : s.allocatedShares } : s));
    const sub = subscriptions.find(s => s.id === id);
    if (sub) {
      const client = lang === "ar" ? sub.nameAr : sub.nameEn;
      pushNotification(
        lang === "ar" ? `تم استلام النقد — ${client}` : `Cash Received — ${client}`,
        lang === "ar" ? `تم تحصيل نقد اكتتاب ${client} بمبلغ ${amount.toLocaleString()} ج.م` : `Cash received for ${client}: ${amount.toLocaleString()} EGP — Status: Verified`,
        "subscription"
      );
    }
  };
  const handleNewSubscription = (s: Subscription) => {
    setSubscriptions(prev => [s, ...prev]);
    const client = lang === "ar" ? s.nameAr : s.nameEn;
    pushNotification(
      lang === "ar" ? `طلب جديد — ${client}` : `New Request — ${client}`,
      lang === "ar" ? `تم استلام طلب اكتتاب جديد من ${client} وإرساله للمراجعة` : `New subscription request received from ${client} and sent for review`,
      "subscription"
    );
  };
  const handleNewKYC = (r: KYCRecord) => setKycRecords(prev => [r, ...prev]);
  const handleApproveKYC = (id: string, action: "Approved" | "Rejected") => setKycRecords(prev => prev.map(r => r.id === id ? { ...r, status: action } : r));

  const pushNotification = (title: string, message: string, type: AppNotification["type"] = "system") => {
    const n: AppNotification = {
      id: `N-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title,
      message,
      timestamp: new Date().toLocaleString(lang === "ar" ? "ar-EG" : "en-EG", { hour12: false }),
      read: false,
      type,
    };
    setNotifications(prev => [n, ...prev].slice(0, 200));
    setNotifRead(false);
    if (prefs.notifications) {
      toast({ title, description: message });
    }
  };

  const markNotificationRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllNotificationsRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  const ROLES: { key: UserRole; label: string; icon: React.ElementType }[] = [
    { key: "FrontOffice", label: t.roleFront, icon: Landmark },
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
              <div className="flex justify-center mb-4"><div className="bg-primary text-primary-foreground p-3 rounded-2xl shadow-lg"><Landmark className="w-7 h-7" /></div></div>
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
            <button onClick={() => setPrefs(p => ({ ...p, darkMode: !p.darkMode }))} className="p-2 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-colors">{prefs.darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</button>
            <button onClick={() => setLang(l => l === "ar" ? "en" : "ar")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"><Globe className="w-4 h-4" />{lang === "ar" ? "EN" : "عر"}</button>
          </div>
        </div>
      </LangContext.Provider>
    );
  }

  return (
    <LangContext.Provider value={{ lang, t, isRTL }}>
      <div dir={isRTL ? "rtl" : "ltr"} className="h-[100dvh] flex flex-col overflow-hidden bg-background font-sans">
        <header className="bg-card border-b px-6 py-3 z-30 flex items-center justify-between shadow-sm gap-3 flex-wrap shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-2 rounded-xl shadow-sm"><Landmark className="w-5 h-5" /></div>
            <div><h1 className="text-base font-black tracking-tight text-foreground leading-tight">{t.appTitle}</h1><p className="text-xs text-muted-foreground hidden sm:block">{t.appSubtitle}</p></div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-muted p-1 rounded-xl flex gap-1 shadow-inner flex-wrap">
              <button onClick={() => setActiveView("dashboard")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeView === "dashboard" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                <LayoutDashboard className="w-3.5 h-3.5" />{t.dashHome}
              </button>
              <div className="w-px bg-border self-stretch mx-0.5" />
              {ROLES.map(({ key, label, icon: Icon }) => key === "FrontOffice" ? (
                <div key={key} className="relative" onMouseEnter={() => setShowBranchMenu(true)} onMouseLeave={() => setShowBranchMenu(false)}>
                  <button onClick={() => { setUserRole("FrontOffice"); setActiveView("FrontOffice"); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeView === "FrontOffice" || activeView === "Supervisor" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                    <Icon className="w-3.5 h-3.5" />{label}
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showBranchMenu ? "rotate-180" : ""}`} />
                  </button>
                  {showBranchMenu && (
                    <div className="absolute top-full start-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden min-w-[10rem] py-1">
                      <button
                        onClick={() => { setUserRole("FrontOffice"); setActiveView("FrontOffice"); setShowBranchMenu(false); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold transition-colors text-start ${activeView === "FrontOffice" ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                        <Landmark className="w-3.5 h-3.5 shrink-0" />
                        {t.foTabSubs}
                      </button>
                      <div className="my-1 h-px bg-border mx-2" />
                      <button
                        onClick={() => { setUserRole("Supervisor"); setActiveView("Supervisor"); setShowBranchMenu(false); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold transition-colors text-start ${activeView === "Supervisor" ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                        <Eye className="w-3.5 h-3.5 shrink-0" />
                        {t.roleSupervisor}
                      </button>
                    </div>
                  )}
                </div>
              ) : key === "BackOffice" ? (
                <div key={key} className="relative" onMouseEnter={() => setShowClearingMenu(true)} onMouseLeave={() => setShowClearingMenu(false)}>
                  <button onClick={() => { setUserRole("BackOffice"); setActiveView("BackOffice"); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeView === "BackOffice" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                    <Icon className="w-3.5 h-3.5" />{label}
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showClearingMenu ? "rotate-180" : ""}`} />
                  </button>
                  {showClearingMenu && (
                    <div className="absolute top-full start-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden min-w-[10rem] py-1">
                      <button
                        onClick={() => { setUserRole("BackOffice"); setActiveView("BackOffice"); setBackOfficePage("covered"); setShowClearingMenu(false); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold transition-colors text-start ${activeView === "BackOffice" && backOfficePage === "covered" ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                        {t.coveredPhaseBadge}
                      </button>
                      <button
                        onClick={() => { if (!ipoStocks.some(s => s.coveredFinalized)) return; setUserRole("BackOffice"); setActiveView("BackOffice"); setBackOfficePage("uncovered"); setShowClearingMenu(false); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold transition-colors text-start ${!ipoStocks.some(s => s.coveredFinalized) ? "opacity-40 cursor-not-allowed" : activeView === "BackOffice" && backOfficePage === "uncovered" ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${ipoStocks.some(s => s.coveredFinalized) ? "bg-green-500" : "bg-muted-foreground"}`} />
                        {t.uncoveredPhaseBadge}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button key={key} onClick={() => { setUserRole(key); setActiveView(key); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeView === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  <Icon className="w-3.5 h-3.5" />{label}
                </button>
              ))}
              <div className="w-px bg-border self-stretch mx-0.5" />
              <button
                onClick={() => setActiveView("Reports")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeView === "Reports" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                <BarChart3 className="w-3.5 h-3.5" />{t.menuReports}
              </button>
              <div className="w-px bg-border self-stretch mx-0.5" />
              <div className="relative" onMouseEnter={() => setShowBasicDataMenu(true)} onMouseLeave={() => setShowBasicDataMenu(false)}>
                <button
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${["IPOStocks","Brokers","Custodians"].includes(activeView) ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  <Database className="w-3.5 h-3.5" />{t.menuBasicData}
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showBasicDataMenu ? "rotate-180" : ""}`} />
                </button>
                {showBasicDataMenu && (
                  <div className="absolute top-full start-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden min-w-[11rem] py-1">
                    <button onClick={() => { setActiveView("IPOStocks"); setShowBasicDataMenu(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold transition-colors text-start ${activeView === "IPOStocks" ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                      <BarChart3 className="w-3.5 h-3.5" />{t.ipoStockTab}
                    </button>
                    <button onClick={() => { setActiveView("Brokers"); setShowBasicDataMenu(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold transition-colors text-start ${activeView === "Brokers" ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                      <Briefcase className="w-3.5 h-3.5" />{t.menuBrokers}
                    </button>
                    <button onClick={() => { setActiveView("Custodians"); setShowBasicDataMenu(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold transition-colors text-start ${activeView === "Custodians" ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                      <Lock className="w-3.5 h-3.5" />{t.menuCustodians}
                    </button>
                  </div>
                )}
              </div>
            </div>
            <button onClick={() => setLang(l => l === "ar" ? "en" : "ar")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"><Globe className="w-4 h-4" />{lang === "ar" ? "EN" : "عر"}</button>
            {(() => {
              const unreadCount = notifications.filter(n => !n.read).length;
              const hasUnread = prefs.notifications && unreadCount > 0;
              return (
                <div className="relative" ref={notifPanelRef}>
                  <button
                    onClick={() => { setShowNotifPanel(v => !v); if (!showNotifPanel) { setNotifRead(true); } }}
                    className="relative p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {prefs.notifications ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                    {hasUnread && (
                      <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center leading-none">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </button>
                  {showNotifPanel && (
                    <div className={`absolute top-full mt-2 ${isRTL ? "left-0" : "right-0"} w-80 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden`}>
                      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-primary" />
                          <p className="font-black text-sm text-foreground">{t.notifPanelTitle}</p>
                          {unreadCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded-full">{unreadCount}</span>
                          )}
                        </div>
                        {notifications.length > 0 && (
                          <button onClick={() => { markAllNotificationsRead(); setNotifRead(true); }} className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors">{t.notifPanelMarkAll}</button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground">
                            <Bell className="w-8 h-8 opacity-20" />
                            <p className="text-sm font-bold">{t.notifPanelEmpty}</p>
                          </div>
                        ) : notifications.map((n) => (
                          <button key={n.id}
                            onClick={() => { markNotificationRead(n.id); setShowNotifPanel(false); if (n.type === "subscription") setActiveView("Supervisor"); }}
                            className={`w-full flex items-start gap-3 px-4 py-3 border-b border-border/50 hover:bg-muted/40 transition-colors text-start last:border-b-0 ${n.read ? "opacity-60" : ""}`}>
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${n.type === "subscription" ? "text-primary bg-primary/10" : n.type === "kyc" ? "text-violet-600 bg-violet-500/10" : n.type === "batch" ? "text-amber-600 bg-amber-500/10" : "text-muted-foreground bg-muted"}`}>
                              {n.type === "subscription" ? <ClipboardList className="w-4 h-4" /> : n.type === "kyc" ? <User className="w-4 h-4" /> : n.type === "batch" ? <Building2 className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-foreground leading-snug">{n.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                              <p className="text-[10px] text-muted-foreground/60 mt-1">{n.timestamp}</p>
                            </div>
                            {!n.read && <span className="shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />}
                          </button>
                        ))}
                      </div>
                      {notifications.length > 0 && (
                        <div className="px-4 py-2.5 border-t border-border bg-muted/20">
                          <p className="text-[10px] font-bold text-muted-foreground text-center">{lang === "ar" ? "انقر على أي إشعار لعرض التفاصيل" : "Click any notification to view details"}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
            <div className="relative" ref={userMenuRef}>
              <button onClick={() => setShowUserMenu(v => !v)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted transition-colors">
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-black">{loggedInUser.name.charAt(0)}</div>
                <div className="hidden sm:block text-start"><p className="text-xs font-black text-foreground leading-tight">{loggedInUser.name}</p><p className="text-[10px] text-muted-foreground">{loggedInUser.role}</p></div>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
              </button>
              {showUserMenu && (
                <div className={`absolute top-full mt-2 ${isRTL ? "left-0" : "right-0"} w-52 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden`}>
                  <div className="px-4 py-3 border-b border-border bg-muted/30"><p className="text-xs text-muted-foreground">{t.welcomeBack}</p><p className="font-black text-sm text-foreground">{loggedInUser.name}</p></div>
                  <div className="p-1.5">
                    <button onClick={() => { setShowProfile(true); setShowUserMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-foreground hover:bg-muted transition-colors"><User className="w-4 h-4 text-muted-foreground" />{t.profile}</button>
                    <button onClick={() => { setShowProfile(true); setShowUserMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-foreground hover:bg-muted transition-colors"><Settings className="w-4 h-4 text-muted-foreground" />{t.settings}</button>
                    <button onClick={() => setPrefs(p => ({ ...p, darkMode: !p.darkMode }))} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-foreground hover:bg-muted transition-colors">
                      {prefs.darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-muted-foreground" />}{t.darkModeLabel}
                      <span className="ms-auto"><Toggle checked={prefs.darkMode} onChange={v => handlePrefsChange({ darkMode: v })} /></span>
                    </button>
                    <div className="my-1 border-t border-border" />
                    <button onClick={() => { setIsAuthed(false); setShowUserMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><LogOut className="w-4 h-4" />{t.logout}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-6">
          {activeView === "dashboard" && (
            <Dashboard
              subscriptions={subscriptions}
              kycRecords={kycRecords}
              users={INITIAL_USERS}
              loggedInUser={loggedInUser}
              onNavigate={(role) => { setUserRole(role); setActiveView(role); }}
              ipoStocks={ipoStocks}
              activeStockId={activeStockId}
              onStockChange={setActiveStockId}
              brokerBatches={brokerBatches}
            />
          )}
          {activeView === "FrontOffice" && <FrontOffice onNewSubscription={handleNewSubscription} kycRecords={kycRecords} onNewKYC={handleNewKYC} onApproveKYC={handleApproveKYC} activeStock={activeStock} ipoStocks={ipoStocks} subscriptions={subscriptions} custodians={custodians} />}
          {activeView === "Supervisor" && <SupervisorChecker subscriptions={subscriptions} onApprove={handleApprove} kycRecords={kycRecords} onApproveKYC={handleApproveKYC} brokerBatches={brokerBatches} onApproveBatch={(id, action) => {
            setBrokerBatches(prev => prev.map(b => b.id === id ? { ...b, status: action } : b));
            if (action === "Approved") {
              const batch = brokerBatches.find(b => b.id === id);
              if (batch && batch.status === "Pending Review") {
                const newSubs: Subscription[] = batch.clients.map((c, i) => {
                  const status: SubStatus = c.ref === "REF-TXT-001" ? "Pending Cash"
                    : c.unifiedCode === "3400127" ? "Pending MCDR Allocation"
                    : "Approved";
                  return {
                    id: `BRK-${batch.id}-${i}`,
                    nameAr: c.clientName, nameEn: c.clientName,
                    nationalId: "—", account: "—",
                    unifiedCode: c.unifiedCode,
                    requestedShares: c.qty,
                    amountDue: c.cost,
                    amountPaid: status === "Pending Cash" ? 0 : c.cost,
                    allocatedShares: 0, refundAmount: 0,
                    status, branch: lang === "ar" ? `وسيط: ${batch.broker}` : `Broker: ${batch.broker}`,
                    submittedAt: batch.submittedAt,
                    ipoId: batch.ipoId, date: c.date,
                    phase: batch.phase,
                    custodian: c.custodian, broker: batch.broker, brokerCode: c.brokerCode,
                  };
                });
                setSubscriptions(prev => [...prev, ...newSubs]);
              }
            }
          }} ipoStocks={ipoStocks} onUpdateStatus={(id, status) => {
            setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
            const sub = subscriptions.find(s => s.id === id);
            if (sub) {
              const client = lang === "ar" ? sub.nameAr : sub.nameEn;
              pushNotification(
                lang === "ar" ? `تحديث حالة — ${client}` : `Status Update — ${client}`,
                lang === "ar" ? `تم تحديث حالة اكتتاب ${client} إلى ${status}` : `Subscription status for ${client} updated to ${status}`,
                "subscription"
              );
            }
          }} onReceiveCash={handleReceiveCash} />}
          {activeView === "BackOffice" && <BackOffice
            subscriptions={subscriptions} onAllocate={handleAllocate} onRefund={handleRefund}
            activeStock={activeStock} ipoStocks={ipoStocks} onStocksChange={setIpoStocks}
            brokerBatches={brokerBatches} page={backOfficePage} onSwitchToUncovered={() => setBackOfficePage("uncovered")}
            mcdrRows={boMcdrRows} setMcdrRows={setBoMcdrRows}
            reconRows={boReconRows} setReconRows={setBoReconRows}
            isReconciled={boIsReconciled} setIsReconciled={setBoIsReconciled}
            frozenSnapshot={boFrozenSnapshot} setFrozenSnapshot={setBoFrozenSnapshot}
            uncoveredMcdrRows={boUncoveredMcdrRows} setUncoveredMcdrRows={setBoUncoveredMcdrRows}
            uncoveredReconRows={boUncoveredReconRows} setUncoveredReconRows={setBoUncoveredReconRows}
            isUncoveredReconciled={boIsUncoveredReconciled} setIsUncoveredReconciled={setBoIsUncoveredReconciled}
            storedAllocationRatio={boStoredAllocationRatio} setStoredAllocationRatio={setBoStoredAllocationRatio}
            refundDone={boRefundDone} setRefundDone={setBoRefundDone}
            onSubmitBatch={(batch) => setBrokerBatches(prev => [...prev, batch])}
          />}
          {activeView === "Communications" && <CustomerComms />}
          {activeView === "SystemAdmin" && <SystemAdmin ipoStocks={ipoStocks} onStocksChange={setIpoStocks} />}
          {activeView === "IPOStocks" && <IPOStockSetup ipoStocks={ipoStocks} onStocksChange={userRole === "SystemAdmin" ? setIpoStocks : undefined} readOnly={userRole !== "SystemAdmin"} />}
          {activeView === "Brokers" && (
            <BasicDataScreen
              title={t.brokersTitle} desc={t.brokersDesc} addBtn={t.addBrokerBtn}
              records={brokers} onAdd={r => setBrokers(prev => [...prev, r])} icon={Briefcase}
            />
          )}
          {activeView === "Custodians" && (
            <BasicDataScreen
              title={t.custodiansTitle} desc={t.custodiansDesc} addBtn={t.addCustodianBtn}
              records={custodians} onAdd={r => setCustodians(prev => [...prev, r])} icon={Lock}
            />
          )}
          {activeView === "Reports" && (
            <Reports subscriptions={subscriptions} ipoStocks={ipoStocks} brokers={brokers} custodians={custodians} />
          )}
        </main>

        {showProfile && <ProfilePanel user={loggedInUser} prefs={prefs} onPrefsChange={handlePrefsChange} onClose={() => setShowProfile(false)} />}
      </div>
    </LangContext.Provider>
  );
}

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
