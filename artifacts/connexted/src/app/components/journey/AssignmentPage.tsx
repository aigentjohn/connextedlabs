import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import {
  ClipboardList,
  ArrowLeft,
  Send,
  Clock,
  CheckCircle2,
  Star,
  MessageSquare,
  Loader2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  rubric: string | null;
  due_at: string | null;
  allow_late: boolean;
  submission_type: 'text' | 'link' | 'both';
  created_at: string;
}

interface Submission {
  id: string;
  assignment_id: string;
  user_id: string;
  content: string | null;
  link_url: string | null;
  submitted_at: string;
  score: number | null;
  feedback: string | null;
  reviewed_at: string | null;
  user?: { name: string; avatar: string | null };
}

export default function AssignmentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [mySubmission, setMySubmission] = useState<Submission | null>(null);
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const [textContent, setTextContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState<string | null>(null);
  const [feedbackDraft, setFeedbackDraft] = useState('');
  const [scoreDraft, setScoreDraft] = useState('');

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super';

  useEffect(() => {
    if (id) loadData();
  }, [id, profile]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: a, error: aErr } = await supabase
        .from('assignments')
        .select('*')
        .eq('id', id)
        .single();
      if (aErr) throw aErr;
      setAssignment(a);

      if (profile) {
        const { data: mine } = await supabase
          .from('assignment_submissions')
          .select('*')
          .eq('assignment_id', id)
          .eq('user_id', profile.id)
          .maybeSingle();
        if (mine) {
          setMySubmission(mine);
          setTextContent(mine.content || '');
          setLinkUrl(mine.link_url || '');
        }
      }

      if (isAdmin) {
        const { data: subs } = await supabase
          .from('assignment_submissions')
          .select('*, user:users!assignment_submissions_user_id_fkey(name, avatar)')
          .eq('assignment_id', id)
          .order('submitted_at', { ascending: false });
        setAllSubmissions((subs as any) || []);
      }
    } catch (err) {
      console.error('Error loading assignment:', err);
      toast.error('Failed to load assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!profile || !assignment) return;
    const hasText = textContent.trim().length > 0;
    const hasLink = linkUrl.trim().length > 0;
    if (!hasText && !hasLink) {
      toast.error('Please provide a submission');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        assignment_id: assignment.id,
        user_id: profile.id,
        content: textContent.trim() || null,
        link_url: linkUrl.trim() || null,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from('assignment_submissions')
        .upsert(payload)
        .select()
        .single();
      if (error) throw error;
      setMySubmission(data);
      toast.success(mySubmission ? 'Submission updated!' : 'Assignment submitted!');
    } catch (err) {
      console.error('Error submitting:', err);
      toast.error('Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveFeedback = async (submissionId: string) => {
    try {
      const { error } = await supabase
        .from('assignment_submissions')
        .update({
          feedback: feedbackDraft || null,
          score: scoreDraft ? parseInt(scoreDraft) : null,
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', submissionId);
      if (error) throw error;
      setAllSubmissions(prev => prev.map(s =>
        s.id === submissionId
          ? { ...s, feedback: feedbackDraft || null, score: scoreDraft ? parseInt(scoreDraft) : null, reviewed_at: new Date().toISOString() }
          : s
      ));
      setEditingFeedback(null);
      toast.success('Feedback saved');
    } catch {
      toast.error('Failed to save feedback');
    }
  };

  const isPastDue = assignment?.due_at ? new Date(assignment.due_at) < new Date() : false;
  const canSubmit = !isPastDue || assignment?.allow_late;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Assignment not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <ClipboardList className="w-6 h-6 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <CardTitle className="text-xl">{assignment.title}</CardTitle>
              {assignment.description && (
                <p className="text-sm text-gray-600 mt-2 leading-relaxed whitespace-pre-wrap">{assignment.description}</p>
              )}
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                {assignment.due_at && (
                  <Badge variant={isPastDue ? 'destructive' : 'secondary'} className="gap-1">
                    <Clock className="w-3 h-3" />
                    {isPastDue ? 'Past due' : 'Due'} {new Date(assignment.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Badge>
                )}
                <Badge variant="outline" className="capitalize">{assignment.submission_type === 'both' ? 'Text or Link' : assignment.submission_type}</Badge>
                {mySubmission && <Badge className="bg-green-600 gap-1"><CheckCircle2 className="w-3 h-3" />Submitted</Badge>}
              </div>
            </div>
          </div>
        </CardHeader>
        {assignment.rubric && (
          <CardContent className="pt-0">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs font-semibold text-amber-800 mb-1 uppercase tracking-wide">Rubric</p>
              <p className="text-sm text-amber-900 whitespace-pre-wrap leading-relaxed">{assignment.rubric}</p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Feedback received (shown to member) */}
      {mySubmission?.feedback && !isAdmin && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-green-700" />
              <span className="text-sm font-semibold text-green-800">Feedback</span>
              {mySubmission.score !== null && (
                <Badge className="bg-green-700 gap-1 ml-2"><Star className="w-3 h-3" />Score: {mySubmission.score}</Badge>
              )}
            </div>
            <p className="text-sm text-green-900 whitespace-pre-wrap">{mySubmission.feedback}</p>
          </CardContent>
        </Card>
      )}

      {/* Submission form */}
      {!isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{mySubmission ? 'Your Submission' : 'Submit Your Work'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!canSubmit && !mySubmission && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                This assignment is past due and late submissions are not accepted.
              </div>
            )}

            {(assignment.submission_type === 'text' || assignment.submission_type === 'both') && (
              <div>
                <Label className="text-sm">Written Response</Label>
                <Textarea
                  value={textContent}
                  onChange={e => setTextContent(e.target.value)}
                  placeholder="Write your response here..."
                  rows={6}
                  className="mt-1"
                  disabled={!canSubmit && !mySubmission}
                />
              </div>
            )}

            {(assignment.submission_type === 'link' || assignment.submission_type === 'both') && (
              <div>
                <Label className="text-sm">Link URL</Label>
                <Input
                  type="url"
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-1"
                  disabled={!canSubmit && !mySubmission}
                />
              </div>
            )}

            {(canSubmit || mySubmission) && (
              <Button onClick={handleSubmit} disabled={submitting} className="bg-orange-600 hover:bg-orange-700">
                {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                <Send className="w-4 h-4 mr-2" />
                {mySubmission ? 'Update Submission' : 'Submit Assignment'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Admin: all submissions */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Submissions ({allSubmissions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {allSubmissions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No submissions yet.</p>
            ) : (
              allSubmissions.map(sub => (
                <div key={sub.id} className="p-4 border border-gray-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={(sub.user as any)?.avatar || undefined} />
                        <AvatarFallback className="text-xs">{(sub.user as any)?.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{(sub.user as any)?.name || 'Member'}</span>
                      {sub.score !== null && (
                        <Badge variant="outline" className="gap-1 text-xs"><Star className="w-3 h-3" />{sub.score}</Badge>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">{formatDistanceToNow(new Date(sub.submitted_at), { addSuffix: true })}</span>
                  </div>

                  {sub.content && (
                    <div className="bg-gray-50 rounded p-3 text-sm text-gray-800 whitespace-pre-wrap">{sub.content}</div>
                  )}
                  {sub.link_url && (
                    <a href={sub.link_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">{sub.link_url}</a>
                  )}

                  {editingFeedback === sub.id ? (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Label className="text-xs">Feedback</Label>
                          <Textarea value={feedbackDraft} onChange={e => setFeedbackDraft(e.target.value)} rows={3} className="mt-1 text-sm" />
                        </div>
                        <div className="w-20">
                          <Label className="text-xs">Score</Label>
                          <Input type="number" value={scoreDraft} onChange={e => setScoreDraft(e.target.value)} className="mt-1 text-sm" placeholder="0–100" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSaveFeedback(sub.id)}>Save Feedback</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingFeedback(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 pt-1 border-t">
                      {sub.feedback && <p className="text-xs text-gray-500 italic flex-1">{sub.feedback}</p>}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setEditingFeedback(sub.id); setFeedbackDraft(sub.feedback || ''); setScoreDraft(sub.score?.toString() || ''); }}
                      >
                        <MessageSquare className="w-3 h-3 mr-1" />
                        {sub.feedback ? 'Edit Feedback' : 'Add Feedback'}
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
