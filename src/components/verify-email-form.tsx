'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

const verifyEmailFormSchema = z.object({
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
  code: z.string().min(6, {
    message: 'Verification code must be at least 6 characters.',
  }),
});

export function VerifyEmailForm() {
  const { verifyEmail, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get('email');

  const form = useForm<z.infer<typeof verifyEmailFormSchema>>({
    resolver: zodResolver(verifyEmailFormSchema),
    defaultValues: {
      email: emailFromQuery || '',
      code: '',
    },
  });

  useEffect(() => {
    if (emailFromQuery) {
      form.setValue('email', emailFromQuery);
    }
  }, [emailFromQuery, form]);

  async function onSubmit(values: z.infer<typeof verifyEmailFormSchema>) {
    try {
      setIsSubmitting(true);
      await verifyEmail(values.email, values.code);
      // إذا نجح التحقق، سيتم التوجيه تلقائياً من AuthContext
    } catch (error) {
      console.error('Verification error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto holographic-border bg-card/50 backdrop-blur-sm p-8 rounded-lg">
      <h2 className="text-3xl font-headline font-bold text-glow text-center mb-8">Verify Your Email</h2>
      <p className="text-center text-sm text-muted-foreground mb-6">
        Please enter the verification code sent to your email address.
      </p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-primary">Email</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="you@example.com" 
                    {...field} 
                    className="bg-input/50"
                    disabled={isSubmitting || loading || !!emailFromQuery}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-primary">Verification Code</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="123456" 
                    {...field} 
                    className="bg-input/50"
                    disabled={isSubmitting || loading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button 
            type="submit" 
            size="lg" 
            className="w-full text-lg font-bold rounded-full button-glow transition-all duration-300 hover:button-glow-hover"
            disabled={isSubmitting || loading}
          >
            {isSubmitting ? 'Verifying...' : 'Verify Email'}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-6">
          Didn't receive the code?{' '}
          <Link href="/resend-code" className="text-primary hover:underline">
            Resend code
          </Link>
        </p>
      </Form>
    </div>
  );
}