import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QrCode, Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface CryptoConfig {
  id: string;
  crypto_type: string;
  wallet_address: string;
  qr_code_url: string | null;
  enabled: boolean;
}

const QRCodeDisplayAdmin = ({ qrCodeUrl }: { qrCodeUrl: string | null }) => {
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useState(() => {
    if (qrCodeUrl) {
      setLoading(true);
      supabase.storage
        .from("deposits")
        .createSignedUrl(qrCodeUrl, 3600)
        .then(({ data, error }) => {
          if (!error && data) setQrSrc(data.signedUrl);
          setLoading(false);
        });
    }
  });

  if (!qrCodeUrl) {
    return (
      <div className="w-16 h-16 border rounded flex items-center justify-center text-muted-foreground">
        <QrCode className="h-8 w-8" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-16 h-16 border rounded flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="w-16 h-16 border rounded overflow-hidden">
      {qrSrc ? (
        <img src={qrSrc} alt="QR Code" className="w-full h-full object-contain" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
          QR Error
        </div>
      )}
    </div>
  );
};

interface CryptoSettingsTabProps {
  cryptoConfigs: CryptoConfig[];
  loading: boolean;
  updateCryptoConfig: (configId: string, updates: Partial<CryptoConfig>) => Promise<void>;
  uploadQRCode: (file: File, cryptoType: string) => Promise<string | null>;
  fetchCryptoConfigs: () => Promise<void>;
  toast: (opts: { title: string; description: string; variant?: "default" | "destructive" }) => void;
}

export const CryptoSettingsTab = ({
  cryptoConfigs,
  loading,
  updateCryptoConfig,
  uploadQRCode,
  fetchCryptoConfigs,
  toast,
}: CryptoSettingsTabProps) => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newCryptoType, setNewCryptoType] = useState("");
  const [customCryptoType, setCustomCryptoType] = useState("");
  const [newWalletAddress, setNewWalletAddress] = useState("");
  const [adding, setAdding] = useState(false);

  const cryptoOptions = ["Bitcoin (BTC)", "Ethereum (ETH)", "USDT (TRC20)", "USDT (ERC20)", "Litecoin (LTC)", "Bitcoin Cash (BCH)"];

  const handleAddCrypto = async () => {
    const cryptoType = newCryptoType === "custom" ? customCryptoType : newCryptoType;
    if (!cryptoType || !newWalletAddress) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    setAdding(true);
    try {
      const { error } = await supabase
        .from("crypto_deposit_config")
        .insert({
          crypto_type: cryptoType,
          wallet_address: newWalletAddress,
          enabled: true,
        });

      if (error) throw error;

      toast({ title: "Success", description: `${cryptoType} configuration added successfully` });
      setAddDialogOpen(false);
      setNewCryptoType("");
      setCustomCryptoType("");
      setNewWalletAddress("");
      fetchCryptoConfigs();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to add crypto configuration", variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Crypto Configuration</CardTitle>
            <CardDescription>Manage cryptocurrency deposit settings</CardDescription>
          </div>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Crypto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Crypto Configuration</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Cryptocurrency</Label>
                  <Select value={newCryptoType} onValueChange={setNewCryptoType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select cryptocurrency" />
                    </SelectTrigger>
                    <SelectContent>
                      {cryptoOptions.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                      <SelectItem value="custom">Other (Custom)</SelectItem>
                    </SelectContent>
                  </Select>
                  {newCryptoType === "custom" && (
                    <Input
                      placeholder="Enter custom crypto name"
                      value={customCryptoType}
                      onChange={(e) => setCustomCryptoType(e.target.value)}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Wallet Address</Label>
                  <Input
                    placeholder="Enter wallet address"
                    value={newWalletAddress}
                    onChange={(e) => setNewWalletAddress(e.target.value)}
                  />
                </div>
                <Button onClick={handleAddCrypto} disabled={adding} className="w-full">
                  {adding ? "Adding..." : "Add Configuration"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {cryptoConfigs.length === 0 ? (
          <div className="text-center py-8">
            <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No crypto configurations yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Click "Add Crypto" to create your first configuration.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {cryptoConfigs.map((config) => (
              <Card key={config.id}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">{config.crypto_type}</h3>
                      <Switch
                        checked={config.enabled}
                        onCheckedChange={(checked) => updateCryptoConfig(config.id, { enabled: checked })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Wallet Address</Label>
                      <Input
                        value={config.wallet_address}
                        onChange={(e) => updateCryptoConfig(config.id, { wallet_address: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>QR Code</Label>
                      <div className="flex items-center space-x-4">
                        <QRCodeDisplayAdmin qrCodeUrl={config.qr_code_url} />
                        <Input
                          type="file"
                          accept="image/*"
                          className="file:bg-primary file:text-primary-foreground file:border-0 file:rounded-md file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-primary/90 cursor-pointer"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const qrPath = await uploadQRCode(file, config.crypto_type);
                              if (qrPath) {
                                await updateCryptoConfig(config.id, { qr_code_url: qrPath });
                                toast({ title: "Success", description: "QR code uploaded successfully" });
                              }
                              e.target.value = '';
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
