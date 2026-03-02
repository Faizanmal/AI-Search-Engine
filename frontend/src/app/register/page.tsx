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
import { FadeIn, ScaleIn, FloatingElement, StaggerContainer, StaggerItem } from "@/components/animations";
import { Sparkles, User, Mail, Lock, Check, Loader2, Shield } from "lucide-react";
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
      
      // Store tokens and user in Zustand store
      setAuth(user, tokens.access, tokens.refresh);
      
      // Also store in localStorage as backup for API client
      localStorage.setItem("access_token", tokens.access);
      localStorage.setItem("refresh_token", tokens.refresh);
      
      toast.success(`Welcome aboard, ${user.first_name || user.username}!`, {
        description: "Your account has been created successfully.",
      });
      router.push("/dashboard");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { email?: string[]; username?: string[]; password?: string[] } } };
      const errorMsg = err.response?.data?.email?.[0] || 
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
    <div className="min-h-screen flex items-center justify-center p-6 overflow-hidden relative">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-slate-950 dark:via-purple-950 dark:to-blue-950">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
      </div>

      {/* Floating background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            y: [0, -40, 0],
            x: [0, 30, 0],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-10 right-20 w-64 h-64 bg-purple-400 dark:bg-purple-700 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20"
        />
        <motion.div
          animate={{
            y: [0, 50, 0],
            x: [0, -40, 0],
          }}
          transition={{
            duration: 11,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute bottom-10 left-20 w-80 h-80 bg-pink-400 dark:bg-pink-700 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20"
        />
      </div>

      <FadeIn delay={0.1} className="relative z-10 w-full max-w-lg">
        <Card className="glass border-white/30 shadow-2xl">
          <CardHeader className="text-center space-y-6 pb-6">
            <ScaleIn delay={0.2}>
              <FloatingElement yOffset={10} duration={2}>
                <div className="mx-auto w-20 h-20 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-2xl">
                  <Sparkles className="h-10 w-10 text-white" />
                </div>
              </FloatingElement>
            </ScaleIn>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <CardTitle className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Create Account
              </CardTitle>
              <CardDescription className="text-base mt-3 text-muted-foreground">
                Join us and start building smart forms today
              </CardDescription>
            </motion.div>
          </CardHeader>

          <CardContent className="px-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <StaggerContainer staggerDelay={0.05}>
                <StaggerItem>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label htmlFor="first_name" className="text-sm font-semibold flex items-center gap-2">
                        <User className="w-4 h-4 text-purple-600" />
                        First Name
                      </Label>
                      <Input
                        id="first_name"
                        type="text"
                        placeholder="John"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        disabled={loading}
                        className="h-11 transition-all focus:scale-[1.01] focus:shadow-lg border-2"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="last_name" className="text-sm font-semibold">
                        Last Name
                      </Label>
                      <Input
                        id="last_name"
                        type="text"
                        placeholder="Doe"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        disabled={loading}
                        className="h-11 transition-all focus:scale-[1.01] focus:shadow-lg border-2"
                      />
                    </div>
                  </div>
                </StaggerItem>

                <StaggerItem>
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-sm font-semibold flex items-center gap-2">
                      <Mail className="w-4 h-4 text-purple-600" />
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      disabled={loading}
                      className="h-11 transition-all focus:scale-[1.01] focus:shadow-lg border-2"
                    />
                  </div>
                </StaggerItem>

                <StaggerItem>
                  <div className="space-y-3">
                    <Label htmlFor="username" className="text-sm font-semibold flex items-center gap-2">
                      <User className="w-4 h-4 text-purple-600" />
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
                      className="h-11 transition-all focus:scale-[1.01] focus:shadow-lg border-2"
                    />
                  </div>
                </StaggerItem>

                <StaggerItem>
                  <div className="space-y-3">
                    <Label htmlFor="password" className="text-sm font-semibold flex items-center gap-2">
                      <Lock className="w-4 h-4 text-purple-600" />
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
                      className="h-11 transition-all focus:scale-[1.01] focus:shadow-lg border-2"
                    />
                    {formData.password && (
                      <div className="space-y-2">
                        <div className="flex gap-1.5">
                          {[...Array(5)].map((_, i) => (
                            <motion.div
                              key={i}
                              initial={{ scaleX: 0 }}
                              animate={{ scaleX: i < passwordStrength ? 1 : 0 }}
                              transition={{ duration: 0.3, delay: i * 0.05 }}
                              className={`h-1.5 flex-1 rounded-full ${
                                i < passwordStrength
                                  ? passwordStrength <= 2
                                    ? "bg-red-500"
                                    : passwordStrength <= 3
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                                  : "bg-gray-200 dark:bg-gray-700"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-xs font-medium text-muted-foreground">
                          {passwordStrength <= 2 && "Weak password"}
                          {passwordStrength === 3 && "Medium password"}
                          {passwordStrength === 4 && "Strong password"}
                          {passwordStrength === 5 && "Very strong password"}
                        </p>
                      </div>
                    )}
                  </div>
                </StaggerItem>

                <StaggerItem>
                  <div className="space-y-3">
                    <Label htmlFor="password2" className="text-sm font-semibold flex items-center gap-2">
                      <Shield className="w-4 h-4 text-purple-600" />
                      Confirm Password
                    </Label>
                    <Input
                      id="password2"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password2}
                      onChange={(e) => setFormData({ ...formData, password2: e.target.value })}
                      required
                      disabled={loading}
                      className="h-11 transition-all focus:scale-[1.01] focus:shadow-lg border-2"
                    />
                    {formData.password2 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 text-xs"
                      >
                        {formData.password === formData.password2 ? (
                          <>
                            <Check className="w-3 h-3 text-green-500" />
                            <span className="text-green-600 dark:text-green-400">Passwords match</span>
                          </>
                        ) : (
                          <span className="text-red-600 dark:text-red-400">Passwords don&apos;t match</span>
                        )}
                      </motion.div>
                    )}
                  </div>
                </StaggerItem>

                <StaggerItem>
                  <div className="pt-2">
                    <Button 
                      type="submit" 
                      className="w-full h-12 btn-gradient-secondary text-base font-semibold rounded-xl transform hover:scale-[1.02]" 
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
                          Create Account
                        </>
                      )}
                    </Button>
                  </div>
                </StaggerItem>
              </StaggerContainer>
            </form>
          </CardContent>

          <CardFooter className="flex justify-center px-8 pb-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="text-sm text-center text-muted-foreground"
            >
              Already have an account?{" "}
              <Link href="/login" className="text-purple-600 dark:text-purple-400 hover:underline font-semibold">
                Sign in
              </Link>
            </motion.div>
          </CardFooter>
        </Card>
      </FadeIn>
    </div>
  );
}