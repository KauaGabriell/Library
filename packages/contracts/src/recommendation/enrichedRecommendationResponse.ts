import { z } from "zod";
import { bookSearchItemSchema } from "../book/bookSearch.js";
import { bookRecommendationSchema } from "./recommendationQuizResponse.js";

export const enrichedRecommendationSchema = z
  .object({
    book: bookSearchItemSchema.strict(),
    justification: bookRecommendationSchema.shape.justification,
  })
  .strict();

export const enrichedRecommendationResponseSchema = z
  .object({
    recommendations: z
      .array(enrichedRecommendationSchema)
      .length(3)
      .refine(
        (recommendations) =>
          new Set(recommendations.map(({ book }) => book.googleBooksId))
            .size === recommendations.length,
        { message: "As recomendações devem conter livros distintos." },
      ),
  })
  .strict();

export type EnrichedRecommendation = z.infer<
  typeof enrichedRecommendationSchema
>;
export type EnrichedRecommendationResponse = z.infer<
  typeof enrichedRecommendationResponseSchema
>;
