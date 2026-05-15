import React, { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Landmark, FileSpreadsheet, Send, ArrowLeftRight } from "lucide-react";

// Types
interface Order {
  id: string;
  account: string;
  unifiedCode: string;
  requestedShares: number;
  totalPaid: number;
  status: "Pending" | "Allocated" | "Refunded";
  allocatedShares: number;
  refundAmount: number;
}

const queryClient = new QueryClient();

const formSchema = z.object({
  account: z.string().min(1, "رقم الحساب مطلوب"),
  unifiedCode: z.string().min(1, "الكود الموحد مطلوب"),
  requestedShares: z.coerce.number().min(1, "يجب إدخال عدد أسهم صحيح"),
});

function Home() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      account: "",
      unifiedCode: "",
      requestedShares: 0,
    },
  });

  const requestedSharesWatch = form.watch("requestedShares");
  const totalAmountToFreeze = (requestedSharesWatch * 10) + (requestedSharesWatch * 0.5);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const newOrder: Order = {
      id: "QNB-IPO-" + Math.floor(1000 + Math.random() * 9000),
      account: values.account,
      unifiedCode: values.unifiedCode,
      requestedShares: values.requestedShares,
      totalPaid: (values.requestedShares * 10) + (values.requestedShares * 0.5),
      status: "Pending",
      allocatedShares: 0,
      refundAmount: 0,
    };

    setOrders((prev) => [newOrder, ...prev]);
    toast({
      title: "تم التنفيذ",
      description: "تم تجميد المبلغ بنجاح وإصدار إيصال الاكتتاب للعميل!",
    });
    form.reset();
  };

  const handleMcdrAllocation = () => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.status !== "Pending") return order;
        return {
          ...order,
          allocatedShares: Math.floor(order.requestedShares * 0.4),
          status: "Allocated",
        };
      })
    );
    toast({
      title: "استلام ملف MCDR",
      description: "تم تخصيص الأسهم بنسبة 40% بنجاح.",
    });
  };

  const handleRefund = () => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.status !== "Allocated") return order;
        return {
          ...order,
          refundAmount: (order.requestedShares - order.allocatedShares) * 10,
          status: "Refunded",
        };
      })
    );
    toast({
      title: "رد الفائض",
      description: "تم تنفيذ رد الفائض لحسابات العملاء بنجاح.",
    });
  };

  const getStatusBadge = (status: Order["status"]) => {
    switch (status) {
      case "Pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">قيد الانتظار</Badge>;
      case "Allocated":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">تم التخصيص</Badge>;
      case "Refunded":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">تم رد الفائض</Badge>;
    }
  };

  return (
    <div dir="rtl" className="min-h-[100dvh] bg-background font-sans">
      <header className="bg-card border-b px-6 py-4 sticky top-0 z-10 flex items-center gap-3 shadow-sm">
        <div className="bg-primary text-primary-foreground p-2 rounded-md">
          <Landmark className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">QNB نظام إدارة الاكتتابات</h1>
          <p className="text-xs text-muted-foreground">شركة التكنولوجيا المتقدمة - اكتتاب زيادة رأس مال</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <Tabs defaultValue="branch" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
            <TabsTrigger value="branch">شاشة الفرع</TabsTrigger>
            <TabsTrigger value="central">الإدارة المركزية والمقاصة</TabsTrigger>
          </TabsList>

          <TabsContent value="branch" className="space-y-6">
            <div className="grid md:grid-cols-[1fr_300px] gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>تسجيل اكتتاب جديد</CardTitle>
                  <CardDescription>إدخال بيانات العميل وتجميد مبلغ الاكتتاب</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="account"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>رقم الحساب</FormLabel>
                              <FormControl>
                                <Input placeholder="مثال: 100234567" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="unifiedCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>الكود الموحد</FormLabel>
                              <FormControl>
                                <Input placeholder="مثال: 1009887" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="requestedShares"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>عدد الأسهم المطلوبة</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button type="submit" className="w-full mt-4" size="lg">
                        <Send className="w-4 h-4 ml-2" />
                        تنفيذ الاكتتاب وتجميد المبلغ
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              <Card className="bg-muted/50 border-dashed">
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">ملخص العملية</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">سعر السهم</span>
                    <span className="font-medium">10 ج.م</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">مصاريف الإصدار</span>
                    <span className="font-medium">0.5 ج.م</span>
                  </div>
                  <div className="pt-4 border-t border-border flex justify-between items-center">
                    <span className="font-medium">إجمالي التجميد</span>
                    <span className="text-xl font-bold text-primary">
                      {totalAmountToFreeze.toLocaleString("ar-EG")} ج.م
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>عمليات الجلسة الحالية</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">رقم العملية</TableHead>
                      <TableHead className="text-right">الحساب</TableHead>
                      <TableHead className="text-right">الأسهم المطلوبة</TableHead>
                      <TableHead className="text-right">المبلغ المجمد</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          لا توجد عمليات مسجلة
                        </TableCell>
                      </TableRow>
                    ) : (
                      orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium text-muted-foreground">{order.id}</TableCell>
                          <TableCell>{order.account}</TableCell>
                          <TableCell>{order.requestedShares.toLocaleString("ar-EG")}</TableCell>
                          <TableCell>{order.totalPaid.toLocaleString("ar-EG")} ج.م</TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="central" className="space-y-6">
            <div className="flex items-center gap-4">
              <Button onClick={handleMcdrAllocation} variant="secondary">
                <FileSpreadsheet className="w-4 h-4 ml-2" />
                1. استلام ملف التخصيص من MCDR
              </Button>
              <Button onClick={handleRefund} variant="outline" className="border-primary text-primary hover:bg-primary/5">
                <ArrowLeftRight className="w-4 h-4 ml-2" />
                2. تنفيذ رد الفائض للعملاء
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>سجل العمليات المركزي</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">رقم العملية</TableHead>
                      <TableHead className="text-right">الحساب</TableHead>
                      <TableHead className="text-right">الأسهم المطلوبة</TableHead>
                      <TableHead className="text-right">المدفوع</TableHead>
                      <TableHead className="text-right">المخصص</TableHead>
                      <TableHead className="text-right">رد الفائض</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          لا توجد عمليات
                        </TableCell>
                      </TableRow>
                    ) : (
                      orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium text-muted-foreground">{order.id}</TableCell>
                          <TableCell>{order.account}</TableCell>
                          <TableCell>{order.requestedShares.toLocaleString("ar-EG")}</TableCell>
                          <TableCell>{order.totalPaid.toLocaleString("ar-EG")} ج.م</TableCell>
                          <TableCell>{order.allocatedShares > 0 ? order.allocatedShares.toLocaleString("ar-EG") : "-"}</TableCell>
                          <TableCell>{order.refundAmount > 0 ? `${order.refundAmount.toLocaleString("ar-EG")} ج.م` : "-"}</TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Home />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
