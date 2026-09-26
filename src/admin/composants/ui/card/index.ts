/**
 * `Root`/`Header`/`Title`/`Description`/`Action`/`Content`/`Footer` (les
 * composants) viennent de leurs fichiers `.svelte` frères — copiés par la
 * CLI shadcn-svelte (ticket 02, openspec/changes/005-mise-en-page-
 * administration/tickets/02-identite-colibri.md, ADR-0009).
 */
import Action from './card-action.svelte';
import Content from './card-content.svelte';
import Description from './card-description.svelte';
import Footer from './card-footer.svelte';
import Header from './card-header.svelte';
import Title from './card-title.svelte';
import Root from './card.svelte';

export {
  Root,
  Content,
  Description,
  Footer,
  Header,
  Title,
  Action,
  //
  Root as Card,
  Content as CardContent,
  Description as CardDescription,
  Footer as CardFooter,
  Header as CardHeader,
  Title as CardTitle,
  Action as CardAction,
};
