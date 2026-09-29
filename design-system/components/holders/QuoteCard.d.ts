/** Testimonial quote card: pink panel, maroon SemiBold quote text, oversized serif quotation mark, attribution footer. */
export interface QuoteCardProps {
  quote: string;
  /** Attribution name, e.g. "Cherry Healey" */
  name?: string;
  /** Attribution role line */
  role?: string;
  style?: React.CSSProperties;
}
export declare function QuoteCard(props: QuoteCardProps): JSX.Element;
