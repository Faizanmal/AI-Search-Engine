"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { FadeIn } from "@/components/animations";
import { Search, User, Mail, Lock, Check, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    password2: "",
    first_name: "",
    last_name: "",
  });
  const [passwordStrength, setPasswordStrength] = useState(0);

  const checkPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]+/)) strength++;
    if (password.match(/[A-Z]+/)) strength++;
    if (password.match(/[0-9]+/)) strength++;
    if (password.match(/[$@#&!]+/)) strength++;
    setPasswordStrength(strength);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.password2) {
      toast.error("Passwords don't match", {
        description: "Please make sure both passwords are identical.",
      });
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Password too short", {
        description: "Password must be at least 8 characters long.",
      });
      return;
    }

    setLoading(true);

    try {
      const { user, tokens } = await authApi.register(formData);
      setAuth(user, tokens.access, tokens.refresh);
      localStorage.setItem("access_token", tokens.access);
      localStorage.setItem("refresh_token", tokens.refresh);
      toast.success(`Welcome aboard, ${user.first_name || user.username}!`, {
        description: "Your account has been created successfully.",
      });
      router.push("/search");
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { email?: string[]; username?: string[]; password?: string[] } };
      };
      const errorMsg =
        err.response?.data?.email?.[0] ||
        err.response?.data?.username?.[0] ||
        err.response?.data?.password?.[0] ||
        "Registration failed. Please try again.";
      toast.error("Registration failed", {
        description: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative app-atmosphere">
      <div className="absolute inset-0 bg-atlas-mesh pointer-events-none" />

      <FadeIn delay={0.05} className="relative z-10 w-full max-w-lg">
        <Card className="bg-[var(--paper)]/95 border-[var(--surface-border)] shadow-[var(--shadow-lg)] rounded-2xl">
          <CardHeader className="text-center space-y-5 pb-4">
            <div className="mx-auto w-14 h-14 bg-[var(--ocean-deep)] rounded-xl flex items-center justify-center shadow-[var(--shadow-md)]">
              <Search className="h-6 w-6 text-white" strokeWidth={2.25} />
            </div>
            <div>
              <CardTitle className="font-display text-3xl font-bold text-[var(--ink)]">
                Create account
              </CardTitle>
              <CardDescription className="text-base mt-2 text-muted-foreground">
                Join Atlas Search and FormForge
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-6 sm:px-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="text-sm font-medium">First name</Label>
                  <Input
                    id="first_name"
                    type="text"
                    placeholder="John"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    disabled={loading}
                    className="h-11 rounded-lg border-[var(--surface-border)]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name" className="text-sm font-medium">Last name</Label>
                  <Input
                    id="last_name"
                    type="text"
                    placeholder="Doe"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    disabled={loading}
                    className="h-11 rounded-lg border-[var(--surface-border)]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[var(--ocean)]" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={loading}
                  className="h-11 rounded-lg border-[var(--surface-border)]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4 text-[var(--ocean)]" />
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="johndoe"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  disabled={loading}
                  className="h-11 rounded-lg border-[var(--surface-border)]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[var(--ocean)]" />
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    checkPasswordStrength(e.target.value);
                  }}
                  required
                  disabled={loading}
                  className="h-11 rounded-lg border-[var(--surface-border)]"
                />
                {formData.password && (
                  <div className="space-y-1.5">
                    <div className="flex gap-1.5">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full ${
                            i < passwordStrength
                              ? passwordStrength <= 2
                                ? "bg-red-500"
                                : passwordStrength <= 3
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                              : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {passwordStrength <= 2 && "Weak password"}
                      {passwordStrength === 3 && "Medium password"}
                      {passwordStrength >= 4 && "Strong password"}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password2" className="text-sm font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[var(--ocean)]" />
                  Confirm password
                </Label>
                <Input
                  id="password2"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password2}
                  onChange={(e) => setFormData({ ...formData, password2: e.target.value })}
                  required
                  disabled={loading}
                  className="h-11 rounded-lg border-[var(--surface-border)]"
                />
                {formData.password2 && (
                  <div className="flex items-center gap-2 text-xs">
                    {formData.password === formData.password2 ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span className="text-emerald-600">Passwords match</span>
                      </>
                    ) : (
                      <span className="text-red-600">Passwords don&apos;t match</span>
                    )}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-[var(--signal)] hover:bg-[var(--signal-deep)] text-white text-base font-semibold rounded-lg mt-2"
                disabled={loading}
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-5 w-5" />
                    Create account
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="justify-center px-6 sm:px-8 pb-8">
            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-[var(--ocean)] hover:underline font-semibold">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </FadeIn>
    </div>
  );
}
