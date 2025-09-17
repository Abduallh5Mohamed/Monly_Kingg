export function FeaturedGames() {
  const gameList1 = [
    'Call Duty Legends',
    'Call Duty Valong',
    'Elden Hawering',
    'Starfield Odyssey',
    'Cyberpunk 2078',
  ];
  const gameList2 = [
    'Call Duly Vegends',
    'KING OS',
    'Final Fantasy XVI',
    'Diablo IV',
  ];

  const ListItem = ({ children, hasNumber }: { children: React.ReactNode, hasNumber?: boolean }) => (
    <li className="flex items-center gap-2">
      {hasNumber && <span className="text-cyan-400 text-sm">02.</span>}
      <span className="text-foreground/70 text-sm tracking-wider">{children}</span>
    </li>
  );
  
  return (
    <div 
      className="w-full max-w-64 p-6 bg-black/30 backdrop-blur-sm relative h-[450px] flex flex-col"
      style={{
        clipPath: 'polygon(10% 0, 90% 0, 100% 5%, 100% 95%, 90% 100%, 10% 100%, 0 95%, 0 5%)',
        boxShadow: '0 0 15px hsl(190 90% 50% / 0.5), 0 0 5px hsl(190 90% 50% / 0.7) inset',
        border: '1px solid hsl(190 90% 50% / 0.5)',
      }}
    >
      <div 
        className="overflow-y-auto pr-4 -mr-4 space-y-6"
        style={{
            maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
            scrollbarWidth: 'none',
        }}
       >
        <div>
          <h3 className="font-bold text-cyan-400 mb-3 tracking-widest">Featured Games. 02</h3>
          <ul className="space-y-2">
            {gameList1.map(game => <ListItem key={game} hasNumber={!game.includes('Duty Legends')}>{game}</ListItem>)}
          </ul>
        </div>
        <div>
            <h3 className="font-bold text-cyan-400 mb-3 tracking-widest">Featured Games. 02</h3>
            <ul className="space-y-2">
                {gameList2.map(game => <ListItem key={game} hasNumber={false}>{game}</ListItem>)}
            </ul>
        </div>
      </div>
      <style jsx>{`
        .overflow-y-auto::-webkit-scrollbar {
            display: none;
        }
      `}</style>
    </div>
  );
}
