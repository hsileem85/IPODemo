import { useState, useMemo } from "react";
import { useLang } from "../context/lang";
import { IPOStock } from "../data/ipoStocks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Filter, Users, TrendingUp, RefreshCcw, BarChart2, Calendar } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Broker { id: string; name: string; code: string; email: string; }
interface Custodian { id: string; name: string; code: string; email: string; }

interface Subscription {
  id: string; nameAr: string; nameEn: string; nationalId: string;
  unifiedCode: string; requestedShares: number; amountDue: number;
  amountPaid: number; allocatedShares: number; refundAmount: number;
  status: string; branch: string; ipoId: string; date: string;
  phase: "covered" | "uncovered";
  custodian?: string; custodianCode?: string;
  broker?: string; brokerCode?: string;
}

type ReportType = "clients" | "allocation" | "refund";

interface ReportsProps {
  subscriptions: Subscription[];
  ipoStocks: IPOStock[];
  brokers: Broker[];
  custodians: Custodian[];
}

const fmtNum = (n: number) =>
  n.toLocaleString("en-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_COLORS: Record<string, string> = {
  "Allocated": "bg-green-100 text-green-800 border border-green-200",
  "Approved": "bg-blue-100 text-blue-800 border border-blue-200",
  "Verified": "bg-teal-100 text-teal-800 border border-teal-200",
  "Refunded": "bg-purple-100 text-purple-800 border border-purple-200",
  "Pending Review": "bg-amber-100 text-amber-800 border border-amber-200",
  "Pending Cash": "bg-orange-100 text-orange-800 border border-orange-200",
  "Pending MCDR Allocation": "bg-yellow-100 text-yellow-800 border border-yellow-200",
  "Shortfall": "bg-red-100 text-red-800 border border-red-200",
  "Rejected": "bg-gray-100 text-gray-700 border border-gray-200",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={`text-[10px] font-bold whitespace-nowrap ${STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status}
    </Badge>
  );
}

function PhaseBadge({ phase, coveredLabel, uncoveredLabel }: { phase: string; coveredLabel: string; uncoveredLabel: string }) {
  return (
    <Badge className={`text-[10px] font-bold ${phase === "covered" ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-green-100 text-green-800 border border-green-200"}`}>
      {phase === "covered" ? coveredLabel : uncoveredLabel}
    </Badge>
  );
}

export function Reports({ subscriptions, ipoStocks, brokers, custodians }: ReportsProps) {
  const { t, lang } = useLang();
  const [activeReport, setActiveReport] = useState<ReportType>("clients");
  const [filterIpo, setFilterIpo] = useState("all");
  const [filterPhase, setFilterPhase] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterBroker, setFilterBroker] = useState("all");
  const [filterCustodian, setFilterCustodian] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [searchText, setSearchText] = useState("");

  const branches = useMemo(
    () => [...new Set(subscriptions.map(s => s.branch))].filter(Boolean).sort(),
    [subscriptions]
  );
  const allStatuses = useMemo(
    () => [...new Set(subscriptions.map(s => s.status))].filter(Boolean).sort(),
    [subscriptions]
  );

  const filtered = useMemo(() => {
    let r = [...subscriptions];
    if (filterIpo !== "all") r = r.filter(s => s.ipoId === filterIpo);
    if (filterPhase !== "all") r = r.filter(s => s.phase === filterPhase);
    if (filterStatus !== "all") r = r.filter(s => s.status === filterStatus);
    if (filterBranch !== "all") r = r.filter(s => s.branch === filterBranch);
    if (filterBroker !== "all") r = r.filter(s => s.brokerCode === filterBroker || s.broker === filterBroker);
    if (filterCustodian !== "all") r = r.filter(s => s.custodianCode === filterCustodian || s.custodian === filterCustodian);
    if (filterDateFrom) r = r.filter(s => s.date >= filterDateFrom);
    if (filterDateTo) r = r.filter(s => s.date <= filterDateTo);
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      r = r.filter(
        s =>
          s.nameEn.toLowerCase().includes(q) ||
          s.nameAr.includes(searchText.trim()) ||
          s.nationalId.includes(q) ||
          s.unifiedCode.includes(q) ||
          s.id.toLowerCase().includes(q) ||
          (s.broker ?? "").toLowerCase().includes(q) ||
          (s.brokerCode ?? "").toLowerCase().includes(q) ||
          (s.custodian ?? "").toLowerCase().includes(q) ||
          (s.custodianCode ?? "").toLowerCase().includes(q)
      );
    }
    if (activeReport === "allocation") r = r.filter(s => s.status === "Allocated");
    if (activeReport === "refund") r = r.filter(s => s.status === "Refunded");
    return r;
  }, [subscriptions, filterIpo, filterPhase, filterStatus, filterBranch, filterBroker, filterCustodian, filterDateFrom, filterDateTo, searchText, activeReport]);

  const stats = useMemo(() => {
    const totalSubs = filtered.length;
    const totalAmountDue = filtered.reduce((a, s) => a + s.amountDue, 0);
    const totalAmountPaid = filtered.reduce((a, s) => a + s.amountPaid, 0);
    const totalRequestedShares = filtered.reduce((a, s) => a + s.requestedShares, 0);
    const totalAllocatedShares = filtered.reduce((a, s) => a + s.allocatedShares, 0);
    const totalRefundAmount = filtered.reduce((a, s) => a + s.refundAmount, 0);
    const coverageRatio = totalAmountDue > 0 ? (totalAmountPaid / totalAmountDue) * 100 : 0;
    const allocationRatio = totalRequestedShares > 0 ? (totalAllocatedShares / totalRequestedShares) * 100 : 0;
    return {
      totalSubs, totalAmountDue, totalAmountPaid,
      totalRequestedShares, totalAllocatedShares, totalRefundAmount,
      coverageRatio, allocationRatio,
    };
  }, [filtered]);

  const getIpoName = (id: string) => {
    const s = ipoStocks.find(x => x.id === id);
    return s ? (lang === "ar" ? s.securityNameAr : s.securityNameEn) : id;
  };

  const buildRows = () => {
    if (activeReport === "clients") {
      return filtered.map(s => ({
        [t.rptSubId]: s.id,
        [t.rptName]: lang === "ar" ? s.nameAr : s.nameEn,
        [t.rptNID]: s.nationalId,
        [t.rptUnifiedCode]: s.unifiedCode,
        [t.rptBranch]: s.branch,
        [t.rptBroker]: s.broker ?? "—",
        [t.rptBrokerCode]: s.brokerCode ?? "—",
        [t.rptCustodian]: s.custodian ?? "—",
        [t.rptCustodianCode]: s.custodianCode ?? "—",
        [t.rptIPO]: getIpoName(s.ipoId),
        [t.rptPhase]: s.phase === "covered" ? t.coveredPhaseBadge : t.uncoveredPhaseBadge,
        [t.rptRequestedShares]: s.requestedShares,
        [t.rptAmountDue]: s.amountDue,
        [t.rptAmountPaid]: s.amountPaid,
        [t.rptStatus]: s.status,
        [t.rptDate]: s.date,
      }));
    }
    if (activeReport === "allocation") {
      return filtered.map(s => ({
        [t.rptSubId]: s.id,
        [t.rptName]: lang === "ar" ? s.nameAr : s.nameEn,
        [t.rptNID]: s.nationalId,
        [t.rptBroker]: s.broker ?? "—",
        [t.rptBrokerCode]: s.brokerCode ?? "—",
        [t.rptCustodian]: s.custodian ?? "—",
        [t.rptCustodianCode]: s.custodianCode ?? "—",
        [t.rptIPO]: getIpoName(s.ipoId),
        [t.rptPhase]: s.phase === "covered" ? t.coveredPhaseBadge : t.uncoveredPhaseBadge,
        [t.rptRequestedShares]: s.requestedShares,
        [t.rptAllocatedShares]: s.allocatedShares,
        [t.rptAllocPct]: s.requestedShares > 0
          ? +((s.allocatedShares / s.requestedShares) * 100).toFixed(2)
          : 0,
        [t.rptAmountDue]: s.amountDue,
        [t.rptDate]: s.date,
      }));
    }
    return filtered.map(s => ({
      [t.rptSubId]: s.id,
      [t.rptName]: lang === "ar" ? s.nameAr : s.nameEn,
      [t.rptNID]: s.nationalId,
      [t.rptBroker]: s.broker ?? "—",
      [t.rptBrokerCode]: s.brokerCode ?? "—",
      [t.rptCustodian]: s.custodian ?? "—",
      [t.rptCustodianCode]: s.custodianCode ?? "—",
      [t.rptIPO]: getIpoName(s.ipoId),
      [t.rptPhase]: s.phase === "covered" ? t.coveredPhaseBadge : t.uncoveredPhaseBadge,
      [t.rptAmountDue]: s.amountDue,
      [t.rptAmountPaid]: s.amountPaid,
      [t.rptRefundAmount]: s.refundAmount,
      [t.rptDate]: s.date,
    }));
  };

  const reportLabel = () =>
    activeReport === "clients" ? t.rptAllClients
      : activeReport === "allocation" ? t.rptAllocation
      : t.rptRefund;

  const exportExcel = () => {
    const rows = buildRows();
    if (rows.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(rows);
    const cols = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length + 4, 14) }));
    ws["!cols"] = cols;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, reportLabel().slice(0, 31));
    XLSX.writeFile(wb, `IPO_${activeReport}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportPdf = () => {
    const rows = buildRows();
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const body = rows.map(r => Object.values(r).map(v => String(v)));
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(13);
    doc.text(reportLabel(), 14, 14);
    doc.setFontSize(8);
    doc.text(`${t.rptGeneratedAt}: ${new Date().toLocaleString()}`, 14, 21);
    doc.text(`${t.rptResults}: ${filtered.length}`, 14, 27);
    autoTable(doc, {
      head: [headers],
      body,
      startY: 32,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 250, 249] },
    });
    doc.save(`IPO_${activeReport}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const selectCls =
    "w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-ring outline-none";

  const reportTabs = [
    { key: "clients" as ReportType, label: t.rptAllClients, icon: Users },
    { key: "allocation" as ReportType, label: t.rptAllocation, icon: TrendingUp },
    { key: "refund" as ReportType, label: t.rptRefund, icon: RefreshCcw },
  ];

  const summaryCards =
    activeReport === "clients"
      ? [
          { label: t.rptTotalSubs, value: stats.totalSubs.toLocaleString(), sub: t.rptResults, color: "text-primary" },
          { label: t.rptAmountDue, value: fmtNum(stats.totalAmountDue), sub: "EGP", color: "text-foreground" },
          { label: t.rptAmountPaid, value: fmtNum(stats.totalAmountPaid), sub: "EGP", color: "text-green-600 dark:text-green-400" },
          {
            label: t.rptCoverageRatio,
            value: `${stats.coverageRatio.toFixed(1)}%`,
            sub: t.rptPaidVsDue,
            color: stats.coverageRatio >= 80 ? "text-green-600 dark:text-green-400" : "text-amber-600",
          },
        ]
      : activeReport === "allocation"
      ? [
          { label: t.rptTotalSubs, value: stats.totalSubs.toLocaleString(), sub: t.rptResults, color: "text-primary" },
          { label: t.rptRequestedShares, value: stats.totalRequestedShares.toLocaleString(), sub: t.rptShares, color: "text-foreground" },
          { label: t.rptAllocatedShares, value: stats.totalAllocatedShares.toLocaleString(), sub: t.rptShares, color: "text-green-600 dark:text-green-400" },
          {
            label: t.rptAllocRatio,
            value: `${stats.allocationRatio.toFixed(1)}%`,
            sub: t.rptAllocVsReq,
            color: stats.allocationRatio >= 80 ? "text-green-600 dark:text-green-400" : "text-amber-600",
          },
        ]
      : [
          { label: t.rptTotalSubs, value: stats.totalSubs.toLocaleString(), sub: t.rptResults, color: "text-primary" },
          { label: t.rptAmountDue, value: fmtNum(stats.totalAmountDue), sub: "EGP", color: "text-foreground" },
          { label: t.rptAmountPaid, value: fmtNum(stats.totalAmountPaid), sub: "EGP", color: "text-foreground" },
          { label: t.rptTotalRefund, value: fmtNum(stats.totalRefundAmount), sub: "EGP", color: "text-red-600" },
        ];

  const thCls = "text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary p-2.5 rounded-xl">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight">{t.menuReports}</h2>
            <p className="text-muted-foreground text-sm">{t.rptDesc}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportExcel} disabled={filtered.length === 0}>
            <Download className="w-4 h-4 me-2" />{t.rptExportExcel}
          </Button>
          <Button variant="outline" size="sm" onClick={exportPdf} disabled={filtered.length === 0}>
            <FileText className="w-4 h-4 me-2" />{t.rptExportPdf}
          </Button>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit flex-wrap">
        {reportTabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => { setActiveReport(key); setFilterStatus("all"); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeReport === key
                ? "bg-background shadow-sm text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-sm font-black flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />{t.rptFilters}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* Row 1 */}
            <select value={filterIpo} onChange={e => setFilterIpo(e.target.value)} className={selectCls}>
              <option value="all">{t.rptAllIpos}</option>
              {ipoStocks.map(s => (
                <option key={s.id} value={s.id}>
                  {lang === "ar" ? s.securityNameAr : s.securityNameEn}
                </option>
              ))}
            </select>

            <select value={filterPhase} onChange={e => setFilterPhase(e.target.value)} className={selectCls}>
              <option value="all">{t.rptAllPhases}</option>
              <option value="covered">{t.coveredPhaseBadge}</option>
              <option value="uncovered">{t.uncoveredPhaseBadge}</option>
            </select>

            {activeReport === "clients" ? (
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selectCls}>
                <option value="all">{t.rptAllStatuses}</option>
                {allStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <div />
            )}

            <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} className={selectCls}>
              <option value="all">{t.rptAllBranches}</option>
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>

            {/* Row 2 — Broker, Custodian, Date From, Date To */}
            <select value={filterBroker} onChange={e => setFilterBroker(e.target.value)} className={selectCls}>
              <option value="all">{t.rptAllBrokers}</option>
              {brokers.map(b => (
                <option key={b.id} value={b.code}>{b.name} ({b.code})</option>
              ))}
            </select>

            <select value={filterCustodian} onChange={e => setFilterCustodian(e.target.value)} className={selectCls}>
              <option value="all">{t.rptAllCustodians}</option>
              {custodians.map(c => (
                <option key={c.id} value={c.code}>{c.name} ({c.code})</option>
              ))}
            </select>

            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                type="date"
                value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)}
                className={selectCls}
                title={t.rptDateFrom}
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                type="date"
                value={filterDateTo}
                onChange={e => setFilterDateTo(e.target.value)}
                className={selectCls}
                title={t.rptDateTo}
              />
            </div>
          </div>

          <Input
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder={t.rptSearch}
            className="max-w-lg"
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <Card key={i} className="border-border/60">
            <CardContent className="pt-4 pb-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                {card.label}
              </p>
              <p className={`text-2xl font-black ${card.color}`}>{card.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-black flex items-center justify-between">
            <span>{t.rptResults}</span>
            <Badge variant="secondary" className="font-black">{filtered.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {activeReport === "clients" && (
                    <>
                      <TableHead className={thCls}>{t.rptSubId}</TableHead>
                      <TableHead className={thCls}>{t.rptName}</TableHead>
                      <TableHead className={thCls}>{t.rptNID}</TableHead>
                      <TableHead className={thCls}>{t.rptBranch}</TableHead>
                      <TableHead className={thCls}>{t.rptBroker}</TableHead>
                      <TableHead className={thCls}>{t.rptCustodian}</TableHead>
                      <TableHead className={thCls}>{t.rptIPO}</TableHead>
                      <TableHead className={thCls}>{t.rptPhase}</TableHead>
                      <TableHead className={`${thCls} text-end`}>{t.rptRequestedShares}</TableHead>
                      <TableHead className={`${thCls} text-end`}>{t.rptAmountDue}</TableHead>
                      <TableHead className={`${thCls} text-end`}>{t.rptAmountPaid}</TableHead>
                      <TableHead className={thCls}>{t.rptStatus}</TableHead>
                      <TableHead className={thCls}>{t.rptDate}</TableHead>
                    </>
                  )}
                  {activeReport === "allocation" && (
                    <>
                      <TableHead className={thCls}>{t.rptSubId}</TableHead>
                      <TableHead className={thCls}>{t.rptName}</TableHead>
                      <TableHead className={thCls}>{t.rptNID}</TableHead>
                      <TableHead className={thCls}>{t.rptBroker}</TableHead>
                      <TableHead className={thCls}>{t.rptCustodian}</TableHead>
                      <TableHead className={thCls}>{t.rptIPO}</TableHead>
                      <TableHead className={thCls}>{t.rptPhase}</TableHead>
                      <TableHead className={`${thCls} text-end`}>{t.rptRequestedShares}</TableHead>
                      <TableHead className={`${thCls} text-end`}>{t.rptAllocatedShares}</TableHead>
                      <TableHead className={`${thCls} text-end`}>{t.rptAllocPct}</TableHead>
                      <TableHead className={`${thCls} text-end`}>{t.rptAmountDue}</TableHead>
                      <TableHead className={thCls}>{t.rptDate}</TableHead>
                    </>
                  )}
                  {activeReport === "refund" && (
                    <>
                      <TableHead className={thCls}>{t.rptSubId}</TableHead>
                      <TableHead className={thCls}>{t.rptName}</TableHead>
                      <TableHead className={thCls}>{t.rptNID}</TableHead>
                      <TableHead className={thCls}>{t.rptBroker}</TableHead>
                      <TableHead className={thCls}>{t.rptCustodian}</TableHead>
                      <TableHead className={thCls}>{t.rptIPO}</TableHead>
                      <TableHead className={thCls}>{t.rptPhase}</TableHead>
                      <TableHead className={`${thCls} text-end`}>{t.rptAmountDue}</TableHead>
                      <TableHead className={`${thCls} text-end`}>{t.rptAmountPaid}</TableHead>
                      <TableHead className={`${thCls} text-end`}>{t.rptRefundAmount}</TableHead>
                      <TableHead className={thCls}>{t.rptDate}</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-16 text-muted-foreground">
                      <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="font-bold text-sm">{t.rptNoResults}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(s => (
                    <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                      {activeReport === "clients" && (
                        <>
                          <TableCell className="font-mono text-xs font-bold text-primary">{s.id}</TableCell>
                          <TableCell>
                            <p className="font-bold text-sm">{lang === "ar" ? s.nameAr : s.nameEn}</p>
                            <p className="text-[10px] text-muted-foreground">{lang === "ar" ? s.nameEn : s.nameAr}</p>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{s.nationalId}</TableCell>
                          <TableCell className="text-xs">{s.branch}</TableCell>
                          <TableCell className="text-xs">
                            {s.broker
                              ? <><p className="font-bold">{s.broker}</p><p className="text-[10px] font-mono text-muted-foreground">{s.brokerCode}</p></>
                              : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-xs">
                            {s.custodian
                              ? <><p className="font-bold">{s.custodian}</p><p className="text-[10px] font-mono text-muted-foreground">{s.custodianCode}</p></>
                              : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-xs font-bold">{getIpoName(s.ipoId)}</TableCell>
                          <TableCell>
                            <PhaseBadge phase={s.phase} coveredLabel={t.coveredPhaseBadge} uncoveredLabel={t.uncoveredPhaseBadge} />
                          </TableCell>
                          <TableCell className="text-end font-bold text-sm">{s.requestedShares.toLocaleString()}</TableCell>
                          <TableCell className="text-end text-sm">{fmtNum(s.amountDue)}</TableCell>
                          <TableCell className="text-end text-sm font-bold text-green-700 dark:text-green-400">{fmtNum(s.amountPaid)}</TableCell>
                          <TableCell><StatusBadge status={s.status} /></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{s.date}</TableCell>
                        </>
                      )}
                      {activeReport === "allocation" && (
                        <>
                          <TableCell className="font-mono text-xs font-bold text-primary">{s.id}</TableCell>
                          <TableCell>
                            <p className="font-bold text-sm">{lang === "ar" ? s.nameAr : s.nameEn}</p>
                            <p className="text-[10px] text-muted-foreground">{lang === "ar" ? s.nameEn : s.nameAr}</p>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{s.nationalId}</TableCell>
                          <TableCell className="text-xs">
                            {s.broker
                              ? <><p className="font-bold">{s.broker}</p><p className="text-[10px] font-mono text-muted-foreground">{s.brokerCode}</p></>
                              : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-xs">
                            {s.custodian
                              ? <><p className="font-bold">{s.custodian}</p><p className="text-[10px] font-mono text-muted-foreground">{s.custodianCode}</p></>
                              : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-xs font-bold">{getIpoName(s.ipoId)}</TableCell>
                          <TableCell>
                            <PhaseBadge phase={s.phase} coveredLabel={t.coveredPhaseBadge} uncoveredLabel={t.uncoveredPhaseBadge} />
                          </TableCell>
                          <TableCell className="text-end font-bold text-sm">{s.requestedShares.toLocaleString()}</TableCell>
                          <TableCell className="text-end font-bold text-sm text-green-700 dark:text-green-400">{s.allocatedShares.toLocaleString()}</TableCell>
                          <TableCell className="text-end text-sm">
                            <span className={`font-black ${s.requestedShares > 0 && s.allocatedShares / s.requestedShares >= 0.8 ? "text-green-600 dark:text-green-400" : "text-amber-600"}`}>
                              {s.requestedShares > 0
                                ? ((s.allocatedShares / s.requestedShares) * 100).toFixed(1)
                                : "0.0"}%
                            </span>
                          </TableCell>
                          <TableCell className="text-end text-sm">{fmtNum(s.amountDue)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{s.date}</TableCell>
                        </>
                      )}
                      {activeReport === "refund" && (
                        <>
                          <TableCell className="font-mono text-xs font-bold text-primary">{s.id}</TableCell>
                          <TableCell>
                            <p className="font-bold text-sm">{lang === "ar" ? s.nameAr : s.nameEn}</p>
                            <p className="text-[10px] text-muted-foreground">{lang === "ar" ? s.nameEn : s.nameAr}</p>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{s.nationalId}</TableCell>
                          <TableCell className="text-xs">
                            {s.broker
                              ? <><p className="font-bold">{s.broker}</p><p className="text-[10px] font-mono text-muted-foreground">{s.brokerCode}</p></>
                              : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-xs">
                            {s.custodian
                              ? <><p className="font-bold">{s.custodian}</p><p className="text-[10px] font-mono text-muted-foreground">{s.custodianCode}</p></>
                              : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-xs font-bold">{getIpoName(s.ipoId)}</TableCell>
                          <TableCell>
                            <PhaseBadge phase={s.phase} coveredLabel={t.coveredPhaseBadge} uncoveredLabel={t.uncoveredPhaseBadge} />
                          </TableCell>
                          <TableCell className="text-end text-sm">{fmtNum(s.amountDue)}</TableCell>
                          <TableCell className="text-end text-sm font-bold text-green-700 dark:text-green-400">{fmtNum(s.amountPaid)}</TableCell>
                          <TableCell className="text-end text-sm font-black text-red-600">{fmtNum(s.refundAmount)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{s.date}</TableCell>
                        </>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
