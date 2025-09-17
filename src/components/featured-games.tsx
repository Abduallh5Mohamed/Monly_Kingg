export function FeaturedGames() {
  const gameList1 = [
    'Call Duty Legends',
    'Call Duty Valong',
    'Elden Hawering',
  ];
  const gameList2 = [
    'Call Duly Vegends',
    'KING OS'
  ];

  const ListItem = ({ children }: { children: React.ReactNode }) => (
    <li className="flex items-center gap-2">
      <span className="text-primary text-sm">02.</span>
      <span className="text-foreground/70 text-sm">{children}</span>
    </li>
  );
  
  return (
    <div className="w-full max-w-sm p-4 rounded-lg bg-black/20 backdrop-blur-sm border border-primary/20 holographic-border">
      <div className="space-y-4">
        <div>
          <h3 className="font-bold text-primary mb-2">Featured Games. 02</h3>
          <ul className="space-y-1">
            {gameList1.map(game => <ListItem key={game}>{game}</ListItem>)}
          </ul>
        </div>
        <div>
            <h3 className="font-bold text-primary mb-2">Featured Games. 02</h3>
            <ul className="space-y-1">
                {gameList2.map(game => <ListItem key={game}>{game}</ListItem>)}
            </ul>
        </div>
      </div>
    </div>
  );
}
