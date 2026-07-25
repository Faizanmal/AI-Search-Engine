"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { authApi } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { FadeIn } from "@/components/animations";
import { Search, Lock, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authApi.login(formData);
      setAuth(response.user, response.access, response.refresh);
      localStorage.setItem("access_token", response.access);
      localStorage.setItem("refresh_token", response.refresh);
      toast.success("Welcome back!", {
        description: "You've been successfully logged in",
      });
      router.push("/search");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error("Login failed", {
        description: err.response?.data?.detail || "Please check your credentials and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative app-atmosphere">
      <div className="absolute inset-0 bg-atlas-mesh pointer-events-none" />

      <FadeIn delay={0.05} className="relative z-10 w-full max-w-md">
        <Card className="bg-[var(--paper)]/95 border-[var(--surface-border)] shadow-[var(--shadow-lg)] rounded-2xl">
          <CardHeader className="text-center space-y-5 pb-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mx-auto w-14 h-14 bg-[var(--ocean-deep)] rounded-xl flex items-center justify-center shadow-[var(--shadow-md)]"
            >
              <Search className="h-6 w-6 text-white" strokeWidth={2.25} />
            </motion.div>

            <div>
              <CardTitle className="font-display text-3xl font-bold text-[var(--ink)]">
                Welcome back
              </CardTitle>
              <CardDescription className="text-base mt-2 text-muted-foreground">
                Sign in to Atlas Search
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 px-6 sm:px-8">
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  className="h-11 text-base rounded-lg border-[var(--surface-border)]"
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
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  disabled={loading}
                  className="h-11 text-base rounded-lg border-[var(--surface-border)]"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-[var(--signal)] hover:bg-[var(--signal-deep)] text-white text-base font-semibold rounded-lg"
                disabled={loading}
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-3 px-6 sm:px-8 pb-8">
            <p className="text-sm text-center text-muted-foreground w-full">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-[var(--ocean)] hover:underline font-semibold">
                Sign up free
              </Link>
            </p>
            <Link href="/forgot-password" className="text-sm text-center text-muted-foreground hover:underline font-medium w-full">
              Forgot your password?
            </Link>
          </CardFooter>
        </Card>
      </FadeIn>
    </div>
  );
}
