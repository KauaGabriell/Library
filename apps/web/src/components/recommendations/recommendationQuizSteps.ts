import {
  type RecommendationQuizRequest,
  recommendationAvoidOptions,
  recommendationBookLengthOptions,
  recommendationGenreOptions,
  recommendationGoalOptions,
  recommendationMoodOptions,
  recommendationPaceOptions,
  recommendationThemeOptions,
} from "@library/contracts";

export type QuizField = Exclude<
  keyof RecommendationQuizRequest,
  "additionalContext"
>;
export type MultipleChoiceField = "genres" | "moods" | "themes" | "avoid";
export type SingleChoiceField = Exclude<QuizField, MultipleChoiceField>;

type QuizOption<Value extends string> = {
  value: Value;
  label: string;
};

export type QuizOptionValue<Field extends QuizField> =
  Field extends MultipleChoiceField
    ? RecommendationQuizRequest[Field] extends readonly (infer Option)[]
      ? Option
      : never
    : RecommendationQuizRequest[Field] & string;

export type MultipleChoiceStep<Field extends MultipleChoiceField> = {
  field: Field;
  title: string;
  question: string;
  selectionMode: "multiple";
  options: readonly QuizOption<QuizOptionValue<Field>>[];
  maxSelections: number;
  exclusiveOption: QuizOptionValue<Field>;
};

export type SingleChoiceStep<Field extends SingleChoiceField> = {
  field: Field;
  title: string;
  question: string;
  selectionMode: "single";
  options: readonly QuizOption<QuizOptionValue<Field>>[];
  maxSelections: 1;
};

export type RecommendationQuizStep =
  | MultipleChoiceStep<"genres">
  | MultipleChoiceStep<"moods">
  | MultipleChoiceStep<"themes">
  | MultipleChoiceStep<"avoid">
  | SingleChoiceStep<"goal">
  | SingleChoiceStep<"bookLength">
  | SingleChoiceStep<"pace">;

function createOptions<const Options extends readonly string[]>(
  values: Options,
  labels: Record<Options[number], string>,
): readonly QuizOption<Options[number]>[] {
  return values.map((value) => ({
    value,
    label: labels[value as Options[number]],
  }));
}

const genreOptions = createOptions(recommendationGenreOptions, {
  FANTASY: "Fantasia",
  SCIENCE_FICTION: "Ficção científica",
  ROMANCE: "Romance",
  MYSTERY_SUSPENSE: "Mistério e suspense",
  HORROR: "Terror",
  HISTORICAL_FICTION: "Ficção histórica",
  CONTEMPORARY_LITERATURE: "Literatura contemporânea",
  BIOGRAPHY_MEMOIR: "Biografia e memórias",
  POPULAR_SCIENCE: "Divulgação científica",
  PERSONAL_DEVELOPMENT: "Desenvolvimento pessoal",
  OTHER: "Outro",
  NO_PREFERENCE: "Sem preferência",
});

const goalOptions = createOptions(recommendationGoalOptions, {
  RELAX: "Relaxar",
  FEEL_MOVED: "Emocionar-me",
  LEARN: "Aprender",
  REFLECT: "Refletir",
  HAVE_FUN: "Divertir-me",
  BREAK_ROUTINE: "Sair da rotina",
  NO_PREFERENCE: "Sem preferência",
});

const bookLengthOptions = createOptions(recommendationBookLengthOptions, {
  SHORT: "Curto",
  MEDIUM: "Médio",
  LONG: "Longo",
  NO_PREFERENCE: "Sem preferência",
});

const paceOptions = createOptions(recommendationPaceOptions, {
  FAST: "Ágil",
  BALANCED: "Equilibrado",
  CONTEMPLATIVE: "Contemplativo",
  NO_PREFERENCE: "Sem preferência",
});

const moodOptions = createOptions(recommendationMoodOptions, {
  LIGHT: "Leve",
  COZY: "Aconchegante",
  HUMOROUS: "Bem-humorado",
  INSPIRING: "Inspirador",
  EMOTIONAL: "Emocionante",
  DARK: "Sombrio",
  TENSE: "Tenso",
  NO_PREFERENCE: "Sem preferência",
});

const themeOptions = createOptions(recommendationThemeOptions, {
  HUMAN_RELATIONSHIPS: "Relações humanas",
  ADVENTURE: "Aventura",
  INVESTIGATION: "Investigação",
  HISTORY: "História",
  SCIENCE_TECHNOLOGY: "Ciência e tecnologia",
  NATURE: "Natureza",
  SOCIAL_ISSUES: "Questões sociais",
  SELF_KNOWLEDGE: "Autoconhecimento",
  MAGIC: "Magia",
  NO_PREFERENCE: "Sem preferência",
});

const avoidOptions = createOptions(recommendationAvoidOptions, {
  EXPLICIT_VIOLENCE: "Violência explícita",
  HORROR: "Terror",
  EXPLICIT_SEXUAL_SCENES: "Cenas sexuais explícitas",
  SAD_ENDINGS: "Finais tristes",
  HEAVY_TOPICS: "Temas pesados",
  SERIES: "Séries",
  NONE: "Nada específico",
});

export const recommendationQuizSteps = [
  {
    field: "genres",
    title: "Gêneros",
    question: "Quais gêneros você gostaria de ler?",
    selectionMode: "multiple",
    options: genreOptions,
    maxSelections: 3,
    exclusiveOption: "NO_PREFERENCE",
  },
  {
    field: "goal",
    title: "Objetivo",
    question: "O que você busca nesta leitura?",
    selectionMode: "single",
    options: goalOptions,
    maxSelections: 1,
  },
  {
    field: "bookLength",
    title: "Tamanho",
    question: "Qual tamanho de livro combina com seu momento?",
    selectionMode: "single",
    options: bookLengthOptions,
    maxSelections: 1,
  },
  {
    field: "pace",
    title: "Ritmo",
    question: "Que ritmo de leitura você prefere?",
    selectionMode: "single",
    options: paceOptions,
    maxSelections: 1,
  },
  {
    field: "moods",
    title: "Humor",
    question: "Que atmosfera você quer encontrar no livro?",
    selectionMode: "multiple",
    options: moodOptions,
    maxSelections: 2,
    exclusiveOption: "NO_PREFERENCE",
  },
  {
    field: "themes",
    title: "Temas",
    question: "Quais assuntos despertam seu interesse?",
    selectionMode: "multiple",
    options: themeOptions,
    maxSelections: 3,
    exclusiveOption: "NO_PREFERENCE",
  },
  {
    field: "avoid",
    title: "Restrições",
    question: "Há algo que você prefere evitar?",
    selectionMode: "multiple",
    options: avoidOptions,
    maxSelections: 6,
    exclusiveOption: "NONE",
  },
] as const satisfies readonly RecommendationQuizStep[];
