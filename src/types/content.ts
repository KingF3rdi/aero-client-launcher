export type ProjectType = "mod" | "modpack" | "resourcepack" | "shader";

export interface ContentSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  iconUrl: string | null;
  downloads: number;
  projectType: ProjectType;
}

export interface ContentPage {
  hits: ContentSummary[];
  totalHits: number;
}
