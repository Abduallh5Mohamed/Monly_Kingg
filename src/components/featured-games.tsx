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

  const ListItem = ({ children, hasNumber }: { children: React.ReactNode, hasNumber?: boolean }) => (
    <li className="flex items-center gap-2">
      {hasNumber && <span className="text-primary text-sm">02.</span>}
      <span className="text-foreground/70 text-sm tracking-wider">{children}</span>
    </li>
  );
  
  return (
    <div 
      className="w-full max-w-sm p-6 bg-black/30 backdrop-blur-sm relative"
      style={{
        clipPath: 'polygon(10% 0, 90% 0, 100% 10%, 100% 100%, 0 100%, 0 10%)',
        boxShadow: '0 0 15px hsl(var(--primary) / 0.5), 0 0 5px hsl(var(--primary) / 0.7) inset',
        border: '1px solid hsl(var(--primary) / 0.5)',
      }}
    >
      <div className="space-y-6">
        <div>
          <h3 className="font-bold text-primary mb-3 tracking-widest">Featured Games. 02</h3>
          <ul className="space-y-2">
            {gameList1.map(game => <ListItem key={game} hasNumber={!game.includes('Duty Legends')}>{game}</ListItem>)}
          </ul>
        </div>
        <div>
            <h3 className="font-bold text-primary mb-3 tracking-widest">Featured Games. 02</h3>
            <ul className="space-y-2">
                {gameList2.map(game => <ListItem key={game} hasNumber={false}>{game}</ListItem>)}
            </ul>
        </div>
      </div>
    </div>
  );
}
