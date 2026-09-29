/** Product-range identifier tag in one of the five accent colours. Use sparingly — category indicators, tabs, small highlights only. */
export interface RangeTagProps {
  /** Accent colour family */
  range?: 'mint' | 'peach' | 'sky' | 'sun' | 'lavender';
  children: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function RangeTag(props: RangeTagProps): JSX.Element;
