"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { formsApi, integrationsApi } from "@/lib/api-client";
import type { Form, Integration, WebhookLog } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Webhook, Mail, Sheet, CreditCard, Plus, Trash2, CheckCircle, XCircle, Copy, MessageSquare, BookOpen, Zap } from "lucide-react";
import { toast } from "sonner";

export default function FormIntegrationsPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.id as string;

  const [form, setForm] = useState<Form | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingSheets, setConnectingSheets] = useState(false);

  // Webhook state
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");

  // Email state
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState("");

  // Stripe state
  const [stripePublishableKey, setStripePublishableKey] = useState("");
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [savingStripe, setSavingStripe] = useState(false);

  // Google Sheets
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [sheetRange, setSheetRange] = useState("Sheet1");

  // Slack / Notion / Zapier
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [notionApiKey, setNotionApiKey] = useState("");
  const [notionDatabaseId, setNotionDatabaseId] = useState("");
  const [zapierHookUrl, setZapierHookUrl] = useState("");
  const [savingExtra, setSavingExtra] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [formData, integrationsData] = await Promise.all([
        formsApi.get(formId),
        integrationsApi.list(formId),
      ]);
      setForm(formData);
      setIntegrations(integrationsData);

      // Load existing integrations into state
      const webhook = integrationsData.find(i => i.integration_type === "webhook");
      if (webhook) {
        setWebhookUrl((webhook.config.url as string) || "");
        setWebhookSecret((webhook.config.secret as string) || "");
        
        // Load webhook logs
        const logs = await integrationsApi.getWebhookLogs(webhook.id);
        setWebhookLogs(logs.slice(0, 10));  // Get last 10
      }

      const email = integrationsData.find(i => i.integration_type === "email");
      if (email) {
        setEmailEnabled(email.is_active);
        setEmailRecipients((email.config.recipients as string[])?.join(", ") || "");
      }

      const stripe = integrationsData.find(i => i.integration_type === "stripe");
      if (stripe) {
        setStripePublishableKey((stripe.config.publishable_key as string) || "");
        setStripeSecretKey((stripe.config.secret_key as string) || "");
      }

      const sheets = integrationsData.find(i => i.integration_type === "google_sheets");
      if (sheets) {
        setSpreadsheetId((sheets.config.spreadsheet_id as string) || "");
        setSheetRange((sheets.config.sheet_range as string) || "Sheet1");
      }

      const slack = integrationsData.find(i => i.integration_type === "slack");
      if (slack) {
        setSlackWebhookUrl(
          (slack.config.webhook_url as string) || (slack.config.url as string) || ""
        );
      }

      const notion = integrationsData.find(i => i.integration_type === "notion");
      if (notion) {
        setNotionApiKey((notion.config.api_key as string) || "");
        setNotionDatabaseId((notion.config.database_id as string) || "");
      }

      const zapier = integrationsData.find(i => i.integration_type === "zapier");
      if (zapier) {
        setZapierHookUrl(
          (zapier.config.hook_url as string) || (zapier.config.url as string) || ""
        );
      }
    } catch {
      toast.error("Failed to load integrations");
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveWebhook = async () => {
    if (!webhookUrl) {
      toast.error("Webhook URL is required");
      return;
    }

    try {
      const existing = integrations.find(i => i.integration_type === "webhook");
      
      if (existing) {
        await integrationsApi.update(existing.id, {
          config: { url: webhookUrl, secret: webhookSecret },
          is_active: true,
        });
      } else {
        await integrationsApi.create({
          form: formId,
          integration_type: "webhook",
          config: { url: webhookUrl, secret: webhookSecret },
          is_active: true,
        });
      }

      toast.success("Webhook integration saved");
      loadData();
    } catch {
      toast.error("Failed to save webhook");
    }
  };

  const saveEmail = async () => {
    const recipients = emailRecipients.split(",").map(e => e.trim()).filter(Boolean);
    
    if (emailEnabled && recipients.length === 0) {
      toast.error("At least one email recipient is required");
      return;
    }

    try {
      const existing = integrations.find(i => i.integration_type === "email");

      if (existing) {
        await integrationsApi.update(existing.id, {
          config: { recipients },
          is_active: emailEnabled,
        });
      } else {
        await integrationsApi.create({
          form: formId,
          integration_type: "email",
          config: { recipients },
          is_active: emailEnabled,
        });
      }

      toast.success("Email integration saved");
      loadData();
    } catch {
      toast.error("Failed to save email integration");
    }
  };

  const saveStripe = async () => {
    if (!stripePublishableKey.trim()) {
      toast.error("Publishable key is required");
      return;
    }
    setSavingStripe(true);
    try {
      const existing = integrations.find(i => i.integration_type === "stripe");
      const config = {
        publishable_key: stripePublishableKey.trim(),
        secret_key: stripeSecretKey.trim(),
      };
      if (existing) {
        await integrationsApi.update(existing.id, { config, is_active: true });
      } else {
        await integrationsApi.create({
          form: formId,
          integration_type: "stripe",
          config,
          is_active: true,
        });
      }
      toast.success("Stripe keys saved. Payment fields open Checkout on submit.");
      loadData();
    } catch {
      toast.error("Failed to save Stripe configuration");
    } finally {
      setSavingStripe(false);
    }
  };

  const saveSheetsConfig = async () => {
    const existing = integrations.find(i => i.integration_type === "google_sheets");
    if (!existing) {
      toast.error("Connect Google Sheets OAuth first");
      return;
    }
    if (!spreadsheetId.trim()) {
      toast.error("Spreadsheet ID is required");
      return;
    }
    try {
      await integrationsApi.update(existing.id, {
        config: {
          ...existing.config,
          spreadsheet_id: spreadsheetId.trim(),
          sheet_range: sheetRange.trim() || "Sheet1",
        },
        is_active: true,
      });
      toast.success("Google Sheets destination saved");
      loadData();
    } catch {
      toast.error("Failed to save spreadsheet settings");
    }
  };

  const upsertIntegration = async (
    type: Integration["integration_type"],
    config: Record<string, unknown>
  ) => {
    setSavingExtra(true);
    try {
      const existing = integrations.find(i => i.integration_type === type);
      if (existing) {
        await integrationsApi.update(existing.id, { config, is_active: true });
      } else {
        await integrationsApi.create({
          form: formId,
          integration_type: type,
          config,
          is_active: true,
        });
      }
      toast.success(`${type.replace("_", " ")} saved`);
      loadData();
    } catch {
      toast.error(`Failed to save ${type}`);
    } finally {
      setSavingExtra(false);
    }
  };

  const deleteIntegration = async (id: string) => {
    if (!confirm("Are you sure you want to delete this integration?")) return;

    try {
      await integrationsApi.delete(id);
      toast.success("Integration deleted");
      loadData();
    } catch {
      toast.error("Failed to delete integration");
    }
  };

  const testWebhook = async () => {
    const webhook = integrations.find(i => i.integration_type === "webhook");
    if (!webhook) {
      toast.error("Save webhook configuration first");
      return;
    }

    try {
      await integrationsApi.test(webhook.id);
      toast.success("Test webhook sent! Check your endpoint.");
    } catch {
      toast.error("Failed to send test webhook");
    }
  };

  const copyWebhookSignature = () => {
    const code = `import hmac
import hashlib

def verify_webhook(payload_body, signature_header, secret):
    """Verify webhook signature"""
    expected_signature = hmac.new(
        secret.encode(),
        payload_body.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature_header, expected_signature)

# Example usage
is_valid = verify_webhook(
    payload_body=request.body.decode(),
    signature_header=request.headers['X-FormForge-Signature'],
    secret='${webhookSecret || 'your-secret-key'}'
)`;
    
    navigator.clipboard.writeText(code);
    toast.success("Verification code copied to clipboard!");
  };

  const connectGoogleSheets = async () => {
    setConnectingSheets(true);
    try {
      // Get authorization URL from backend
      const response = await integrationsApi.initiateGoogleOAuth(formId);
      
      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = (screen.width / 2) - (width / 2);
      const top = (screen.height / 2) - (height / 2);
      
      const popup = window.open(
        response.authorization_url,
        'Google OAuth',
        `width=${width},height=${height},top=${top},left=${left}`
      );

      // Listen for OAuth callback
      const handleMessage = async (event: MessageEvent) => {
        if (event.data.type === 'google-oauth-success') {
          window.removeEventListener('message', handleMessage);
          popup?.close();
          
          // Complete the OAuth flow
          await integrationsApi.completeGoogleOAuth({
            code: event.data.code,
            state: event.data.state,
            form_id: formId,
            spreadsheet_id: spreadsheetId || undefined,
            sheet_range: sheetRange || "Sheet1",
          });
          
          toast.success("Google Sheets connected successfully!");
          loadData();
        }
      };

      window.addEventListener('message', handleMessage);
      
      // Cleanup if popup is closed
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          setConnectingSheets(false);
        }
      }, 500);
      
    } catch {
      toast.error("Failed to connect Google Sheets");
      setConnectingSheets(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading integrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.push("/dashboard")}>
          ← Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold mt-2">{form?.title}</h1>
        <p className="text-muted-foreground">Integrations & Automations</p>
      </div>

      <Tabs defaultValue="webhooks" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 h-auto gap-1">
          <TabsTrigger value="webhooks">
            <Webhook className="mr-2 h-4 w-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="mr-2 h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="sheets">
            <Sheet className="mr-2 h-4 w-4" />
            Sheets
          </TabsTrigger>
          <TabsTrigger value="payment">
            <CreditCard className="mr-2 h-4 w-4" />
            Stripe
          </TabsTrigger>
          <TabsTrigger value="slack">
            <MessageSquare className="mr-2 h-4 w-4" />
            Slack
          </TabsTrigger>
          <TabsTrigger value="notion">
            <BookOpen className="mr-2 h-4 w-4" />
            Notion
          </TabsTrigger>
          <TabsTrigger value="zapier">
            <Zap className="mr-2 h-4 w-4" />
            Zapier
          </TabsTrigger>
        </TabsList>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Configuration</CardTitle>
              <CardDescription>
                Send form submissions to your server in real-time
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhookUrl">Webhook URL</Label>
                <Input
                  id="webhookUrl"
                  placeholder="https://api.yoursite.com/webhooks/formforge"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  POST requests will be sent to this URL when a form is submitted
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhookSecret">Webhook Secret (Optional)</Label>
                <Input
                  id="webhookSecret"
                  type="password"
                  placeholder="your-secret-key"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Used to sign webhook payloads with HMAC-SHA256
                </p>
              </div>

              {webhookSecret && (
                <div className="bg-muted p-4 rounded-md">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-medium">Signature Verification Code</p>
                    <Button variant="ghost" size="sm" onClick={copyWebhookSignature}>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Check the <code>X-FormForge-Signature</code> header to verify webhook authenticity
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={saveWebhook}>Save Webhook</Button>
                <Button variant="outline" onClick={testWebhook}>
                  Test Webhook
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Webhook Logs */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Webhook Deliveries</CardTitle>
              <CardDescription>Last 10 webhook attempts</CardDescription>
            </CardHeader>
            <CardContent>
              {webhookLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No webhook deliveries yet</p>
                  <p className="text-sm mt-2">Logs will appear here after submissions are sent to your webhook</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Response Code</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhookLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {new Date(log.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {log.status === 'success' && (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Success
                            </Badge>
                          )}
                          {log.status === 'failed' && (
                            <Badge variant="destructive">
                              <XCircle className="mr-1 h-3 w-3" />
                              Failed
                            </Badge>
                          )}
                          {log.status === 'pending' && (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                          {log.status === 'retrying' && (
                            <Badge variant="default" className="bg-yellow-600">Retrying</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.response_status_code || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {log.status === 'failed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await integrationsApi.retryWebhook(log.id);
                                  toast.success("Webhook retry queued");
                                  loadData();
                                } catch {
                                  toast.error("Failed to retry webhook");
                                }
                              }}
                            >
                              Retry
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>
                Receive email alerts when someone submits your form
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="emailEnabled">Enable Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified via email for every submission
                  </p>
                </div>
                <Switch
                  id="emailEnabled"
                  checked={emailEnabled}
                  onCheckedChange={setEmailEnabled}
                />
              </div>

              {emailEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="emailRecipients">Recipients</Label>
                  <Input
                    id="emailRecipients"
                    placeholder="admin@yoursite.com, team@yoursite.com"
                    value={emailRecipients}
                    onChange={(e) => setEmailRecipients(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Separate multiple email addresses with commas
                  </p>
                </div>
              )}

              <Button onClick={saveEmail}>Save Email Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Google Sheets Tab */}
        <TabsContent value="sheets" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Google Sheets Integration</CardTitle>
              <CardDescription>
                Automatically send submissions to a Google Sheet
              </CardDescription>
            </CardHeader>
            <CardContent>
              {integrations.find(i => i.integration_type === 'google_sheets') ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900">Google Sheets Connected</p>
                        <p className="text-sm text-green-700">
                          Form submissions are appended as new rows
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const sheetsIntegration = integrations.find(i => i.integration_type === 'google_sheets');
                        if (sheetsIntegration) deleteIntegration(sheetsIntegration.id);
                      }}
                    >
                      Disconnect
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="spreadsheetId">Spreadsheet ID</Label>
                    <Input
                      id="spreadsheetId"
                      placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                      value={spreadsheetId}
                      onChange={(e) => setSpreadsheetId(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      From the sheet URL between /d/ and /edit
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sheetRange">Sheet name</Label>
                    <Input
                      id="sheetRange"
                      value={sheetRange}
                      onChange={(e) => setSheetRange(e.target.value)}
                      placeholder="Sheet1"
                    />
                  </div>
                  <Button onClick={saveSheetsConfig}>Save Sheet Destination</Button>
                </div>
              ) : (
                <div className="text-center py-12 space-y-4">
                  <Sheet className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                  <p className="font-medium">Connect Google Sheets</p>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Authorize FormForge, then set the spreadsheet ID so each submission becomes a row.
                  </p>
                  <div className="max-w-md mx-auto space-y-2 text-left">
                    <Label>Spreadsheet ID (optional now)</Label>
                    <Input
                      value={spreadsheetId}
                      onChange={(e) => setSpreadsheetId(e.target.value)}
                      placeholder="Paste spreadsheet ID before or after OAuth"
                    />
                  </div>
                  <Button
                    onClick={connectGoogleSheets}
                    disabled={connectingSheets}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {connectingSheets ? 'Connecting...' : 'Connect Google Sheets'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Integration</CardTitle>
              <CardDescription>
                Save Stripe keys so payment fields open Stripe Checkout after submit.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="stripePk">Publishable Key</Label>
                <Input
                  id="stripePk"
                  placeholder="pk_test_..."
                  value={stripePublishableKey}
                  onChange={(e) => setStripePublishableKey(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stripeSk">Secret Key</Label>
                <Input
                  id="stripeSk"
                  type="password"
                  placeholder="sk_test_..."
                  value={stripeSecretKey}
                  onChange={(e) => setStripeSecretKey(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Stored with this form&apos;s integration config. Prefer test keys in development.
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveStripe} disabled={savingStripe}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  {savingStripe ? "Saving..." : "Save Stripe Keys"}
                </Button>
                {integrations.find(i => i.integration_type === "stripe") && (
                  <Badge variant="default" className="bg-green-600 self-center">
                    <CheckCircle className="mr-1 h-3 w-3" /> Connected
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="slack" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Slack</CardTitle>
              <CardDescription>
                Post each submission to a Slack channel via an Incoming Webhook.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Incoming Webhook URL</Label>
                <Input
                  value={slackWebhookUrl}
                  onChange={(e) => setSlackWebhookUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                />
              </div>
              <Button
                disabled={savingExtra}
                onClick={() =>
                  upsertIntegration("slack", { webhook_url: slackWebhookUrl.trim() })
                }
              >
                Save Slack
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notion" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notion</CardTitle>
              <CardDescription>
                Create a page in a Notion database for each submission. Database needs a Name (title) property;
                an optional Response (rich text) property stores the answers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Internal Integration Token</Label>
                <Input
                  type="password"
                  value={notionApiKey}
                  onChange={(e) => setNotionApiKey(e.target.value)}
                  placeholder="secret_..."
                />
              </div>
              <div className="space-y-2">
                <Label>Database ID</Label>
                <Input
                  value={notionDatabaseId}
                  onChange={(e) => setNotionDatabaseId(e.target.value)}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                />
              </div>
              <Button
                disabled={savingExtra}
                onClick={() =>
                  upsertIntegration("notion", {
                    api_key: notionApiKey.trim(),
                    database_id: notionDatabaseId.trim(),
                  })
                }
              >
                Save Notion
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="zapier" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Zapier</CardTitle>
              <CardDescription>
                Paste a Zapier Catch Hook URL to receive submission JSON.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Catch Hook URL</Label>
                <Input
                  value={zapierHookUrl}
                  onChange={(e) => setZapierHookUrl(e.target.value)}
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                />
              </div>
              <Button
                disabled={savingExtra}
                onClick={() =>
                  upsertIntegration("zapier", { hook_url: zapierHookUrl.trim() })
                }
              >
                Save Zapier
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Active Integrations List */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Active Integrations</CardTitle>
          <CardDescription>All integrations configured for this form</CardDescription>
        </CardHeader>
        <CardContent>
          {integrations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No integrations configured yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {integrations.map((integration) => (
                  <TableRow key={integration.id}>
                    <TableCell className="font-medium capitalize">
                      {integration.integration_type}
                    </TableCell>
                    <TableCell>
                      {integration.is_active ? (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="mr-1 h-3 w-3" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(integration.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteIntegration(integration.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
