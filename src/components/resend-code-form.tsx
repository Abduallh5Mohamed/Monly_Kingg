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
import { useState } from 'react';

const resendCodeFormSchema = z.object({
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
  password: z.string().min(8, {
    message: 'Password must be at least 8 characters.',
  }),
});

export function ResendCodeForm() {
  const { resendCode, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof resendCodeFormSchema>>({
    resolver: zodResolver(resendCodeFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof resendCodeFormSchema>) {
    try {
      setIsSubmitting(true);
      const success = await resendCode(values.email, values.password);
      
      if (success) {
        form.reset();
        // يمكن إضافة navigation إلى verify-email هنا إذا أردت
      }
    } catch (error) {
      console.error('Resend code error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto holographic-border bg-card/50 backdrop-blur-sm p-8 rounded-lg">
      <h2 className="text-3xl font-headline font-bold text-glow text-center mb-8">Resend Verification Code</h2>
      <p className="text-center text-sm text-muted-foreground mb-6">
        Please enter your email and password to receive a new verification code.
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
                    disabled={isSubmitting || loading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-primary">Password</FormLabel>
                <FormControl>
                  <Input 
                    type="password" 
                    placeholder="********" 
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
            {isSubmitting ? 'Sending...' : 'Resend Code'}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-6">
          Back to{' '}
          <Link href="/verify-email" className="text-primary hover:underline">
            Verify Email
          </Link>
          {' '}or{' '}
          <Link href="/login" className="text-primary hover:underline">
            Login
          </Link>
        </p>
      </Form>
    </div>
  );
}