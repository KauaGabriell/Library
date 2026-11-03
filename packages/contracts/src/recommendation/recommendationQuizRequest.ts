import { z } from "zod";

export const recommendationGenreOptions = [
  "FANTASY",
  "SCIENCE_FICTION",
  "ROMANCE",
  "MYSTERY_SUSPENSE",
  "HORROR",
  "HISTORICAL_FICTION",
  "CONTEMPORARY_LITERATURE",
  "BIOGRAPHY_MEMOIR",
  "POPULAR_SCIENCE",
  "PERSONAL_DEVELOPMENT",
  "OTHER",
  "NO_PREFERENCE",
] as const;

export const recommendationGoalOptions = [
  "RELAX",
  "FEEL_MOVED",
  "LEARN",
  "REFLECT",
  "HAVE_FUN",
  "BREAK_ROUTINE",
  "NO_PREFERENCE",
] as const;

export const recommendationBookLengthOptions = [
  "SHORT",
  "MEDIUM",
  "LONG",
  "NO_PREFERENCE",
] as const;

export const recommendationPaceOptions = [
  "FAST",
  "BALANCED",
  "CONTEMPLATIVE",
  "NO_PREFERENCE",
] as const;

export const recommendationMoodOptions = [
  "LIGHT",
  "COZY",
  "HUMOROUS",
  "INSPIRING",
  "EMOTIONAL",
  "DARK",
  "TENSE",
  "NO_PREFERENCE",
] as const;

export const recommendationThemeOptions = [
  "HUMAN_RELATIONSHIPS",
  "ADVENTURE",
  "INVESTIGATION",
  "HISTORY",
  "SCIENCE_TECHNOLOGY",
  "NATURE",
  "SOCIAL_ISSUES",
  "SELF_KNOWLEDGE",
  "MAGIC",
  "NO_PREFERENCE",
] as const;

export const recommendationAvoidOptions = [
  "EXPLICIT_VIOLENCE",
  "HORROR",
  "EXPLICIT_SEXUAL_SCENES",
  "SAD_ENDINGS",
  "HEAVY_TOPICS",
  "SERIES",
  "NONE",
] as const;

function multipleChoiceSchema<
  const Options extends readonly [string, ...string[]],
>(options: Options, maximum: number, exclusiveOption: Options[number]) {
  return z
    .array(z.enum(options))
    .min(1)
    .max(maximum)
    .refine((values) => new Set(values).size === values.length, {
      message: "Não repita opções.",
    })
    .refine(
      (values) => !values.includes(exclusiveOption) || values.length === 1,
      { message: "Essa opção deve ser escolhida sozinha." },
    );
}

export const recommendationQuizRequestSchema = z
  // All seven quiz answers are required. Extra context is optional and does
  // not count as an answer.
  .object({
    genres: multipleChoiceSchema(
      recommendationGenreOptions,
      3,
      "NO_PREFERENCE",
    ),
    goal: z.enum(recommendationGoalOptions),
    bookLength: z.enum(recommendationBookLengthOptions),
    pace: z.enum(recommendationPaceOptions),
    moods: multipleChoiceSchema(recommendationMoodOptions, 2, "NO_PREFERENCE"),
    themes: multipleChoiceSchema(
      recommendationThemeOptions,
      3,
      "NO_PREFERENCE",
    ),
    avoid: multipleChoiceSchema(recommendationAvoidOptions, 6, "NONE"),
    additionalContext: z.string().trim().max(500).optional(),
  })
  .strict();

export type RecommendationQuizRequest = z.infer<
  typeof recommendationQuizRequestSchema
>;
