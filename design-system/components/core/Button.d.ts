/** Utee pill CTA button: white pill, ALL-CAPS letterspaced midnight label ("SHOP NOW", "EXPLORE", "TRY UTEE").
 * @startingPoint section="Components" subtitle="White pill CTA button" viewport="700x160"
 */
export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  /** Renders an <a> instead of <button> */
  href?: string;
  style?: React.CSSProperties;
}
export declare function Button(props: ButtonProps): JSX.Element;
