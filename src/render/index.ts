/**
 * Le baril de la zone `render/` — seul chemin importé depuis l'extérieur de
 * la zone (I3, ADR-0024) ; son unique importateur est `src/site/page.astro`.
 */
export { default as BoutonAction } from './BoutonAction.astro';
export { default as LienVideo } from './LienVideo.astro';
export { default as TexteRiche } from './markdown/TexteRiche.astro';
export { default as Image } from './Image.astro';
export { default as Galerie } from './Galerie.astro';
export { default as Carrousel } from './Carrousel.astro';
export { default as Formulaire } from './Formulaire.astro';
