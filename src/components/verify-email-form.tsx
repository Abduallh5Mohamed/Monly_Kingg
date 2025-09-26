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
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

const verifyEmailFormSchema = z.object({
  code: z.string().length(6, {
    message: 'Verification code must be 6 digits.',
  }),
});

export function VerifyEmailForm() {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof verifyEmailFormSchema>>({
    resolver: zodResolver(verifyEmailFormSchema),
    defaultValues: {
      code: '',
    },
  });

  function onSubmit(values: z.infer<typeof verifyEmailFormSchema>) {
    console.log(values);
    toast({
      title: 'Email Verified!',
      description: 'Your account is now active. You can log in.',
    });
    form.reset();
    window.location.href = '/login';
  }

  return (
    <div className="w-full max-w-md mx-auto holographic-border bg-card/50 backdrop-blur-sm p-8 rounded-lg">
      <h2 className="text-3xl font-headline font-bold text-glow text-center mb-4">Verify Your Email</h2>
      <p className="text-center text-muted-foreground mb-8">
        We've sent a 6-digit code to your email. Please enter it below.
      </p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-primary">Verification Code</FormLabel>
                <FormControl>
                  <Input placeholder="123456" {...field} className="bg-input/50 text-center text-2xl tracking-[1.5rem]" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" size="lg" className="w-full text-lg font-bold rounded-full button-glow transition-all duration-300 hover:button-glow-hover">
            Verify
          </Button>
        </form>
         <p className="text-center text-sm text-muted-foreground mt-6">
          Didn't receive a code?{' '}
          <Link href="/resend-code" className="text-primary hover:underline">
            Resend code
          </Link>
        </p>
      </Form>
    </div>
  );
}
