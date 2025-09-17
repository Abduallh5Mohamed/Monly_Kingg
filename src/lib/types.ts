export type Account = {
  id: string;
  name: string;
  game: string;
  title: string;
  price: number;
  image: {
    id: string;
    url: string;
    alt: string;
    hint: string;
  };
};
