import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Card, CardContent } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Upload, FileText, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { parseVCard, mapVCardToProfile, isValidVCard, generateVCardPreview, type ParsedVCard } from '@/lib/vcard-parser';
import { toast } from 'sonner';

interface VCardImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (profileData: any) => void;
}

export default function VCardImportDialog({
  open,
  onOpenChange,
  onImport
}: VCardImportDialogProps) {
  const [vcardText, setVcardText] = useState('');
  const [parsedVCard, setParsedVCard] = useState<ParsedVCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'input' | 'preview'>('input');

  const handleReset = () => {
    setVcardText('');
    setParsedVCard(null);
    setError(null);
    setStep('input');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.name.endsWith('.vcf') && !file.name.endsWith('.vcard')) {
      toast.error('Please upload a .vcf or .vcard file');
      return;
    }

    try {
      const text = await file.text();
      setVcardText(text);
      handleParse(text);
    } catch (err) {
      console.error('Error reading file:', err);
      toast.error('Failed to read file');
    }
  };

  const handleParse = (text?: string) => {
    const textToParse = text || vcardText;
    
    if (!textToParse.trim()) {
      setError('Please paste or upload a vCard');
      return;
    }

    // Validate vCard format
    if (!isValidVCard(textToParse)) {
      setError('Invalid vCard format. Please ensure the text starts with BEGIN:VCARD and ends with END:VCARD');
      setParsedVCard(null);
      setStep('input');
      return;
    }

    try {
      // Parse the vCard
      const parsed = parseVCard(textToParse);
      setParsedVCard(parsed);
      setError(null);
      setStep('preview');
    } catch (err) {
      console.error('Error parsing vCard:', err);
      setError('Failed to parse vCard. Please check the format.');
      setParsedVCard(null);
      setStep('input');
    }
  };

  const handleImport = () => {
    if (!parsedVCard) return;

    try {
      const profileData = mapVCardToProfile(parsedVCard);
      onImport(profileData);
      toast.success('vCard imported successfully!');
      handleReset();
      onOpenChange(false);
    } catch (err) {
      console.error('Error importing vCard:', err);
      toast.error('Failed to import vCard data');
    }
  };

  const exampleVCard = `BEGIN:VCARD
VERSION:4.0
N:Doe;John;;;
FN:John Doe
ORG:Example Inc.
TITLE:Senior Developer
TEL;TYPE=work,voice:123-456-7890
EMAIL:john.doe@example.com
URL:https://johndoe.com
ADR:;;123 Main St;San Francisco;CA;94102;USA
NOTE:Passionate about building community platforms
END:VCARD`;

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        handleReset();
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Import vCard
          </DialogTitle>
          <DialogDescription>
            Import your contact information from a vCard (.vcf) file or paste vCard text directly
          </DialogDescription>
        </DialogHeader>

        {step === 'input' ? (
          <Tabs defaultValue="paste" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="paste">Paste vCard</TabsTrigger>
              <TabsTrigger value="upload">Upload File</TabsTrigger>
            </TabsList>

            <TabsContent value="paste" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Paste your vCard text:</label>
                <Textarea
                  value={vcardText}
                  onChange={(e) => setVcardText(e.target.value)}
                  placeholder={exampleVCard}
                  rows={12}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-gray-500">
                  Paste vCard text from email signature, contact app, or any vCard source
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleReset}>
                  Clear
                </Button>
                <Button onClick={() => handleParse()}>
                  Parse vCard →
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Upload a vCard file</p>
                  <p className="text-xs text-gray-500">
                    Supports .vcf and .vcard files
                  </p>
                </div>
                <div className="mt-4">
                  <input
                    type="file"
                    accept=".vcf,.vcard"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="vcard-upload"
                  />
                  <label 
                    htmlFor="vcard-upload"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 cursor-pointer"
                  >
                    Choose File
                  </label>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          /* Preview Step */
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                vCard parsed successfully! Review the data below before importing.
              </AlertDescription>
            </Alert>

            {parsedVCard && (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  {/* Basic Info */}
                  {parsedVCard.fullName && (
                    <div>
                      <div className="text-sm font-medium text-gray-500">Full Name</div>
                      <div className="text-lg font-semibold">{parsedVCard.fullName}</div>
                    </div>
                  )}

                  {/* Professional */}
                  {(parsedVCard.title || parsedVCard.organization) && (
                    <div>
                      <div className="text-sm font-medium text-gray-500">Professional</div>
                      <div>
                        {parsedVCard.title && <div className="font-medium">{parsedVCard.title}</div>}
                        {parsedVCard.organization && <div className="text-sm text-gray-600">{parsedVCard.organization}</div>}
                      </div>
                    </div>
                  )}

                  {/* Contact */}
                  <div className="grid grid-cols-2 gap-4">
                    {parsedVCard.email && (
                      <div>
                        <div className="text-sm font-medium text-gray-500">Email</div>
                        <div className="text-sm">{parsedVCard.email}</div>
                      </div>
                    )}

                    {parsedVCard.phone && (
                      <div>
                        <div className="text-sm font-medium text-gray-500">Phone</div>
                        <div className="text-sm">{parsedVCard.phone}</div>
                      </div>
                    )}
                  </div>

                  {/* Location */}
                  {parsedVCard.address && (
                    <div>
                      <div className="text-sm font-medium text-gray-500">Location</div>
                      <div className="text-sm">
                        {[
                          parsedVCard.address.street,
                          parsedVCard.address.city,
                          parsedVCard.address.state,
                          parsedVCard.address.postalCode,
                          parsedVCard.address.country
                        ].filter(Boolean).join(', ')}
                      </div>
                    </div>
                  )}

                  {/* Social Links */}
                  {(parsedVCard.website || parsedVCard.linkedin || parsedVCard.twitter || parsedVCard.github) && (
                    <div>
                      <div className="text-sm font-medium text-gray-500 mb-2">Social Links</div>
                      <div className="space-y-1">
                        {parsedVCard.website && (
                          <div className="text-sm flex items-center gap-2">
                            <span className="text-gray-500">Website:</span>
                            <a href={parsedVCard.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {parsedVCard.website}
                            </a>
                          </div>
                        )}
                        {parsedVCard.linkedin && (
                          <div className="text-sm flex items-center gap-2">
                            <span className="text-gray-500">LinkedIn:</span>
                            <a href={parsedVCard.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {parsedVCard.linkedin}
                            </a>
                          </div>
                        )}
                        {parsedVCard.twitter && (
                          <div className="text-sm flex items-center gap-2">
                            <span className="text-gray-500">Twitter:</span>
                            <span className="text-gray-700">{parsedVCard.twitter}</span>
                          </div>
                        )}
                        {parsedVCard.github && (
                          <div className="text-sm flex items-center gap-2">
                            <span className="text-gray-500">GitHub:</span>
                            <span className="text-gray-700">{parsedVCard.github}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Note */}
                  {parsedVCard.note && (
                    <div>
                      <div className="text-sm font-medium text-gray-500">Bio/Note</div>
                      <div className="text-sm text-gray-700">{parsedVCard.note}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                This data will be imported into your profile. You can edit it after importing.
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button variant="outline" onClick={handleReset}>
                ← Back to Input
              </Button>
              <Button onClick={handleImport}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Import to Profile
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Info Box for Input Step */}
        {step === 'input' && (
          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Where to find vCards:</p>
                <ul className="text-xs space-y-1 ml-4 list-disc">
                  <li>Email signature attachments (.vcf files)</li>
                  <li>Contact apps (export as vCard)</li>
                  <li>QR code scanners (many generate vCards)</li>
                  <li>LinkedIn (download contact info)</li>
                  <li>Business card scanning apps</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
}