import { useState } from 'react';
import { Bell, Check, CheckCheck, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useOptimizedAdminNotifications } from '@/hooks/useOptimizedAdminNotifications';

export const AdminNotificationDropdown = () => {
  const { counts } = useOptimizedAdminNotifications();
  const [open, setOpen] = useState(false);

  const notifications = [
    ...(counts.supportTickets > 0 ? [{
      id: 'support',
      title: 'Support Tickets',
      message: `${counts.supportTickets} open support ticket${counts.supportTickets > 1 ? 's' : ''} requiring attention`,
      type: 'support',
      count: counts.supportTickets
    }] : []),
    ...(counts.pendingTransfers > 0 ? [{
      id: 'transfers',
      title: 'Pending Transfers',
      message: `${counts.pendingTransfers} foreign remittance${counts.pendingTransfers > 1 ? 's' : ''} pending approval`,
      type: 'transfer',
      count: counts.pendingTransfers
    }] : []),
    ...(counts.pendingLoans > 0 ? [{
      id: 'loans',
      title: 'Loan Applications',
      message: `${counts.pendingLoans} loan application${counts.pendingLoans > 1 ? 's' : ''} awaiting review`,
      type: 'loan',
      count: counts.pendingLoans
    }] : []),
    ...(counts.pendingKYC > 0 ? [{
      id: 'kyc',
      title: 'KYC Documents',
      message: `${counts.pendingKYC} KYC document${counts.pendingKYC > 1 ? 's' : ''} pending verification`,
      type: 'kyc',
      count: counts.pendingKYC
    }] : []),
    ...(counts.pendingCheckDeposits > 0 ? [{
      id: 'check_deposits',
      title: 'Check Deposits',
      message: counts.sampleCheckDeposit 
        ? `New $${counts.sampleCheckDeposit.amount} check deposit from ${counts.sampleCheckDeposit.user_name} (${counts.sampleCheckDeposit.user_email})${counts.pendingCheckDeposits > 1 ? ` and ${counts.pendingCheckDeposits - 1} more` : ''}`
        : `${counts.pendingCheckDeposits} check deposit${counts.pendingCheckDeposits > 1 ? 's' : ''} awaiting approval`,
      type: 'check_deposit',
      count: counts.pendingCheckDeposits
    }] : []),
    ...(counts.pendingCryptoDeposits > 0 ? [{
      id: 'crypto_deposits',
      title: 'Crypto Deposits',
      message: counts.sampleCryptoDeposit 
        ? `New $${counts.sampleCryptoDeposit.amount} ${counts.sampleCryptoDeposit.crypto_type} deposit from ${counts.sampleCryptoDeposit.user_name} (${counts.sampleCryptoDeposit.user_email})${counts.pendingCryptoDeposits > 1 ? ` and ${counts.pendingCryptoDeposits - 1} more` : ''}`
        : `${counts.pendingCryptoDeposits} crypto deposit${counts.pendingCryptoDeposits > 1 ? 's' : ''} awaiting approval`,
      type: 'crypto_deposit',
      count: counts.pendingCryptoDeposits
    }] : []),
    ...(counts.pendingApplications > 0 ? [{
      id: 'applications',
      title: 'Account Opening Submissions',
      message: `${counts.pendingApplications} account opening submission${counts.pendingApplications > 1 ? 's' : ''} awaiting review`,
      type: 'application',
      count: counts.pendingApplications
    }] : [])
  ];

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'support':
        return '💬';
      case 'support_message':
        return '📨';
      case 'transfer':
        return '💸';
      case 'external_transfer':
        return '🏦';
      case 'loan':
        return '💳';
      case 'kyc':
        return '📄';
      case 'check_deposit':
        return '📑';
      case 'crypto_deposit':
        return '₿';
      case 'application':
        return '📋';
      default:
        return 'ℹ️';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="flex-1 sm:flex-none relative">
          <Bell className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Alerts</span>
          {counts.total > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {counts.total > 99 ? '99+' : counts.total}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Admin Alerts</h3>
          <Badge variant="outline" className="text-xs">
            {counts.total} total
          </Badge>
        </div>
        
        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No pending alerts</p>
              <p className="text-xs">All tasks are up to date</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setOpen(false)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm">
                          {notification.title}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {notification.count}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-1 mt-2">
                        <Eye className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Click to view details
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};