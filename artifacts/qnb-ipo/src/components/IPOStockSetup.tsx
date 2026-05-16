import { useState } from "react";
import { PlusCircle, CheckSquare, CheckCircle2, BarChart3, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "../context/lang";
import { type IPOStock } from "../data/ipoStocks";

interface IPOStockSetupProps {
  ipoStocks: IPOStock[];
  onStocksChange?: (stocks: IPOStock[]) => void;
  readOnly?: boolean;
}

export function IPOStockSetup({ ipoStocks, onStocksChange, readOnly = false }: IPOStockSetupProps) {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [showAddStock, setShowAddStock] = useState(false);
  const [newStock, setNewStock] = useState<Omit<IPOStock, "id" | "phase" | "coveredFinalized">>({
    securityNameAr: "", securityNameEn: "", code: "", symbol: "", isin: "",
    pricePerShare: 0,
    coveredStart: "", coveredEnd: "", uncoveredStart: "", uncoveredEnd: "",
  });

  const handleSave = () => {
    if (!newStock.securityNameEn || !newStock.isin) return;
    const stock: IPOStock = {
      ...newStock,
      id: "IPO-" + Math.floor(100 + Math.random() * 900),
      phase: "covered",
      coveredFinalized: false,
    };
    onStocksChange?.([...ipoStocks, stock]);
    toast({
      title: lang === "ar" ? "تمت الإضافة" : "Stock added",
      description: lang === "ar" ? newStock.securityNameAr : newStock.securityNameEn,
    });
    setShowAddStock(false);
    setNewStock({ securityNameAr: "", securityNameEn: "", code: "", symbol: "", isin: "", pricePerShare: 0, coveredStart: "", coveredEnd: "", uncoveredStart: "", uncoveredEnd: "" });
  };

  const handleFinalize = (stock: IPOStock) => {
    onStocksChange?.(ipoStocks.map(s =>
      s.id === stock.id ? { ...s, phase: "uncovered" as const, coveredFinalized: true } : s
    ));
    toast({
      title: t.coveredFinalizedLabel,
      description: lang === "ar" ? stock.securityNameAr : stock.securityNameEn,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-black">{t.ipoStockTab}</h3>
          {readOnly && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Info className="w-3.5 h-3.5" />
              {lang === "ar" ? "عرض فقط — التعديل متاح لمدير النظام" : "View only — modifications available to System Admin"}
            </p>
          )}
        </div>
        {!readOnly && (
          <Button size="sm" onClick={() => setShowAddStock(v => !v)}>
            <PlusCircle className="w-4 h-4 me-2" />{t.addStockBtn}
          </Button>
        )}
      </div>

      {showAddStock && !readOnly && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-base">{t.ipoStockTitle}</CardTitle>
            <CardDescription>{t.ipoStockDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{t.secNameArLabel}</label>
                <Input value={newStock.securityNameAr} onChange={e => setNewStock(p => ({ ...p, securityNameAr: e.target.value }))} placeholder="بنك أبوظبي الإسلامي" dir="rtl" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{t.secNameEnLabel}</label>
                <Input value={newStock.securityNameEn} onChange={e => setNewStock(p => ({ ...p, securityNameEn: e.target.value }))} placeholder="ADIB Egypt" dir="ltr" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{t.stockCodeLabel}</label>
                <Input value={newStock.code} onChange={e => setNewStock(p => ({ ...p, code: e.target.value }))} placeholder="ADIB" dir="ltr" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{t.stockSymbolLabel}</label>
                <Input value={newStock.symbol} onChange={e => setNewStock(p => ({ ...p, symbol: e.target.value }))} placeholder="ADIB" dir="ltr" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{t.isinLabel}</label>
                <Input value={newStock.isin} onChange={e => setNewStock(p => ({ ...p, isin: e.target.value }))} placeholder="EGS60121C014" dir="ltr" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{t.pricePerShareLabel}</label>
                <Input type="number" min="0" step="0.01" value={newStock.pricePerShare || ""} onChange={e => setNewStock(p => ({ ...p, pricePerShare: parseFloat(e.target.value) || 0 }))} placeholder="20.00" dir="ltr" />
              </div>
            </div>
            <div className="border-t border-border pt-4">
              <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3">{t.coveredPhaseLabel}</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{t.coveredStartLabel}</label>
                  <Input type="date" value={newStock.coveredStart} onChange={e => setNewStock(p => ({ ...p, coveredStart: e.target.value }))} dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{t.coveredEndLabel}</label>
                  <Input type="date" value={newStock.coveredEnd} onChange={e => setNewStock(p => ({ ...p, coveredEnd: e.target.value }))} dir="ltr" />
                </div>
              </div>
            </div>
            <div className="border-t border-border pt-4">
              <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3">{t.uncoveredPhaseLabel}</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{t.uncoveredStartLabel}</label>
                  <Input type="date" value={newStock.uncoveredStart} onChange={e => setNewStock(p => ({ ...p, uncoveredStart: e.target.value }))} dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{t.uncoveredEndLabel}</label>
                  <Input type="date" value={newStock.uncoveredEnd} onChange={e => setNewStock(p => ({ ...p, uncoveredEnd: e.target.value }))} dir="ltr" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave}><CheckSquare className="w-4 h-4 me-2" />{t.saveStockBtn}</Button>
              <Button variant="outline" onClick={() => setShowAddStock(false)}>{t.cancel}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ipoStocks.map(stock => (
          <Card key={stock.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <p className="font-black text-base leading-snug">{lang === "ar" ? stock.securityNameAr : stock.securityNameEn}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{stock.isin}</p>
                </div>
                <Badge variant="outline" className={`shrink-0 ${stock.phase === "covered" ? "bg-amber-500/10 text-amber-600 border-amber-500/30 font-black" : "bg-green-500/10 text-green-600 border-green-500/30 font-black"}`}>
                  <BarChart3 className="w-3 h-3 me-1" />
                  {stock.phase === "covered" ? t.coveredPhaseBadge : t.uncoveredPhaseBadge}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div><p className="text-muted-foreground">{t.stockCodeLabel}</p><p className="font-mono font-bold">{stock.code}</p></div>
                <div><p className="text-muted-foreground">{t.stockSymbolLabel}</p><p className="font-mono font-bold">{stock.symbol}</p></div>
                <div><p className="text-muted-foreground">{t.pricePerShareLabel}</p><p className="font-mono font-bold text-primary">{stock.pricePerShare?.toFixed(2) ?? "—"} {lang === "ar" ? "ج.م" : "EGP"}</p></div>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-bold">{t.coveredPhaseLabel}</span>
                  <span className="font-mono">{stock.coveredStart} → {stock.coveredEnd}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-bold">{t.uncoveredPhaseLabel}</span>
                  <span className="font-mono">{stock.uncoveredStart} → {stock.uncoveredEnd}</span>
                </div>
              </div>
              {!readOnly && stock.phase === "covered" && !stock.coveredFinalized && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 font-bold"
                  onClick={() => handleFinalize(stock)}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 me-1.5" />{t.finalizeCoveredBtn}
                </Button>
              )}
              {stock.coveredFinalized && (
                <div className="flex items-center gap-2 text-xs text-green-600 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />{t.coveredFinalizedLabel}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
