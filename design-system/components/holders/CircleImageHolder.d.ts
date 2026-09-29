/** Circular image holder with optional curved caption text wrapping the top arc (e.g. "CO-CREATED WITH CHERRY HEALEY"). Caption colour = CSS currentColor. */
export interface CircleImageHolderProps {
  src: string;
  alt?: string;
  /** Curved caption around the circle; auto-uppercased */
  label?: string;
  /** Outer diameter in px (default 220) */
  size?: number;
  style?: React.CSSProperties;
}
export declare function CircleImageHolder(props: CircleImageHolderProps): JSX.Element;
