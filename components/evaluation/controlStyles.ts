export const evaluationControlStyles = {
  primaryButton: "h-10 px-4 text-sm font-medium bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-smooth",
  compactPrimaryButton: "h-9 px-3 text-xs font-medium bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-smooth",
  secondaryButton: "h-9 px-3 text-xs font-medium text-muted-foreground hover:text-card-foreground hover:bg-muted border border-border rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-smooth",
  textButton: "px-3 py-2 text-xs font-medium text-muted-foreground hover:text-card-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-smooth",
  dangerTextButton: "px-3 py-2 text-xs font-medium text-muted-foreground hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-smooth",
  dangerButton: "h-9 px-3 text-xs font-medium text-red-500 hover:text-red-400 hover:bg-red-500/10 border border-red-500/20 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-smooth",
  softIconButton: "w-8 h-8 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition-smooth",
  field: "w-full h-10 px-3 border border-border rounded-lg bg-surface text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60",
  textArea: "w-full px-3 py-2.5 border border-border rounded-lg bg-surface text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60",
} as const;
