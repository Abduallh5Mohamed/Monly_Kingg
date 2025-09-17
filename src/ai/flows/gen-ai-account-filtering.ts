'use server';
/**
 * @fileOverview Implements a Genkit flow for filtering gaming accounts based on user criteria.
 *
 * - filterAccounts - A function that filters accounts based on game, rank, and other criteria using a generative AI tool.
 * - FilterAccountsInput - The input type for the filterAccounts function.
 * - FilterAccountsOutput - The return type for the filterAccounts function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FilterAccountsInputSchema = z.object({
  criteria: z
    .string()
    .describe('The criteria to filter accounts by, such as game, rank, and other preferences.'),
});
export type FilterAccountsInput = z.infer<typeof FilterAccountsInputSchema>;

const FilterAccountsOutputSchema = z.object({
  filteredAccounts: z
    .string()
    .describe(
      'A list of filtered accounts that match the specified criteria, as a JSON array of account objects.'
    ),
});
export type FilterAccountsOutput = z.infer<typeof FilterAccountsOutputSchema>;

export async function filterAccounts(input: FilterAccountsInput): Promise<FilterAccountsOutput> {
  return filterAccountsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'filterAccountsPrompt',
  input: {schema: FilterAccountsInputSchema},
  output: {schema: FilterAccountsOutputSchema},
  prompt: `You are an expert gaming account filter. A user will provide
filtering criteria and you will return a JSON array of accounts that match the
criteria. Criteria: {{{criteria}}}. Return a JSON array of accounts that match the
criteria. If no accounts match, return an empty array.`,
});

const filterAccountsFlow = ai.defineFlow(
  {
    name: 'filterAccountsFlow',
    inputSchema: FilterAccountsInputSchema,
    outputSchema: FilterAccountsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
