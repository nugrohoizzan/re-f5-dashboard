export type TitipanCategory = "none" | "support" | "mop" | "scm" | "ncm" | "ekse";

export const CATEGORY_LABEL: Record<TitipanCategory, string> = {
  none: "Tidak ada",
  support: "Support",
  mop: "MOP",
  scm: "SCM",
  ncm: "NCM",
  ekse: "Eksekusi",
};

export const CATEGORY_OPTIONS: TitipanCategory[] = ["none", "support", "mop", "scm", "ncm", "ekse"];