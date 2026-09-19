import { permanentRedirect } from "next/navigation";

/**
 * The directions now live on the Visit page itself, both routes side by side,
 * so people aren't sent between pages. Old links land there.
 */
export default function DirectionsPage() {
  permanentRedirect("/visit#getting-here");
}
