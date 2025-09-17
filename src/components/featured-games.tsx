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

  const ListItem = ({ children }: { children: React.ReactNode }) => (
    <li className="flex items-center gap-2">
      <span className="text-foreground/70 text-sm tracking-wider">{children}</span>
    </li>
  );
  
  return (
    <div 
      className="w-full max-w-60 p-6 bg-transparent relative h-[400px] flex flex-col"
      style={{
        clipPath: 'polygon(0 5%, 10% 0, 90% 0, 100% 5%, 100% 100%, 0 100%)',
        boxShadow: '0 -5px 15px -5px hsl(190 90% 50% / 0.6), 0 5px 15px -5px hsl(190 90% 50% / 0.6)',
        border: '1px solid hsl(190 90% 50% / 0.5)',
        borderBottom: 'none',
      }}
    >
      <div 
        className="overflow-y-auto pr-4 -mr-4 space-y-6"
        style={{
            scrollbarWidth: 'none',
        }}
       >
        <div>
          <h3 className="font-bold text-cyan-400 mb-3 tracking-widest" style={{ textShadow: '0 0 5px hsl(190 90% 50% / 0.8)' }}>Featured Games. 02</h3>
          <ul className="space-y-2">
            {gameList1.map(game => <ListItem key={game}>{game}</ListItem>)}
          </ul>
        </div>
        <div>
            <h3 className="font-bold text-cyan-400 mb-3 tracking-widest" style={{ textShadow: '0 0 5px hsl(190 90% 50% / 0.8)' }}>Featured Games. 02</h3>
            <ul className="space-y-2">
                {gameList2.map(game => <ListItem key={game}>{game}</ListItem>)}
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
