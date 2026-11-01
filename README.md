# Let's Flock! website

The public site for [Let's Flock!](https://www.meta.com/en-gb/experiences/lets-flock/24861074283575178/), hosted on GitHub Pages at <https://tapley123.github.io/LetsFlockWebsite/>. It's plain HTML and CSS with no build step: pushing to `main` publishes it.

**Don't rename or move `privacy.html`.** Its URL is the privacy policy link for the Meta Horizon Store, and Meta rechecks it regularly. Three failed checks in a row can get the app removed from the store.

When the game's data handling changes, update `privacy.html` and its "Last updated" date. That includes new services, SDKs, analytics or anything else that collects or sends player data.

On launch day, change the "Wishlist on Meta Quest" buttons and the "Coming to Meta Quest" line in `index.html`.

## Layout

- `index.html`: home page
- `privacy.html`: privacy policy
- `style.css`: all styles, using the game's UI palette
- `assets/site.js`: optional extras (the hero loop and the 360 view). Both pages work without it
- `assets/`: images and video made from the store art, plus fonts with their licences
