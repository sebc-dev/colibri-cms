/**
 * Compose, pour toutes les pages déclarées, ce qu'il faut à `core/medias/
 * references.ts` pour dire ce que le contenu courant de chaque emplacement
 * pose (change 011, ticket 03) : la déclaration, la dernière version publiée
 * et le brouillon. Zone `platform` : lit les magasins, ne décide rien.
 */
import type { PageContenuCourant } from '../../core/medias/references.ts';
import { listerPagesDeclarees, obtenirPageAvecEmplacements } from './pages.ts';
import { obtenirBrouillon, type DB as DBBrouillons } from '../brouillons/magasin.ts';
import { obtenirPublieEmplacements, type DB as DBPublie } from '../publication/magasin-publie.ts';

export async function lirePagesContenuCourant(db: DBBrouillons & DBPublie): Promise<PageContenuCourant[]> {
  const pages: PageContenuCourant[] = [];
  for (const { slug } of listerPagesDeclarees()) {
    const page = obtenirPageAvecEmplacements(slug);
    if (!page) continue;
    pages.push({
      slug,
      declares: page.emplacements,
      publie: await obtenirPublieEmplacements(db, slug),
      brouillon: await obtenirBrouillon(db, slug),
    });
  }
  return pages;
}
