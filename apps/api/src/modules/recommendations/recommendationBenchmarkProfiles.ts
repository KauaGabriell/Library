import type { RecommendationQuizRequest } from "@library/contracts";

export type RecommendationBenchmarkProfile = Readonly<{
  id: string;
  answers: RecommendationQuizRequest;
}>;

export const recommendationBenchmarkProfiles: readonly RecommendationBenchmarkProfile[] =
  [
    {
      id: "science-reflection",
      answers: {
        genres: ["SCIENCE_FICTION"],
        goal: "REFLECT",
        bookLength: "MEDIUM",
        pace: "CONTEMPLATIVE",
        moods: ["INSPIRING"],
        themes: ["SCIENCE_TECHNOLOGY", "HUMAN_RELATIONSHIPS"],
        avoid: ["EXPLICIT_VIOLENCE"],
        additionalContext: "Prefiro histórias que provoquem reflexão.",
      },
    },
    {
      id: "cozy-fantasy",
      answers: {
        genres: ["FANTASY", "ROMANCE"],
        goal: "RELAX",
        bookLength: "SHORT",
        pace: "BALANCED",
        moods: ["COZY", "LIGHT"],
        themes: ["MAGIC", "NATURE"],
        avoid: ["HORROR", "HEAVY_TOPICS"],
      },
    },
    {
      id: "fast-mystery",
      answers: {
        genres: ["MYSTERY_SUSPENSE"],
        goal: "HAVE_FUN",
        bookLength: "SHORT",
        pace: "FAST",
        moods: ["HUMOROUS", "TENSE"],
        themes: ["INVESTIGATION", "ADVENTURE"],
        avoid: ["SERIES"],
      },
    },
    {
      id: "historical-learning",
      answers: {
        genres: ["HISTORICAL_FICTION", "BIOGRAPHY_MEMOIR"],
        goal: "LEARN",
        bookLength: "LONG",
        pace: "BALANCED",
        moods: ["INSPIRING", "EMOTIONAL"],
        themes: ["HISTORY", "SOCIAL_ISSUES"],
        avoid: ["SAD_ENDINGS"],
      },
    },
    {
      id: "popular-science",
      answers: {
        genres: ["POPULAR_SCIENCE"],
        goal: "LEARN",
        bookLength: "MEDIUM",
        pace: "CONTEMPLATIVE",
        moods: ["INSPIRING"],
        themes: ["SCIENCE_TECHNOLOGY", "NATURE"],
        avoid: ["NONE"],
      },
    },
    {
      id: "emotional-contemporary",
      answers: {
        genres: ["CONTEMPORARY_LITERATURE", "ROMANCE"],
        goal: "FEEL_MOVED",
        bookLength: "MEDIUM",
        pace: "BALANCED",
        moods: ["EMOTIONAL"],
        themes: ["HUMAN_RELATIONSHIPS", "SELF_KNOWLEDGE"],
        avoid: ["EXPLICIT_SEXUAL_SCENES"],
      },
    },
    {
      id: "adventure-break-routine",
      answers: {
        genres: ["FANTASY", "MYSTERY_SUSPENSE"],
        goal: "BREAK_ROUTINE",
        bookLength: "LONG",
        pace: "FAST",
        moods: ["DARK", "TENSE"],
        themes: ["ADVENTURE", "INVESTIGATION"],
        avoid: ["EXPLICIT_VIOLENCE", "HEAVY_TOPICS"],
      },
    },
    {
      id: "no-preference-fun",
      answers: {
        genres: ["NO_PREFERENCE"],
        goal: "HAVE_FUN",
        bookLength: "NO_PREFERENCE",
        pace: "NO_PREFERENCE",
        moods: ["HUMOROUS"],
        themes: ["SOCIAL_ISSUES"],
        avoid: ["NONE"],
      },
    },
  ];
