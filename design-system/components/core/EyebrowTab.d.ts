/** Section eyebrow label: white pill tab ("OUR COLOUR") or bare ALL-CAPS letterspaced label. */
export interface EyebrowTabProps {
  children: React.ReactNode;
  /** White pill background (default true); false = bare caps label */
  pill?: boolean;
  /** Bare label colour: true = white (on brand grounds), false = midnight */
  onDark?: boolean;
  style?: React.CSSProperties;
}
export declare function EyebrowTab(props: EyebrowTabProps): JSX.Element;
