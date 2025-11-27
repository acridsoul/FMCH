'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Film, ArrowLeft, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();

      // Get the current origin for the redirect URL
      const redirectTo = `${window.location.origin}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) {
        console.error('❌ Password reset error:', error);
        setError(error.message);
        setLoading(false);
      } else {
        console.log('✅ Password reset email sent successfully');
        setSuccess(true);
        setLoading(false);
      }
    } catch (err) {
      console.error('❌ Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel - Branded Marketing Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-background border-r border-border p-12 flex-col justify-between">
        {/* Content */}
        <div className="flex flex-col items-center justify-center flex-1">
          {/* Logo/Brand */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Film className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-foreground">Film Production Command Hub</span>
          </div>

          {/* Illustration */}
          <div className="w-full max-w-md mb-12">
            <Image
              src="/illustrations/login.svg"
              alt="Forgot password illustration"
              width={500}
              height={400}
              priority
              className="w-full h-auto"
            />
          </div>

          {/* Main Content */}
          <div className="space-y-4 max-w-md text-center">
            <h1 className="text-3xl md:text-4xl font-bold leading-tight text-foreground">
              Reset your password securely.
            </h1>
            <p className="text-lg text-muted-foreground">
              Enter your email address and we&apos;ll send you instructions to reset your password.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>Copyright © 2025 Film Production Command Hub</p>
          <Link href="#" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
        </div>
      </div>

      {/* Right Panel - Reset Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Film className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold">FPCH</span>
          </div>

          {/* Back to Login Link */}
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>

          {success ? (
            /* Success Message */
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
                  <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h1 className="text-3xl font-bold">Check Your Email</h1>
                <p className="text-muted-foreground">
                  We&apos;ve sent password reset instructions to <strong>{email}</strong>
                </p>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Next steps:</strong>
                </p>
                <ol className="mt-2 ml-4 text-sm text-blue-800 dark:text-blue-200 list-decimal space-y-1">
                  <li>Check your email inbox (and spam folder)</li>
                  <li>Click the reset password link in the email</li>
                  <li>Enter your new password</li>
                  <li>Log in with your new credentials</li>
                </ol>
              </div>

              <button
                onClick={() => {
                  setSuccess(false);
                  setEmail('');
                }}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
              >
                Send Another Email
              </button>

              <div className="text-center text-sm">
                <span className="text-muted-foreground">Didn&apos;t receive the email? </span>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-500 dark:hover:text-blue-400 font-medium transition-colors disabled:opacity-50"
                >
                  Resend
                </button>
              </div>
            </div>
          ) : (
            /* Reset Form */
            <>
              {/* Header */}
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold">Forgot Your Password?</h1>
                <p className="text-muted-foreground">
                  No worries! Enter your email address and we&apos;ll send you a link to reset your password.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@company.com"
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the email address associated with your account
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg">
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              {/* Additional Links */}
              <div className="text-center text-sm">
                <span className="text-muted-foreground">Remember your password? </span>
                <Link
                  href="/login"
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-500 dark:hover:text-blue-400 font-medium transition-colors"
                >
                  Log In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
