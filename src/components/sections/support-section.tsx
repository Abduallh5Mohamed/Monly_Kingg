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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Send } from 'lucide-react';

const supportFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
  message: z.string().min(10, {
    message: 'Message must be at least 10 characters.',
  }).max(500, 'Message can be at most 500 characters.'),
});

export function SupportSection() {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof supportFormSchema>>({
    resolver: zodResolver(supportFormSchema),
    defaultValues: {
      name: '',
      email: '',
      message: '',
    },
  });

  function onSubmit(values: z.infer<typeof supportFormSchema>) {
    console.log(values);
    toast({
      title: 'Message Sent!',
      description: 'Our support team will get back to you shortly.',
      variant: 'default',
    });
    form.reset();
  }

  return (
    <section id="support" className="py-24 sm:py-32 bg-background/90 relative">
        <div 
            className="absolute inset-0 bg-gradient-to-b from-background to-transparent"
        />
       <div className="container mx-auto px-4 relative z-10">
        <div className="w-full max-w-3xl mx-auto holographic-border bg-card/50 backdrop-blur-sm p-8 md:p-12 rounded-lg">
          <div className="text-center mb-8">
            <h2 className="text-4xl md:text-5xl font-headline font-bold text-white text-glow uppercase">
              // Have a problem?
            </h2>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Our support team is always on standby, ready to assist you 24/7. Let us know how we can help.
            </p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-primary font-semibold">Your Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} className="bg-input/30 focus:bg-input/50 transition-colors" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-primary font-semibold">Your Email</FormLabel>
                      <FormControl>
                        <Input placeholder="you@example.com" {...field} className="bg-input/30 focus:bg-input/50 transition-colors" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-primary font-semibold">Your Message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Please describe your issue in detail..."
                        className="resize-none bg-input/30 focus:bg-input/50 transition-colors"
                        rows={5}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" size="lg" className="w-full text-lg font-bold rounded-full button-glow transition-all duration-300 hover:button-glow-hover hover:scale-105 active:scale-100">
                Send Message
                <Send className="ml-2 h-5 w-5" />
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </section>
  );
}
