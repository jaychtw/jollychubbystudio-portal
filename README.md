# Jolly Chubby Studio

The public portfolio is configured to be served by Firebase Hosting at https://jollychubbystudio.com. The deployable site is committed under `public/`. Firebase serves these files directly.

## Publishing a work

1. Update the work in its source repository and inspect the approved build through Possibility. Possibility and its Pages workflows have independent release histories.
2. In a studio branch, copy the approved browser runtime to `public/<slug>/`, including its nested modules, assets, credits and licenses. Update both language versions of the studio card, use a root-relative launch URL ending in a slash, and record the upstream revision in `migration/sources.json`.
3. Update the studio sitemap and validate changed routes in the Firebase Hosting emulator. Run `python3 migration/verify.py` for the catalog and local HTML asset checks. The browser workflow also checks nested pages.
4. Merge the studio pull request into `main` to release the committed files to Firebase. The live workflow can also be dispatched on `main`. Reverting a release commit through a new commit triggers the same deployment path.

The “Assemble studio release on a working branch” workflow rebuilds from the manifest on a selected working branch. Its output replaces that branch’s entire public directory. Update the pinned portal/catalog input alongside module revisions before a full rebuild. The initial migration scripts reproduce the catalog using its pinned source inputs. Travel Canvas uses its separately hosted frontend and existing Firebase backend. Shared trip records stay in that backend. WDIC uses the upstream collector's refreshed public feed.

## Hosting setup

GitHub Actions uses the repository secret `FIREBASE_SERVICE_ACCOUNT` and the Firebase project `jollychubbystudio`. The canonical domain also requires a connected custom domain and valid DNS records in Firebase Hosting. The contact address is `support@jollychubbystudio.com`.

`public/ads.txt` has no seller entries. Add the exact account-authorized seller record when advertising is enabled. Review the privacy and terms pages when adding accounts, analytics, advertising or paid features.

## Publishing a blog post

Create `posts/YYYY-MM-DD-<slug>/en.md`, `zh.md`, or both. Copy the starter post’s YAML header and set its title, date and summary. Tags, a relative cover path and `draft: true` are optional. Each edition publishes independently. Store inline illustrations beside the Markdown and refer to them with paths such as `./diagram.png`. Slugs must be unique across dated folders.

Run `npm ci && npm run build:blog` to regenerate the blog in the Hosting directory. The index, post pages, navigation and sitemap are generated before deployment. Merge the post into this repository’s main branch to publish it to Jolly Chubby Studio.

Travel Canvas loads its public Firebase web SDK configuration from a same-origin file generated at deploy time. For a local preview, run `node scripts/prepare-travel-config.mjs` first. The configuration belongs to `traveltogether-2a321`. Its owner manages API restrictions, Authentication quotas and Firestore rules in that project.
