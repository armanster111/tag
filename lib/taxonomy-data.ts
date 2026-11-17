export type TaxonomyCategory =
  | "creative"
  | "sports"
  | "tech"
  | "music"
  | "food"
  | "outdoors"
  | "games"
  | "learning";

export type TaxonomyTag = {
  slug: string;
  label: string;
  category: TaxonomyCategory;
};

export type TaxonomySubtag = {
  slug: string;
  parent_slug: string;
  label: string;
};

/** Curated starter taxonomy — profiles may only attach approved slugs. */
export const TAXONOMY: TaxonomyTag[] = [
  { slug: "photography", label: "Photography", category: "creative" },
  { slug: "pottery", label: "Pottery", category: "creative" },
  { slug: "drawing", label: "Drawing", category: "creative" },
  { slug: "painting", label: "Painting", category: "creative" },
  { slug: "writing", label: "Writing", category: "creative" },
  { slug: "film-making", label: "Film making", category: "creative" },
  { slug: "graphic-design", label: "Graphic design", category: "creative" },
  { slug: "climbing", label: "Climbing", category: "sports" },
  { slug: "running", label: "Running", category: "sports" },
  { slug: "cycling", label: "Cycling", category: "sports" },
  { slug: "basketball", label: "Basketball", category: "sports" },
  { slug: "soccer", label: "Soccer", category: "sports" },
  { slug: "yoga", label: "Yoga", category: "sports" },
  { slug: "swimming", label: "Swimming", category: "sports" },
  { slug: "programming", label: "Programming", category: "tech" },
  { slug: "web-dev", label: "Web development", category: "tech" },
  { slug: "data-science", label: "Data science", category: "tech" },
  { slug: "cybersecurity", label: "Cybersecurity", category: "tech" },
  { slug: "robotics", label: "Robotics", category: "tech" },
  { slug: "ai-ml", label: "AI / ML", category: "tech" },
  { slug: "synth", label: "Synth", category: "music" },
  { slug: "guitar", label: "Guitar", category: "music" },
  { slug: "piano", label: "Piano", category: "music" },
  { slug: "drums", label: "Drums", category: "music" },
  { slug: "singing", label: "Singing", category: "music" },
  { slug: "djing", label: "DJing", category: "music" },
  { slug: "music-production", label: "Music production", category: "music" },
  { slug: "coffee", label: "Coffee", category: "food" },
  { slug: "cooking", label: "Cooking", category: "food" },
  { slug: "baking", label: "Baking", category: "food" },
  { slug: "wine", label: "Wine", category: "food" },
  { slug: "grilling", label: "Grilling", category: "food" },
  { slug: "fermentation", label: "Fermentation", category: "food" },
  { slug: "hiking", label: "Hiking", category: "outdoors" },
  { slug: "camping", label: "Camping", category: "outdoors" },
  { slug: "fishing", label: "Fishing", category: "outdoors" },
  { slug: "birding", label: "Birding", category: "outdoors" },
  { slug: "gardening", label: "Gardening", category: "outdoors" },
  { slug: "kayaking", label: "Kayaking", category: "outdoors" },
  { slug: "chess", label: "Chess", category: "games" },
  { slug: "board-games", label: "Board games", category: "games" },
  { slug: "video-games", label: "Video games", category: "games" },
  { slug: "tabletop-rpg", label: "Tabletop RPG", category: "games" },
  { slug: "poker", label: "Poker", category: "games" },
  { slug: "go", label: "Go", category: "games" },
  { slug: "languages", label: "Languages", category: "learning" },
  { slug: "history", label: "History", category: "learning" },
  { slug: "science", label: "Science", category: "learning" },
  { slug: "philosophy", label: "Philosophy", category: "learning" },
  { slug: "teaching", label: "Teaching", category: "learning" },
  { slug: "math", label: "Math", category: "learning" },
];

export const CATEGORY_LABELS: Record<TaxonomyCategory, string> = {
  creative: "Creative",
  sports: "Sports",
  tech: "Tech",
  music: "Music",
  food: "Food",
  outdoors: "Outdoors",
  games: "Games",
  learning: "Learning",
};

/** Curated child sub-tags — only attachable when the parent main tag is selected. */
export const SUBTAGS: TaxonomySubtag[] = [
  { slug: "fortnite", parent_slug: "video-games", label: "Fortnite" },
  { slug: "minecraft", parent_slug: "video-games", label: "Minecraft" },
  { slug: "zelda", parent_slug: "video-games", label: "Zelda" },
  { slug: "valorant", parent_slug: "video-games", label: "Valorant" },
  {
    slug: "animal-crossing",
    parent_slug: "video-games",
    label: "Animal Crossing",
  },
  { slug: "openings", parent_slug: "chess", label: "Openings" },
  { slug: "endgames", parent_slug: "chess", label: "Endgames" },
  { slug: "blitz", parent_slug: "chess", label: "Blitz" },
  { slug: "classical", parent_slug: "chess", label: "Classical" },
  { slug: "chess-puzzles", parent_slug: "chess", label: "Puzzles" },
  { slug: "javascript", parent_slug: "programming", label: "JavaScript" },
  { slug: "python", parent_slug: "programming", label: "Python" },
  { slug: "rust", parent_slug: "programming", label: "Rust" },
  { slug: "typescript", parent_slug: "programming", label: "TypeScript" },
  { slug: "systems-go", parent_slug: "programming", label: "Go" },
  { slug: "portrait", parent_slug: "photography", label: "Portrait" },
  { slug: "landscape", parent_slug: "photography", label: "Landscape" },
  { slug: "street-photo", parent_slug: "photography", label: "Street" },
  {
    slug: "film-photography",
    parent_slug: "photography",
    label: "Film",
  },
  { slug: "italian-cuisine", parent_slug: "cooking", label: "Italian" },
  { slug: "sushi", parent_slug: "cooking", label: "Sushi" },
  { slug: "meal-prep", parent_slug: "cooking", label: "Meal prep" },
  { slug: "pastry", parent_slug: "cooking", label: "Pastry" },
];
