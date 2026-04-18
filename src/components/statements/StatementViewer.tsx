import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FileText, Download, CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { capitalizeAccountType } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";

interface Account {
  id: string;
  account_type: string;
  account_number: string;
  balance: number;
}

interface Statement {
  id: string;
  account_id: string;
  statement_period_start: string;
  statement_period_end: string;
  opening_balance: number;
  closing_balance: number;
  total_deposits: number;
  total_withdrawals: number;
  transaction_count: number;
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

export const StatementViewer = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings } = useWebsiteSettings();
  const bankName = settings?.bankName || "Your Bank";
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState("");

  const parseDateInput = (value: string): Date | undefined => {
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return undefined;
    const [, mm, dd, yyyy] = match;
    const date = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
    if (isNaN(date.getTime()) || date > new Date()) return undefined;
    return date;
  };

  const handleStartDateInput = (value: string) => {
    setStartDateInput(value);
    const parsed = parseDateInput(value);
    if (parsed) setStartDate(parsed);
  };

  const handleEndDateInput = (value: string) => {
    setEndDateInput(value);
    const parsed = parseDateInput(value);
    if (parsed) setEndDate(parsed);
  };

  const handleStartDateSelect = (date: Date | undefined) => {
    setStartDate(date);
    setStartDateInput(date ? format(date, "MM/dd/yyyy") : "");
  };

  const handleEndDateSelect = (date: Date | undefined) => {
    setEndDate(date);
    setEndDateInput(date ? format(date, "MM/dd/yyyy") : "");
  };

  useEffect(() => {
    if (user) {
      fetchAccounts();
    }
  }, [user]);

  useEffect(() => {
    if (selectedAccount) {
      fetchStatements();
    }
  }, [selectedAccount]);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatements = async () => {
    try {
      const { data, error} = await (supabase as any)
        .from('account_statements')
        .select('*')
        .eq('account_id', selectedAccount)
        .order('statement_period_start', { ascending: false });

      if (error) throw error;
      setStatements(data || [] as any);
    } catch (error) {
      console.error('Error fetching statements:', error);
    }
  };

  const generateStatement = async (year: number, month: number) => {
    if (!selectedAccount) return;
    
    setGenerating(true);
    try {
      const { data, error } = await (supabase as any)
        .rpc('generate_monthly_statement', {
          p_account_id: selectedAccount
        });

      if (error) throw error;

      toast({
        title: "Statement Generated",
        description: `Statement for ${month}/${year} has been generated successfully.`,
      });

      fetchStatements();
    } catch (error) {
      console.error('Error generating statement:', error);
      toast({
        title: "Generation Failed",
        description: "Unable to generate statement. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const generateCustomStatement = async () => {
    if (!selectedAccount || !startDate || !endDate) {
      toast({
        title: "Error",
        description: "Please select an account and date range",
        variant: "destructive",
      });
      return;
    }

    if (startDate > endDate) {
      toast({
        title: "Error",
        description: "Start date must be before end date",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase
        .rpc('generate_custom_statement', {
          p_account_id: selectedAccount,
          p_start_date: startDate.toISOString().split('T')[0],
          p_end_date: endDate.toISOString().split('T')[0]
        });

      if (error) throw error;

      toast({
        title: "Statement Generated",
        description: `Custom statement for ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()} has been generated successfully.`,
      });

      fetchStatements();
    } catch (error) {
      console.error('Error generating custom statement:', error);
      toast({
        title: "Generation Failed",
        description: "Unable to generate custom statement. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };



  const downloadStatement = (statement: Statement) => {
    // Create a simple text-based statement for download
    const selectedAcc = accounts.find(acc => acc.id === statement.account_id);
    const startDate = new Date(statement.statement_period_start).toLocaleDateString();
    const endDate = new Date(statement.statement_period_end).toLocaleDateString();
    
    let content = `${bankName.toUpperCase()} ACCOUNT STATEMENT\n`;
    content += `Account: ${selectedAcc?.account_type} - ${selectedAcc?.account_number}\n`;
    content += `Statement Period: ${startDate} - ${endDate}\n`;
    content += `\n`;
    content += `SUMMARY:\n`;
    content += `Opening Balance: $${statement.opening_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n`;
    content += `Total Deposits: $${statement.total_deposits.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n`;
    content += `Total Withdrawals: $${statement.total_withdrawals.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n`;
    content += `Closing Balance: $${statement.closing_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n`;
    content += `Total Transactions: ${statement.transaction_count}\n`;
    content += `\n`;
    content += `Generated on: ${new Date().toLocaleDateString()}\n`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statement-${selectedAcc?.account_number}-${startDate.replace(/\//g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast({
      title: "Download Started",
      description: "Your statement is being downloaded.",
    });
  };

  const getCurrentMonthYear = () => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary">Account Statements</h2>
        <p className="text-muted-foreground">View and download your account statements</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Select Account
          </CardTitle>
          <CardDescription>Choose an account to view statements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger>
              <SelectValue placeholder="Select an account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {capitalizeAccountType(account.account_type)} - {account.account_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedAccount && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    const { year, month } = getCurrentMonthYear();
                    generateStatement(year, month);
                  }}
                  disabled={generating}
                  variant="outline"
                >
                  {generating ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      Generate Current Month
                    </div>
                  )}
                </Button>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3">Generate Custom Statement Range</h4>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Input
                        placeholder="MM/DD/YYYY"
                        value={startDateInput}
                        onChange={(e) => handleStartDateInput(e.target.value)}
                        className="w-full sm:w-[160px]"
                      />
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="icon" className="shrink-0">
                            <CalendarIcon className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={handleStartDateSelect}
                            initialFocus
                            className="pointer-events-auto"
                            fromYear={1980}
                            toDate={new Date()}
                            captionLayout="dropdown-buttons"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                      <Input
                        placeholder="MM/DD/YYYY"
                        value={endDateInput}
                        onChange={(e) => handleEndDateInput(e.target.value)}
                        className="w-full sm:w-[160px]"
                      />
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="icon" className="shrink-0">
                            <CalendarIcon className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={handleEndDateSelect}
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
                  
                  <Button 
                    onClick={generateCustomStatement}
                    disabled={generating || !startDate || !endDate}
                    className="w-fit"
                  >
                    Generate Statement for Range
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedAccount && statements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available Statements</CardTitle>
            <CardDescription>Click to view or download statements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statements.map((statement) => {
                const startDate = new Date(statement.statement_period_start).toLocaleDateString();
                const endDate = new Date(statement.statement_period_end).toLocaleDateString();
                
                return (
                  <div key={statement.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Statement: {startDate} - {endDate}</p>
                          <p className="text-sm text-muted-foreground">
                            {statement.transaction_count} transactions • 
                            Balance: ${statement.closing_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Generated</Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => downloadStatement(statement)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedAccount && statements.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No statements available for this account.</p>
            <p className="text-sm text-muted-foreground mt-2">Generate your first statement using the button above.</p>
          </CardContent>
        </Card>
      )}



    </div>
  );
};