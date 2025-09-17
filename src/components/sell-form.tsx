'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';
import React from 'react';

const sellFormSchema = z.object({
  accountName: z.string().min(2, {
    message: 'Account name must be at least 2 characters.',
  }),
  game: z.string({
    required_error: 'Please select a game.',
  }),
  rank: z.string().min(2, 'Rank is required.'),
  price: z.coerce.number().positive('Price must be a positive number.'),
  description: z.string().max(500, 'Description can be at most 500 characters.').optional(),
  image: z.any().optional(), // In a real app, this would be more robust.
});

const games = [
  'Apex Legends',
  'League of Legends',
  'Valorant',
  'Star Citizen',
  'Counter-Strike 2',
  'Overwatch 2',
  'Fortnite',
];

export function SellForm() {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof sellFormSchema>>({
    resolver: zodResolver(sellFormSchema),
    defaultValues: {
      accountName: '',
      rank: '',
      description: '',
    },
  });

  const [fileName, setFileName] = React.useState('');

  function onSubmit(values: z.infer<typeof sellFormSchema>) {
    // In a real application, you would handle the form submission,
    // e.g., send data to your server, upload the image, etc.
    console.log(values);
    toast({
      title: 'Listing Submitted!',
      description: 'Your account will be reviewed and listed shortly.',
    });
    form.reset();
    setFileName('');
  }

  return (
    <div className="w-full max-w-2xl mx-auto holographic-border bg-card/50 backdrop-blur-sm p-8 rounded-lg">
      <h2 className="text-3xl font-headline font-bold text-glow text-center mb-8">List Your Account</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="accountName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-primary">Account Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., DragonSlayerX" {...field} className="bg-input/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="game"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-primary">Game</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-input/50">
                        <SelectValue placeholder="Select a game" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {games.map((game) => (
                        <SelectItem key={game} value={game}>
                          {game}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="rank"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-primary">Rank / Level</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Radiant, Apex Predator" {...field} className="bg-input/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-primary">Price (USD)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="e.g., 499.99" {...field} className="bg-input/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="image"
            render={({ field: { onChange, value, ...rest }}) => (
              <FormItem>
                <FormLabel className="text-primary">Account Screenshot</FormLabel>
                <FormControl>
                    <div className="relative">
                        <Input 
                            type="file" 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                onChange(file);
                                setFileName(file?.name || '');
                            }}
                            {...rest}
                         />
                        <div className="flex items-center justify-center w-full h-24 border-2 border-dashed border-input rounded-md bg-input/20 hover:bg-input/40 transition-colors">
                           <div className="text-center">
                            <Upload className="mx-auto h-8 w-8 text-muted-foreground"/>
                            <p className="mt-1 text-sm text-muted-foreground">{fileName || 'Click or drag file to upload'}</p>
                           </div>
                        </div>
                    </div>
                </FormControl>
                <FormDescription>
                    A screenshot of the account's rank, skins, or other assets.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-primary">Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe rare skins, completion stats, etc."
                    className="resize-none bg-input/50"
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" size="lg" className="w-full text-lg font-bold rounded-full button-glow transition-all duration-300 hover:button-glow-hover">
            List Account for Sale
          </Button>
        </form>
      </Form>
    </div>
  );
}
