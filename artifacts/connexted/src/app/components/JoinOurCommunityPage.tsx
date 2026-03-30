import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Check, X, Eye, MessageSquare, Users, Grid, Sparkles, CircleDot, Crown, ArrowRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import Breadcrumbs from '@/app/components/Breadcrumbs';

const CheckIcon = () => <Check className="w-5 h-5 text-green-600 mx-auto" />;
const XIcon = () => <X className="w-5 h-5 text-gray-300 mx-auto" />;

export default function JoinOurCommunityPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        <Breadcrumbs
          items={[
            { label: 'Join Our Community' },
          ]}
        />

        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Join CONNEXTED LABS
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            THE community for innovators, entrepreneurs, job seekers, and professionals
          </p>
        </div>

        {/* TABLE 1: Getting Started (Visitor, Guest, Basic User, Attender) */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-6 text-center">Getting Started</h2>
          <p className="text-center text-gray-600 mb-8">Browse, explore, and participate in the community</p>
          
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-1/5 font-semibold">Feature</TableHead>
                  <TableHead className="text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Eye className="w-6 h-6 text-gray-600" />
                      <div className="font-semibold">Visitor</div>
                      <Badge variant="outline" className="text-xs">No Account</Badge>
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Eye className="w-6 h-6 text-gray-600" />
                      <div className="font-semibold">Guest</div>
                      <Badge variant="outline" className="text-xs">No Account</Badge>
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex flex-col items-center gap-2">
                      <MessageSquare className="w-6 h-6 text-blue-600" />
                      <div className="font-semibold">Basic User</div>
                      <Badge className="text-xs bg-blue-600">$29/mo</Badge>
                    </div>
                  </TableHead>
                  <TableHead className="text-center bg-blue-50">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="w-6 h-6 text-blue-700" />
                      <div className="font-semibold">Attender</div>
                      <Badge className="text-xs bg-blue-700">$49/mo</Badge>
                      <Badge variant="secondary" className="text-xs">Most Popular</Badge>
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Account Required</TableCell>
                  <TableCell className="text-center"><XIcon /></TableCell>
                  <TableCell className="text-center"><XIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                  <TableCell className="text-center bg-blue-50"><CheckIcon /></TableCell>
                </TableRow>
                <TableRow className="bg-gray-50">
                  <TableCell className="font-medium">View Markets</TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                  <TableCell className="text-center bg-blue-50"><CheckIcon /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">View Marketplace</TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                  <TableCell className="text-center bg-blue-50"><CheckIcon /></TableCell>
                </TableRow>
                <TableRow className="bg-gray-50">
                  <TableCell className="font-medium">View Programs</TableCell>
                  <TableCell className="text-center"><XIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                  <TableCell className="text-center bg-blue-50"><CheckIcon /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">View Circles</TableCell>
                  <TableCell className="text-center"><XIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                  <TableCell className="text-center bg-blue-50"><CheckIcon /></TableCell>
                </TableRow>
                <TableRow className="bg-gray-50">
                  <TableCell className="font-medium">Read Posts/Content</TableCell>
                  <TableCell className="text-center"><XIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                  <TableCell className="text-center bg-blue-50"><CheckIcon /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Post & Comment</TableCell>
                  <TableCell className="text-center"><XIcon /></TableCell>
                  <TableCell className="text-center"><XIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                  <TableCell className="text-center bg-blue-50"><CheckIcon /></TableCell>
                </TableRow>
                <TableRow className="bg-gray-50">
                  <TableCell className="font-medium">Participate in Meetings</TableCell>
                  <TableCell className="text-center"><XIcon /></TableCell>
                  <TableCell className="text-center"><XIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                  <TableCell className="text-center bg-blue-50"><CheckIcon /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Participate in Meetups</TableCell>
                  <TableCell className="text-center"><XIcon /></TableCell>
                  <TableCell className="text-center"><XIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                  <TableCell className="text-center bg-blue-50"><CheckIcon /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Join Programs</TableCell>
                  <TableCell className="text-center"><XIcon /></TableCell>
                  <TableCell className="text-center"><XIcon /></TableCell>
                  <TableCell className="text-center"><XIcon /></TableCell>
                  <TableCell className="text-center bg-blue-50"><CheckIcon /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Join Circles</TableCell>
                  <TableCell className="text-center"><XIcon /></TableCell>
                  <TableCell className="text-center"><XIcon /></TableCell>
                  <TableCell className="text-center"><XIcon /></TableCell>
                  <TableCell className="text-center bg-blue-50"><CheckIcon /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Create Containers</TableCell>
                  <TableCell className="text-center"><XIcon /></TableCell>
                  <TableCell className="text-center"><XIcon /></TableCell>
                  <TableCell className="text-center"><XIcon /></TableCell>
                  <TableCell className="text-center bg-blue-50"><XIcon /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium"></TableCell>
                  <TableCell className="text-center">
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/explore">Browse Markets</Link>
                    </Button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/guest/explore">Explore</Link>
                    </Button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button size="sm" asChild>
                      <Link to="/join">Join Now</Link>
                    </Button>
                  </TableCell>
                  <TableCell className="text-center bg-blue-50">
                    <Button size="sm" className="bg-blue-700 hover:bg-blue-800" asChild>
                      <Link to="/join">Get Started</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </div>

        {/* TABLE 2: Active Contributors & Leaders (Regular User, Power User, Circle Leader) */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-6 text-center">Active Contributors & Leaders</h2>
          <p className="text-center text-gray-600 mb-8">Create, organize, and lead in the community</p>
          
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-1/4 font-semibold">Feature</TableHead>
                  <TableHead className="text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Grid className="w-6 h-6 text-purple-600" />
                      <div className="font-semibold">Regular User</div>
                      <Badge className="text-xs bg-purple-600">$79/mo</Badge>
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Sparkles className="w-6 h-6 text-purple-700" />
                      <div className="font-semibold">Power User</div>
                      <Badge className="text-xs bg-purple-700">$149/mo</Badge>
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex flex-col items-center gap-2">
                      <CircleDot className="w-6 h-6 text-purple-800" />
                      <div className="font-semibold">Circle Leader</div>
                      <Badge className="text-xs bg-purple-800">$199/mo</Badge>
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Everything from Attender</TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                </TableRow>
                <TableRow className="bg-gray-50">
                  <TableCell className="font-medium">Create Tables</TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Create Elevators</TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                </TableRow>
                <TableRow className="bg-gray-50">
                  <TableCell className="font-medium">Create Pitches</TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Create Builds</TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Create Events</TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Create Meetings</TableCell>
                  <TableCell className="text-center"><XIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Create Meetups</TableCell>
                  <TableCell className="text-center"><XIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Create Standups</TableCell>
                  <TableCell className="text-center"><XIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Create Sprints</TableCell>
                  <TableCell className="text-center"><XIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Create Circles</TableCell>
                  <TableCell className="text-center"><XIcon /></TableCell>
                  <TableCell className="text-center"><XIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Maintain Circles</TableCell>
                  <TableCell className="text-center"><XIcon /></TableCell>
                  <TableCell className="text-center"><XIcon /></TableCell>
                  <TableCell className="text-center"><CheckIcon /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium"></TableCell>
                  <TableCell className="text-center">
                    <Button size="sm" asChild>
                      <Link to="/join">Join Now</Link>
                    </Button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button size="sm" asChild>
                      <Link to="/join">Join Now</Link>
                    </Button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button size="sm" asChild>
                      <Link to="/join">Join Now</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </div>

        {/* PROGRAM LEADER Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-6 text-center">Program Leader</h2>
          <p className="text-center text-gray-600 mb-8">Full platform capabilities - architect experiences</p>
          
          <Card className="border-2 border-amber-500 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 text-center">
              <div className="flex justify-center mb-4">
                <Crown className="w-16 h-16 text-amber-600" />
              </div>
              <CardTitle className="text-3xl">Program Leader</CardTitle>
              <CardDescription className="text-lg mt-2">
                Architect platform experiences with full program creation capabilities
              </CardDescription>
              <div className="mt-4">
                <div className="text-5xl font-bold text-amber-600">$499</div>
                <div className="text-gray-600 mt-1">/month</div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div>
                  <h4 className="font-semibold text-lg mb-4">Everything from Circle Leader PLUS:</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      <span><strong>Create Programs</strong></span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      <span><strong>Maintain Programs</strong></span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      <span>Build Program Journeys</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      <span>Manage Program Enrollment</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      <span>Unlimited Circles & Containers</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-4">Premium Features:</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      <span>Full Platform Access</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      <span>Revenue Share on Programs</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      <span>White-Label Options</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      <span>API Access</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      <span><strong>Dedicated Account Manager</strong></span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <Button size="lg" className="bg-amber-600 hover:bg-amber-700" asChild>
                  <Link to="/join">
                    Become a Program Leader
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16 p-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl text-white">
          <h3 className="text-3xl font-bold mb-4">Ready to Join?</h3>
          <p className="text-xl mb-6 opacity-90">
            Become part of THE community for innovators, entrepreneurs, job seekers, and professionals
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" variant="outline" className="bg-white text-blue-600 hover:bg-gray-100" asChild>
              <Link to="/guest/explore">Explore as Guest</Link>
            </Button>
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100" asChild>
              <Link to="/join">
                Create Account
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}