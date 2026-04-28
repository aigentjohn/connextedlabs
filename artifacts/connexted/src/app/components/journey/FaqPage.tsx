import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  HelpCircle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Loader2,
  GripVertical,
} from 'lucide-react';
import { toast } from 'sonner';

interface Faq {
  id: string;
  title: string;
  description: string | null;
}

interface FaqItem {
  id: string;
  faq_id: string;
  question: string;
  answer: string;
  position: number;
}

export default function FaqPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [faq, setFaq] = useState<Faq | null>(null);
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openItem, setOpenItem] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [addingNew, setAddingNew] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [savingNew, setSavingNew] = useState(false);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super';

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: f, error: fErr } = await supabase
        .from('faqs')
        .select('*')
        .eq('id', id)
        .single();
      if (fErr) throw fErr;
      setFaq(f);

      const { data: its } = await supabase
        .from('faq_items')
        .select('*')
        .eq('faq_id', id)
        .order('position', { ascending: true });
      setItems((its as FaqItem[]) || []);
    } catch (err) {
      console.error('Error loading FAQ:', err);
      toast.error('Failed to load FAQ');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (item: FaqItem) => {
    setEditingId(item.id);
    setEditQuestion(item.question);
    setEditAnswer(item.answer);
    setOpenItem(item.id);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    if (!editQuestion.trim() || !editAnswer.trim()) {
      toast.error('Question and answer are required');
      return;
    }
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from('faq_items')
        .update({ question: editQuestion.trim(), answer: editAnswer.trim() })
        .eq('id', editingId);
      if (error) throw error;
      setItems(prev => prev.map(i =>
        i.id === editingId ? { ...i, question: editQuestion.trim(), answer: editAnswer.trim() } : i
      ));
      setEditingId(null);
      toast.success('Item updated');
    } catch {
      toast.error('Failed to update item');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      const { error } = await supabase.from('faq_items').delete().eq('id', itemId);
      if (error) throw error;
      setItems(prev => prev.filter(i => i.id !== itemId));
      toast.success('Item deleted');
    } catch {
      toast.error('Failed to delete item');
    }
  };

  const handleAddNew = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      toast.error('Question and answer are required');
      return;
    }
    setSavingNew(true);
    try {
      const maxPos = items.reduce((m, i) => Math.max(m, i.position), -1);
      const { data, error } = await supabase
        .from('faq_items')
        .insert({ faq_id: id, question: newQuestion.trim(), answer: newAnswer.trim(), position: maxPos + 1 })
        .select()
        .single();
      if (error) throw error;
      setItems(prev => [...prev, data as FaqItem]);
      setNewQuestion('');
      setNewAnswer('');
      setAddingNew(false);
      toast.success('Item added');
    } catch {
      toast.error('Failed to add item');
    } finally {
      setSavingNew(false);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const updated = [...items];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    const reindexed = updated.map((it, pos) => ({ ...it, position: pos }));
    setItems(reindexed);
    await Promise.all(
      reindexed.map(it => supabase.from('faq_items').update({ position: it.position }).eq('id', it.id))
    );
  };

  const handleMoveDown = async (index: number) => {
    if (index === items.length - 1) return;
    const updated = [...items];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    const reindexed = updated.map((it, pos) => ({ ...it, position: pos }));
    setItems(reindexed);
    await Promise.all(
      reindexed.map(it => supabase.from('faq_items').update({ position: it.position }).eq('id', it.id))
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!faq) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">FAQ not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <HelpCircle className="w-6 h-6 text-violet-600 mt-0.5 flex-shrink-0" />
            <div>
              <CardTitle className="text-xl">{faq.title}</CardTitle>
              {faq.description && (
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{faq.description}</p>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* FAQ Accordion */}
      <div className="space-y-2">
        {items.length === 0 && !isAdmin && (
          <p className="text-sm text-gray-500 text-center py-8">No questions yet.</p>
        )}

        {items.map((item, index) => (
          <Card key={item.id} className="overflow-hidden">
            {editingId === item.id ? (
              <CardContent className="pt-4 space-y-3">
                <div>
                  <Label className="text-xs">Question</Label>
                  <Input
                    value={editQuestion}
                    onChange={e => setEditQuestion(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Answer</Label>
                  <Textarea
                    value={editAnswer}
                    onChange={e => setEditAnswer(e.target.value)}
                    rows={4}
                    className="mt-1 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveEdit} disabled={savingEdit}>
                    {savingEdit && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                    <Save className="w-3 h-3 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                    <X className="w-3 h-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            ) : (
              <>
                <button
                  className="w-full text-left px-4 py-3 flex items-center justify-between gap-2 hover:bg-gray-50 transition-colors"
                  onClick={() => setOpenItem(openItem === item.id ? null : item.id)}
                >
                  <span className="text-sm font-medium text-gray-900">{item.question}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isAdmin && (
                      <>
                        <span
                          role="button"
                          tabIndex={0}
                          className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                          onClick={e => { e.stopPropagation(); handleMoveUp(index); }}
                          onKeyDown={e => e.key === 'Enter' && handleMoveUp(index)}
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                          onClick={e => { e.stopPropagation(); handleMoveDown(index); }}
                          onKeyDown={e => e.key === 'Enter' && handleMoveDown(index)}
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-blue-600"
                          onClick={e => { e.stopPropagation(); handleStartEdit(item); }}
                          onKeyDown={e => e.key === 'Enter' && handleStartEdit(item)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-red-600"
                          onClick={e => { e.stopPropagation(); handleDelete(item.id); }}
                          onKeyDown={e => e.key === 'Enter' && handleDelete(item.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </span>
                      </>
                    )}
                    {openItem === item.id
                      ? <ChevronUp className="w-4 h-4 text-gray-400" />
                      : <ChevronDown className="w-4 h-4 text-gray-400" />
                    }
                  </div>
                </button>
                {openItem === item.id && (
                  <div className="px-4 pb-4 pt-1 border-t bg-gray-50">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{item.answer}</p>
                  </div>
                )}
              </>
            )}
          </Card>
        ))}
      </div>

      {/* Admin: add new item */}
      {isAdmin && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-gray-400" />
                Manage Questions
              </span>
              {!addingNew && (
                <Button size="sm" onClick={() => setAddingNew(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Question
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          {addingNew && (
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Question</Label>
                <Input
                  value={newQuestion}
                  onChange={e => setNewQuestion(e.target.value)}
                  placeholder="What is...?"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Answer</Label>
                <Textarea
                  value={newAnswer}
                  onChange={e => setNewAnswer(e.target.value)}
                  placeholder="The answer is..."
                  rows={4}
                  className="mt-1 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddNew} disabled={savingNew}>
                  {savingNew && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                  <Save className="w-3 h-3 mr-1" />
                  Save Question
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setAddingNew(false); setNewQuestion(''); setNewAnswer(''); }}>
                  <X className="w-3 h-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
