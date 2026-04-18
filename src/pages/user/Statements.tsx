import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Calendar, Download, FileText, Filter, CalendarIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatAmount, formatAccountType } from "@/lib/utils";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useTranslation } from "@/i18n";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";

interface Account {
  id: string;
  account_type: string;
  account_number: string;
  balance: number;
  hidden?: boolean;
  currency?: string;
}

interface Statement {
  id: string;
  account_id: string;
  statement_period_start: string;
  statement_period_end: string;
  opening_balance: number;
  closing_balance: number;
  total_credits: number;
  total_debits: number;
  created_at: string;
}

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  description: string;
  created_at: string;
  status: string;
}

export const Statements = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { settings } = useWebsiteSettings();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    accountType: "",
    year: new Date().getFullYear().toString(),
    month: "",
  });

  // Date range state for generating statements
  const [dateRange, setDateRange] = useState<{
    startDate: Date | undefined;
    endDate: Date | undefined;
  }>({
    startDate: undefined,
    endDate: undefined,
  });
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState("");

  const parseDateInput = (value: string): Date | undefined => {
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return undefined;
    const [, mm, dd, yyyy] = match;
    const date = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
    if (isNaN(date.getTime())) return undefined;
    if (date > new Date()) return undefined;
    return date;
  };

  const handleStartDateInput = (value: string) => {
    setStartDateInput(value);
    const parsed = parseDateInput(value);
    if (parsed) {
      setDateRange((prev) => ({ ...prev, startDate: parsed }));
    }
  };

  const handleEndDateInput = (value: string) => {
    setEndDateInput(value);
    const parsed = parseDateInput(value);
    if (parsed) {
      setDateRange((prev) => ({ ...prev, endDate: parsed }));
    }
  };

  const handleStartDateSelect = (date: Date | undefined) => {
    setDateRange((prev) => ({ ...prev, startDate: date }));
    setStartDateInput(date ? format(date, "MM/dd/yyyy") : "");
  };

  const handleEndDateSelect = (date: Date | undefined) => {
    setDateRange((prev) => ({ ...prev, endDate: date }));
    setEndDateInput(date ? format(date, "MM/dd/yyyy") : "");
  };

  useEffect(() => {
    if (user) {
      fetchAccountsAndStatements();
    }
  }, [user]);

  const fetchAccountsAndStatements = async () => {
    try {
      setLoading(true);

      const [accountsResult, statementsResult] = await Promise.all([
        supabase.from("accounts").select("*").eq("user_id", user?.id).eq("hidden", false),
        supabase
          .from("account_statements")
          .select("*")
          .eq("user_id", user?.id)
          .order("created_at", { ascending: false }),
      ]);

      if (accountsResult.error) throw accountsResult.error;
      if (statementsResult.error) throw statementsResult.error;

      setAccounts(accountsResult.data || []);
      setStatements((statementsResult.data || []) as any);
    } catch (error) {
      console.error("Error fetching accounts and statements:", error);
      toast({
        title: "Error",
        description: "Failed to load statements.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Collect all years from existing statements for the year filter dropdown
  const availableYears = Array.from(
    new Set(
      statements.flatMap((s) => {
        const startYear = new Date(s.statement_period_start).getFullYear();
        const endYear = new Date(s.statement_period_end).getFullYear();
        const years: number[] = [];
        for (let y = startYear; y <= endYear; y++) years.push(y);
        return years;
      })
    )
  ).sort((a, b) => b - a);

  // Ensure current year is always in the list
  const currentYear = new Date().getFullYear();
  if (!availableYears.includes(currentYear)) availableYears.unshift(currentYear);

  const filteredStatements = statements.filter((statement) => {
    const account = accounts.find((acc) => acc.id === statement.account_id);
    if (filters.accountType && filters.accountType !== "all" && account?.account_type !== filters.accountType)
      return false;

    // Check if statement period overlaps with the selected year
    if (filters.year && filters.year !== "all") {
      const filterYear = parseInt(filters.year);
      const startYear = new Date(statement.statement_period_start).getFullYear();
      const endYear = new Date(statement.statement_period_end).getFullYear();
      if (filterYear < startYear || filterYear > endYear) return false;
    }

    if (
      filters.month &&
      filters.month !== "all"
    ) {
      const statementDate = new Date(statement.statement_period_start);
      if ((statementDate.getMonth() + 1).toString().padStart(2, "0") !== filters.month) return false;
    }

    return true;
  });

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    const today = new Date();
    let startDate = new Date();

    switch (preset) {
      case "week":
        startDate.setDate(today.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(today.getMonth() - 1);
        break;
      case "3months":
        startDate.setMonth(today.getMonth() - 3);
        break;
      case "6months":
        startDate.setMonth(today.getMonth() - 6);
        break;
      case "custom":
        // Don't set dates - user will pick manually
        setDateRange({ startDate: undefined, endDate: undefined });
        return;
      default:
        return;
    }

    setDateRange({ startDate, endDate: today });
  };

  const generateStatementWithRange = async (accountId: string) => {
    if (!dateRange.startDate || !dateRange.endDate) {
      toast({
        title: "Error",
        description: "Please select a date range or preset period.",
        variant: "destructive",
      });
      return;
    }

    setGeneratingFor(accountId);

    try {
      const { data, error } = await (supabase as any).rpc("generate_custom_statement", {
        p_account_id: accountId,
        p_start_date: dateRange.startDate.toISOString().split("T")[0],
        p_end_date: dateRange.endDate.toISOString().split("T")[0],
      });

      if (error) throw error;

      toast({
        title: "Statement Generated",
        description: `Statement for ${format(dateRange.startDate, "PPP")} to ${format(dateRange.endDate, "PPP")} has been generated.`,
      });

      // Reset year filter to "all" so the newly generated statement is visible
      setFilters((prev) => ({ ...prev, year: "all" }));
      fetchAccountsAndStatements();
    } catch (error) {
      console.error("Error generating statement:", error);
      toast({
        title: "Error",
        description: "Failed to generate statement.",
        variant: "destructive",
      });
    } finally {
      setGeneratingFor(null);
    }
  };

  const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const generatePDF = async (statement: Statement, account: Account, transactions: Transaction[]) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const bankName = settings?.bankName || "Wyseforte Bank";
    const bankAddress = settings?.bankAddress || "123 Financial District, New York, NY 10005";
    const bankEmail = settings?.contactEmail || "support@wyseforte.co.uk";

    // --- TOP SECTION ---
    const logoMaxHeight = 14;
    let logoBottomY = 10 + logoMaxHeight;

    // Try to add logo with proper aspect ratio
    const statementLogoUrl = settings?.consoleLogoUrl || settings?.logoUrl;
    if (statementLogoUrl) {
      const logoBase64 = await fetchImageAsBase64(statementLogoUrl);
      if (logoBase64) {
        try {
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject();
            img.src = logoBase64;
          });
          const aspectRatio = img.naturalWidth / img.naturalHeight;
          const logoWidth = logoMaxHeight * aspectRatio;
          doc.addImage(logoBase64, "PNG", 14, 10, logoWidth, logoMaxHeight);
          logoBottomY = 8 + logoMaxHeight;
        } catch (e) {
          console.error("Failed to add logo to PDF:", e);
        }
      }
    }

    // "STATEMENT OF ACCOUNT" top-right
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("STATEMENT OF ACCOUNT", pageWidth - 14, 18, { align: "right" });

    // Divider line
    doc.setDrawColor(180, 180, 180);
    doc.line(14, 34, pageWidth - 14, 34);

    // --- ACCOUNT METADATA ---
    let yPos = 42;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);

    const metaLeft = [
      ["Account Number:", account.account_number],
      ["Statement Date:", new Date().toLocaleDateString()],
      ["Period Covered:", `${new Date(statement.statement_period_start).toLocaleDateString()} - ${new Date(statement.statement_period_end).toLocaleDateString()}`],
    ];
    metaLeft.forEach(([label, value]) => {
      doc.text(label, 14, yPos);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(value, 55, yPos);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      yPos += 6;
    });

    // Page info on right
    doc.text("Page 1 of 1", pageWidth - 14, 42, { align: "right" });

    // --- CUSTOMER INFO (left) + SUMMARY (right) ---
    yPos += 4;
    doc.setDrawColor(180, 180, 180);
    doc.line(14, yPos, pageWidth - 14, yPos);
    yPos += 8;

    // Customer name and address left
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(profile?.full_name || "N/A", 14, yPos);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    if (profile?.address) {
      yPos += 5;
      const addressLines = doc.splitTextToSize(profile.address, 80);
      doc.text(addressLines, 14, yPos);
    }
    if (profile?.email) {
      yPos += 5;
      doc.text(profile.email, 14, yPos);
    }

    // Summary box on right side
    const summaryX = pageWidth / 2 + 10;
    let summaryY = yPos - 10;
    doc.setFontSize(9);

    const summaryItems = [
      ["Opening Balance:", `$${formatAmount(statement.opening_balance)}`],
      ["Total Credit Amount:", `$${formatAmount(statement.total_credits || 0)}`],
      ["Total Debit Amount:", `$${formatAmount(statement.total_debits || 0)}`],
      ["Closing Balance:", `$${formatAmount(statement.closing_balance)}`],
      ["Account Type:", formatAccountType(account.account_type)],
      ["Number of Transactions:", `${transactions.length}`],
    ];
    summaryItems.forEach(([label, value]) => {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text(label, summaryX, summaryY);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(value, summaryX + 45, summaryY);
      summaryY += 6;
    });

    // --- TRANSACTIONS TABLE ---
    yPos = Math.max(yPos, summaryY) + 10;
    doc.setDrawColor(180, 180, 180);
    doc.line(14, yPos, pageWidth - 14, yPos);
    yPos += 4;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Transactions", 14, yPos + 4);
    yPos += 10;

    if (transactions.length > 0) {
      // Calculate running balance
      let runningBalance = statement.opening_balance;
      const tableData = transactions
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map((t) => {
          const credit = t.amount > 0 ? t.amount : 0;
          const debit = t.amount < 0 ? Math.abs(t.amount) : 0;
          runningBalance = runningBalance + credit - debit;
          return [
            new Date(t.created_at).toLocaleDateString(),
            t.description || "Transaction",
            credit > 0 ? `$${formatAmount(credit)}` : "",
            debit > 0 ? `$${formatAmount(debit)}` : "",
            `$${formatAmount(runningBalance)}`,
          ];
        });

      autoTable(doc, {
        head: [["Date", "Description", "Credit", "Debit", "Balance"]],
        body: tableData,
        startY: yPos,
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontSize: 8,
          fontStyle: "bold",
          lineWidth: 0.1,
          lineColor: [180, 180, 180],
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 3,
          lineWidth: 0.1,
          lineColor: [220, 220, 220],
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250],
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 70 },
          2: { cellWidth: 28, halign: "right" },
          3: { cellWidth: 28, halign: "right" },
          4: { cellWidth: 30, halign: "right" },
        },
        margin: { left: 14, right: 14 },
      });
    } else {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("No transactions found for this period.", 14, yPos);
    }

    // --- FOOTER ---
    const footerY = pageHeight - 24;
    doc.setDrawColor(180, 180, 180);
    doc.line(14, footerY, pageWidth - 14, footerY);
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(bankAddress, pageWidth / 2, footerY + 5, { align: "center" });
    doc.text(bankEmail, pageWidth / 2, footerY + 9, { align: "center" });
    doc.text(`${bankName} - This is a computer-generated statement and does not require a signature.`, pageWidth / 2, footerY + 13, { align: "center" });
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, footerY + 17, { align: "center" });

    // Save the PDF
    const fileName = `statement-${account.account_number}-${new Date(statement.statement_period_start).toISOString().slice(0, 7).replace("-", "")}.pdf`;
    doc.save(fileName);
  };

  const handleDownload = async (statement: Statement) => {
    try {
      const account = accounts.find((acc) => acc.id === statement.account_id);
      if (!account) {
        toast({
          title: "Error",
          description: "Account information not found.",
          variant: "destructive",
        });
        return;
      }

      // Fetch transactions for the statement period
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("account_id", statement.account_id)
        .gte("created_at", statement.statement_period_start)
        .lte("created_at", `${statement.statement_period_end}T23:59:59`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Generate and download PDF
      await generatePDF(statement, account, transactions || []);

      toast({
        title: "PDF Downloaded",
        description: "Your statement has been downloaded as a PDF.",
      });
    } catch (error) {
      console.error("Error preparing statement download:", error);
      toast({
        title: "Error",
        description: "Unable to prepare statement for download.",
        variant: "destructive",
      });
    }
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary">{t("dashboard.accountStatements")}</h1>
        <p className="text-muted-foreground">{t("dashboard.accountStatementsDesc")}</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t("dashboard.filterStatements")}
          </CardTitle>
          <CardDescription>{t("dashboard.filterStatementsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="accountType">Account Type</Label>
              <Select
                value={filters.accountType}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, accountType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All account types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All account types</SelectItem>
                  <SelectItem value="checking">Checking</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="premium checking">Premium Checking</SelectItem>
                  <SelectItem value="premium savings">Premium Savings</SelectItem>
                  <SelectItem value="high yield savings">High Yield Savings</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Select value={filters.year} onValueChange={(value) => setFilters((prev) => ({ ...prev, year: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All years</SelectItem>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
              <Select
                value={filters.month}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, month: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All months</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <SelectItem key={month} value={month.toString().padStart(2, "0")}>
                      {new Date(2024, month - 1).toLocaleString("default", { month: "long" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generate Statement Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t("dashboard.generateNewStatement")}
          </CardTitle>
          <CardDescription>
            Select a date range or preset period, then choose an account to generate a statement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Period Selection */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Period</Label>
              <Select value={selectedPreset} onValueChange={handlePresetChange}>
                <SelectTrigger className="w-full md:w-[280px]">
                  <SelectValue placeholder="Choose a period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="3months">Last 3 Months</SelectItem>
                  <SelectItem value="6months">Last 6 Months</SelectItem>
                  <SelectItem value="custom">Custom Date Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Range Pickers */}
            {selectedPreset === "custom" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="MM/DD/YYYY"
                      value={startDateInput}
                      onChange={(e) => handleStartDateInput(e.target.value)}
                      className="flex-1"
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" className="shrink-0">
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <CalendarComponent
                          mode="single"
                          selected={dateRange.startDate}
                          onSelect={handleStartDateSelect}
                          disabled={(date) => date > new Date()}
                          initialFocus
                          className="pointer-events-auto"
                          fromYear={1980}
                          toDate={new Date()}
                          captionLayout="dropdown-buttons"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="MM/DD/YYYY"
                      value={endDateInput}
                      onChange={(e) => handleEndDateInput(e.target.value)}
                      className="flex-1"
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" className="shrink-0">
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <CalendarComponent
                          mode="single"
                          selected={dateRange.endDate}
                          onSelect={handleEndDateSelect}
                          disabled={(date) =>
                            date > new Date() || (dateRange.startDate ? date < dateRange.startDate : false)
                          }
                          initialFocus
                          className="pointer-events-auto"
                          fromYear={1980}
                          toDate={new Date()}
                          captionLayout="dropdown-buttons"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            )}

            {/* Selected Date Range Display */}
            {dateRange.startDate && dateRange.endDate && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Selected Period:</strong> {format(dateRange.startDate, "PPP")} to{" "}
                  {format(dateRange.endDate, "PPP")}
                </p>
              </div>
            )}
          </div>

          {/* Account Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => (
              <div key={account.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium">{formatAccountType(account.account_type)}</p>
                    <p className="text-sm text-muted-foreground">{account.account_number}</p>
                  </div>
                  <Badge variant="outline">${formatAmount(account.balance)}</Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => generateStatementWithRange(account.id)}
                  disabled={!dateRange.startDate || !dateRange.endDate || generatingFor === account.id}
                >
                  {generatingFor === account.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Statement"
                  )}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Available Statements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Available Statements
          </CardTitle>
          <CardDescription>Download or view your account statements</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredStatements.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No statements found for the selected criteria</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredStatements.map((statement) => {
                const account = accounts.find((acc) => acc.id === statement.account_id);
                const startDate = new Date(statement.statement_period_start).toLocaleDateString();
                const endDate = new Date(statement.statement_period_end).toLocaleDateString();

                return (
                  <div
                    key={statement.id}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {formatAccountType(account?.account_type || "")} - {account?.account_number}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {startDate} - {endDate}
                        </p>
                        <div className="flex gap-4 mt-1 text-sm">
                          <span className="text-green-600">+${formatAmount(statement.total_credits || 0)}</span>
                          <span className="text-destructive">-${formatAmount(statement.total_debits || 0)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleDownload(statement)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
};

export default Statements;
