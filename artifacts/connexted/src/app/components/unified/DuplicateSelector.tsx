import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Copy, Check, Search } from 'lucide-react';
import { useState } from 'react';

interface Playlist {
  id: string;
  name: string;
  itemCount: number;
}

const SAMPLE_PLAYLISTS: Playlist[] = [
  { id: 'p1', name: 'My First Playlist', itemCount: 10 },
  { id: 'p2', name: 'Intro to React', itemCount: 7 },
  { id: 'p3', name: 'Advanced CSS', itemCount: 12 },
  { id: 'p4', name: 'TypeScript Basics', itemCount: 5 },
];

interface DuplicateSelectorProps {
  onSelect: (playlistId: string) => void;
  selectedPlaylistId?: string;
}

export function DuplicateSelector({ onSelect, selectedPlaylistId }: DuplicateSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPlaylists, setFilteredPlaylists] = useState<Playlist[]>(SAMPLE_PLAYLISTS);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    const filtered = SAMPLE_PLAYLISTS.filter(p => 
      p.name.toLowerCase().includes(term.toLowerCase())
    );
    setFilteredPlaylists(filtered);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search playlists..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPlaylists.map((playlist) => (
          <Card 
            key={playlist.id}
            className={`cursor-pointer transition-all hover:border-primary ${selectedPlaylistId === playlist.id ? 'border-primary ring-2 ring-primary/20' : ''}`}
            onClick={() => onSelect(playlist.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 mb-2">
                  <Copy className="w-5 h-5" />
                </div>
                {selectedPlaylistId === playlist.id && (
                  <Badge className="bg-primary text-primary-foreground">Selected</Badge>
                )}
              </div>
              <CardTitle className="text-lg">{playlist.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-xs text-muted-foreground">
                <Badge variant="secondary" className="mr-2">
                  {playlist.itemCount} Items
                </Badge>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                variant={selectedPlaylistId === playlist.id ? "default" : "outline"} 
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(playlist.id);
                }}
              >
                {selectedPlaylistId === playlist.id ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Selected
                  </>
                ) : (
                  "Select"
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
        
        {filteredPlaylists.length === 0 && (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            No playlists found matching "{searchTerm}"
          </div>
        )}
      </div>
    </div>
  );
}
