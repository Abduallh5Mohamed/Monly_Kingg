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

const resendCodeFormSchema = z.object({
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
});

export function ResendCodeForm() {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof resendCodeFormSchema>>({
    resolver: zodResolver(resendCodeFormSchema),
    defaultValues: {
      email: '',
    },
  });

  function onSubmit(values: z.infer<typeof resendCodeFormSchema>) {
    console.log(values);
    toast({
      title: 'Code Sent!',
      description: 'A new verification code has been sent to your email.',
    });
    form.reset();
    window.location.href = '/verify-email';
  }

  return (
    <div className="w-full max-w-md mx-auto holographic-border bg-card/50 backdrop-blur-sm p-8 rounded-lg">
      <h2 className="text-3xl font-headline font-bold text-glow text-center mb-4">Resend Verification Code</h2>
       <p className="text-center text-muted-foreground mb-8">
        Enter your email to receive a new verification code.
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
                  <Input placeholder="you@example.com" {...field} className="bg-input/50" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" size="lg" className="w-full text-lg font-bold rounded-full button-glow transition-all duration-300 hover:button-glow-hover">
            Resend Code
          </Button>
        </form>
         <p className="text-center text-sm text-muted-foreground mt-6">
          Remembered your code?{' '}
          <Link href="/verify-email" className="text-primary hover:underline">
            Back to verification
          </Link>
        </p>
      </Form>
    </div>
  );
}
