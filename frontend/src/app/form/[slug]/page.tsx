"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { formsApi, submissionsApi } from "@/lib/api-client";
import type { Form, FormField } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

function PublicFormInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [paymentNote, setPaymentNote] = useState<string | null>(null);

  const visibleFields = useMemo(() => {
    if (!form) return new Set<string>();

    const newVisible = new Set<string>();
    form.schema_json.fields.forEach((field) => {
      newVisible.add(field.id);
    });

    if (form.schema_json.logic) {
      form.schema_json.logic.forEach((rule) => {
        const fieldValue = formData[rule.if.field];
        let conditionMet = false;

        switch (rule.if.operator) {
          case "equals":
            conditionMet = fieldValue === rule.if.value;
            break;
          case "in":
            conditionMet = Array.isArray(rule.if.value)
              ? (rule.if.value as unknown[]).includes(fieldValue)
              : String(rule.if.value)
                  .split(",")
                  .map((s) => s.trim())
                  .includes(String(fieldValue));
            break;
          case "contains":
            conditionMet = Array.isArray(fieldValue)
              ? fieldValue.includes(rule.if.value)
              : String(fieldValue).includes(String(rule.if.value));
            break;
          case "gte":
            conditionMet = Number(fieldValue) >= Number(rule.if.value);
            break;
          case "lte":
            conditionMet = Number(fieldValue) <= Number(rule.if.value);
            break;
        }

        if (conditionMet) {
          rule.show?.forEach((fieldId) => newVisible.add(fieldId));
          rule.hide?.forEach((fieldId) => newVisible.delete(fieldId));
        } else {
          rule.hide?.forEach((fieldId) => newVisible.add(fieldId));
          rule.show?.forEach((fieldId) => newVisible.delete(fieldId));
        }
      });
    }

    return newVisible;
  }, [form, formData]);

  useEffect(() => {
    const payment = searchParams.get("payment");
    const sessionId = searchParams.get("session_id");
    if (payment === "success") {
      setSubmitted(true);
      setPaymentNote("Payment received — thank you!");
      if (sessionId) {
        submissionsApi.confirmStripe(sessionId).catch(() => {
          /* submission still recorded even if confirm fails */
        });
      }
    } else if (payment === "cancelled") {
      setPaymentNote("Payment was cancelled. You can submit again when ready.");
    }
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      try {
        const foundForm = await formsApi.getPublicBySlug(slug);
        setForm(foundForm);
        if (typeof window !== "undefined") {
          window.parent?.postMessage(
            { type: "formforge:height", height: document.documentElement.scrollHeight },
            "*"
          );
        }
      } catch {
        toast.error("Form not found or not published yet");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  const readFileAsPayload = (file: File): Promise<Record<string, unknown>> =>
    new Promise((resolve, reject) => {
      if (file.size > MAX_FILE_BYTES) {
        reject(new Error("File must be 5MB or smaller"));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          name: file.name,
          type: file.type,
          size: file.size,
          data_url: reader.result,
        });
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const requiredFields = form?.schema_json.fields.filter(
      (f) => f.required && visibleFields.has(f.id)
    );
    const missingFields = requiredFields?.filter((f) => {
      const val = formData[f.id];
      if (f.type === "file") return !val;
      if (f.type === "payment") return false;
      return val === undefined || val === null || val === "";
    });

    if (missingFields && missingFields.length > 0) {
      toast.error(
        `Please fill in all required fields: ${missingFields.map((f) => f.label).join(", ")}`
      );
      return;
    }

    setSubmitting(true);

    try {
      const response = await submissionsApi.submit(slug, formData);
      if (response.checkout_url) {
        toast.success("Redirecting to secure checkout…");
        window.location.href = response.checkout_url;
        return;
      }
      setSubmitted(true);
      toast.success(response.message || "Form submitted successfully!");
      if (typeof window !== "undefined") {
        window.parent?.postMessage(
          { type: "formforge:submitted", submissionId: response.id },
          "*"
        );
      }

      if (
        response.redirect &&
        response.redirect !== "/thank-you" &&
        !response.redirect.includes("/form/")
      ) {
        setTimeout(() => {
          window.location.href = response.redirect;
        }, 2000);
      }
    } catch (error: unknown) {
      const err = error as { isRateLimit?: boolean; message?: string; retryAfter?: number };
      if (err?.isRateLimit) {
        toast.error(err.message || "Too many submissions. Please try again later.", {
          description: err.retryAfter
            ? `Please wait ${err.retryAfter} seconds before trying again.`
            : undefined,
          duration: 5000,
        });
      } else {
        toast.error("Failed to submit form. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    if (!visibleFields.has(field.id)) return null;

    const rawValue = formData[field.id];
    const value =
      typeof rawValue === "string" || typeof rawValue === "number" ? String(rawValue) : "";
    const multiValue = Array.isArray(rawValue) ? (rawValue as string[]) : [];
    const fileMeta =
      rawValue && typeof rawValue === "object" && "name" in (rawValue as object)
        ? (rawValue as { name: string; size?: number })
        : null;

    switch (field.type) {
      case "text":
      case "email":
      case "phone":
      case "url":
      case "number":
      case "date":
      case "time":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.id}
              type={field.type === "phone" ? "tel" : field.type}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
              required={field.required}
            />
            {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
          </div>
        );

      case "file":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="flex items-center gap-3 rounded-md border border-dashed p-4">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <Input
                id={field.id}
                type="file"
                className="border-0 shadow-none"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) {
                    setFormData({ ...formData, [field.id]: undefined });
                    return;
                  }
                  try {
                    const payload = await readFileAsPayload(file);
                    setFormData({ ...formData, [field.id]: payload });
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "File upload failed");
                    e.target.value = "";
                  }
                }}
                required={field.required && !fileMeta}
              />
            </div>
            {fileMeta && (
              <p className="text-xs text-muted-foreground">
                Selected: {fileMeta.name}
                {fileMeta.size ? ` (${Math.round(fileMeta.size / 1024)} KB)` : ""}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Max 5MB. Files are stored with the submission.
            </p>
            {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
          </div>
        );

      case "payment":
        return (
          <div key={field.id} className="space-y-2 rounded-md border p-4">
            <Label>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <p className="text-2xl font-semibold">
              {((field.amount || 0) / 100).toLocaleString(undefined, {
                style: "currency",
                currency: (field.currency || "usd").toUpperCase(),
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              After you submit, you will be redirected to Stripe Checkout to pay securely.
            </p>
            {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
          </div>
        );

      case "textarea":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={field.id}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
              required={field.required}
              rows={4}
            />
            {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
          </div>
        );

      case "select":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select
              value={value}
              onValueChange={(val) => setFormData({ ...formData, [field.id]: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder || "Select..."} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
          </div>
        );

      case "checkbox":
        return (
          <div key={field.id} className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={Boolean(formData[field.id])}
              onCheckedChange={(checked) => setFormData({ ...formData, [field.id]: checked })}
            />
            <Label htmlFor={field.id} className="text-sm font-normal">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
          </div>
        );

      case "radio":
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <RadioGroup
              value={value}
              onValueChange={(val) => setFormData({ ...formData, [field.id]: val })}
            >
              {field.options?.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${field.id}-${option}`} />
                  <Label htmlFor={`${field.id}-${option}`} className="font-normal">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
          </div>
        );

      case "multiselect":
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="space-y-2">
              {field.options?.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${field.id}-${option}`}
                    checked={multiValue.includes(option)}
                    onCheckedChange={(checked) => {
                      const newValues = checked
                        ? [...multiValue, option]
                        : multiValue.filter((v: string) => v !== option);
                      setFormData({ ...formData, [field.id]: newValues });
                    }}
                  />
                  <Label htmlFor={`${field.id}-${option}`} className="text-sm font-normal">
                    {option}
                  </Label>
                </div>
              ))}
            </div>
            {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Form not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
            <p className="text-muted-foreground">
              {paymentNote || "Your response has been recorded successfully."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {paymentNote && (
          <div className="mb-4 rounded-md border bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {paymentNote}
          </div>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{form.schema_json.title || form.title}</CardTitle>
            {form.schema_json.description && (
              <CardDescription>{form.schema_json.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Honeypot — leave empty; bots that fill it are rejected server-side */}
              <div
                aria-hidden="true"
                className="absolute -left-[9999px] top-auto h-0 w-0 overflow-hidden opacity-0"
              >
                <label htmlFor="website_url">Website</label>
                <input
                  id="website_url"
                  name="website_url"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={String(formData.website_url || "")}
                  onChange={(e) =>
                    setFormData({ ...formData, website_url: e.target.value })
                  }
                />
              </div>

              {form.schema_json.fields.map(renderField)}

              {form.schema_json.settings?.consent_text && (
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    {form.schema_json.settings.consent_text}
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PublicFormPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <PublicFormInner />
    </Suspense>
  );
}
