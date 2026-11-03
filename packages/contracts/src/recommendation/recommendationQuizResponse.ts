import { z } from "zod";

const nonBlankTextSchema = z
  .string()
  .refine((value) => value.trim().length > 0, {
    message: "O texto não pode estar vazio.",
  });

export const bookRecommendationSchema = z
  .object({
    title: nonBlankTextSchema,
    author: nonBlankTextSchema,
    justification: nonBlankTextSchema,
  })
  .strict();

function normalizeIdentityPart(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export const recommendationQuizResponseSchema = z
  .object({
    recommendations: z
      .array(bookRecommendationSchema)
      .length(3)
      .refine(
        (recommendations) => {
          const identities = recommendations.map(({ title, author }) =>
            JSON.stringify([
              normalizeIdentityPart(title),
              normalizeIdentityPart(author),
            ]),
          );

          return new Set(identities).size === identities.length;
        },
        { message: "As recomendações devem ser distintas." },
      ),
  })
  .strict();

export type BookRecommendation = z.infer<typeof bookRecommendationSchema>;
export type RecommendationQuizResponse = z.infer<
  typeof recommendationQuizResponseSchema
>;
