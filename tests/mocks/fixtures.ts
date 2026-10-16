/**
 * Hand-written TMDB fixtures shaped like real v3 responses. Ids match TMDB
 * where noted so the data reads sensibly, but nothing here is live data.
 */

const p = (provider_id: number, provider_name: string, display_priority: number) => ({
  provider_id,
  provider_name,
  logo_path: `/logo-${provider_id}.png`,
  display_priority,
});

export const PROVIDERS = {
  netflix: p(8, "Netflix", 1),
  prime: p(9, "Amazon Prime Video", 2),
  disney: p(337, "Disney Plus", 3),
  appleTvPlus: p(350, "Apple TV Plus", 4),
  now: p(39, "Now TV", 5),
  iplayer: p(38, "BBC iPlayer", 6),
  itvx: p(41, "ITVX", 7),
  channel4: p(103, "Channel 4", 8),
  appleStore: p(2, "Apple TV", 20),
  amazonVideo: p(10, "Amazon Video", 21),
  googlePlay: p(3, "Google Play Movies", 22),
  hulu: p(15, "Hulu", 1),
};

export const THE_BEAR_TV = {
  id: 136315,
  name: "The Bear",
  tagline: "",
  overview:
    "A young chef from the fine dining world comes home to Chicago to run his family's sandwich shop.",
  first_air_date: "2022-06-23",
  episode_run_time: [30],
  number_of_seasons: 4,
  poster_path: "/the-bear.jpg",
  backdrop_path: null,
  vote_average: 8.2,
  genres: [
    { id: 18, name: "Drama" },
    { id: 35, name: "Comedy" },
  ],
};

export const THE_BEAR_MOVIE = {
  id: 10142,
  title: "The Bear",
  tagline: "",
  overview: "An orphaned bear cub befriends an adult grizzly.",
  release_date: "1988-10-19",
  runtime: 96,
  poster_path: "/the-bear-1988.jpg",
  backdrop_path: null,
  vote_average: 7.3,
  genres: [{ id: 12, name: "Adventure" }],
};

export const PADDINGTON = {
  id: 116149,
  title: "Paddington",
  tagline: "",
  overview: "A young Peruvian bear travels to London in search of a home.",
  release_date: "2014-11-24",
  runtime: 95,
  poster_path: "/paddington.jpg",
  backdrop_path: null,
  vote_average: 7.2,
  genres: [
    { id: 35, name: "Comedy" },
    { id: 10751, name: "Family" },
  ],
};

export const WATCH_PROVIDERS: Record<string, unknown> = {
  "tv/136315": {
    id: 136315,
    results: {
      GB: {
        link: "https://www.themoviedb.org/tv/136315-the-bear/watch?locale=GB",
        flatrate: [PROVIDERS.disney],
        buy: [PROVIDERS.appleStore, PROVIDERS.amazonVideo, PROVIDERS.googlePlay],
      },
      US: {
        link: "https://www.themoviedb.org/tv/136315-the-bear/watch?locale=US",
        flatrate: [PROVIDERS.hulu, PROVIDERS.disney],
      },
    },
  },
  "movie/10142": { id: 10142, results: {} },
  "movie/116149": {
    id: 116149,
    results: {
      GB: {
        link: "https://www.themoviedb.org/movie/116149-paddington/watch?locale=GB",
        flatrate: [PROVIDERS.netflix, PROVIDERS.iplayer],
        rent: [PROVIDERS.amazonVideo, PROVIDERS.appleStore],
        buy: [PROVIDERS.amazonVideo, PROVIDERS.appleStore],
      },
    },
  },
};

export const MOVIES: Record<number, unknown> = {
  [THE_BEAR_MOVIE.id]: THE_BEAR_MOVIE,
  [PADDINGTON.id]: PADDINGTON,
};
export const TV: Record<number, unknown> = { [THE_BEAR_TV.id]: THE_BEAR_TV };

const movieResult = (m: typeof PADDINGTON) => ({
  id: m.id,
  title: m.title,
  release_date: m.release_date,
  poster_path: m.poster_path,
  overview: m.overview,
  vote_average: m.vote_average,
  popularity: 50,
  genre_ids: m.genres.map((g) => g.id),
});

const tvResult = (t: typeof THE_BEAR_TV) => ({
  id: t.id,
  name: t.name,
  first_air_date: t.first_air_date,
  poster_path: t.poster_path,
  overview: t.overview,
  vote_average: t.vote_average,
  popularity: 80,
  genre_ids: t.genres.map((g) => g.id),
});

export const SEARCHABLE = [
  { ...tvResult(THE_BEAR_TV), media_type: "tv" },
  { ...movieResult(THE_BEAR_MOVIE), media_type: "movie" },
  { id: 999, name: "Bear Grylls", media_type: "person", known_for_department: "Acting" },
  { ...movieResult(PADDINGTON), media_type: "movie" },
];

export const DISCOVER_MOVIES = [movieResult(PADDINGTON), movieResult(THE_BEAR_MOVIE)];
export const DISCOVER_TV = [tvResult(THE_BEAR_TV)];

/** Which providers each discoverable title streams on in GB (flatrate/free/ads). */
export const STREAMS_ON: Record<string, number[]> = {
  "movie/116149": [8, 38],
  "movie/10142": [],
  "tv/136315": [337],
};

export const REGIONS = [
  { iso_3166_1: "GB", english_name: "United Kingdom", native_name: "United Kingdom" },
  { iso_3166_1: "US", english_name: "United States of America", native_name: "United States" },
  { iso_3166_1: "IE", english_name: "Ireland", native_name: "Ireland" },
];

const withPriorities = (providers: ReturnType<typeof p>[]) =>
  providers.map((x) => ({ ...x, display_priorities: { GB: x.display_priority } }));

export const PROVIDER_LIST = {
  movie: withPriorities([
    PROVIDERS.netflix,
    PROVIDERS.prime,
    PROVIDERS.disney,
    PROVIDERS.appleTvPlus,
    PROVIDERS.now,
    PROVIDERS.iplayer,
    PROVIDERS.appleStore,
    PROVIDERS.amazonVideo,
    PROVIDERS.googlePlay,
  ]),
  tv: withPriorities([
    PROVIDERS.netflix,
    PROVIDERS.prime,
    PROVIDERS.disney,
    PROVIDERS.iplayer,
    PROVIDERS.itvx,
    PROVIDERS.channel4,
  ]),
};

export const GENRES = {
  movie: [
    { id: 28, name: "Action" },
    { id: 12, name: "Adventure" },
    { id: 35, name: "Comedy" },
    { id: 18, name: "Drama" },
    { id: 10751, name: "Family" },
  ],
  tv: [
    { id: 10759, name: "Action & Adventure" },
    { id: 35, name: "Comedy" },
    { id: 18, name: "Drama" },
  ],
};
