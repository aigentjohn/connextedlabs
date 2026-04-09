import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/error-handler';

/**
 * Helper to create announcement posts when library items are shared to circles
 */

interface CreateAnnouncementParams {
  authorId: string;
  circleIds: string[];
  itemType: 'document' | 'review';
  itemId: string;
  itemTitle: string;
  itemData?: {
    rating?: number;
    category?: string;
  };
}

export async function createLibraryShareAnnouncement({
  authorId,
  circleIds,
  itemType,
  itemId,
  itemTitle,
  itemData
}: CreateAnnouncementParams): Promise<void> {
  if (!circleIds || circleIds.length === 0) return;

  try {
    // Fetch author info
    const { data: author, error: authorError } = await supabase
      .from('users')
      .select('name')
      .eq('id', authorId)
      .single();

    if (authorError) {
      logError('Error fetching author for announcement:', authorError, { component: 'announcement-helper' });
      return;
    }

    // Generate announcement content based on item type
    let content = '';
    const authorName = author?.name || 'Someone';

    switch (itemType) {
      case 'document':
        content = `📄 ${authorName} shared a document: **${itemTitle}**`;
        if (itemData?.category) {
          content += `\n_Category: ${itemData.category}_`;
        }
        break;
      
      case 'review':
        const stars = itemData?.rating ? '⭐'.repeat(itemData.rating) : '';
        content = `${stars} ${authorName} shared a review: **${itemTitle}**`;
        if (itemData?.category) {
          content += `\n_${itemData.category}_`;
        }
        break;
    }

    // Create announcement post for each circle
    const posts = circleIds.map(circleId => ({
      circle_ids: [circleId],
      author_id: authorId,
      content,
      image_url: null,
      pinned: false
    }));

    const { error: postError } = await supabase
      .from('posts')
      .insert(posts);

    if (postError) {
      logError('Error creating announcement post:', postError, { component: 'announcement-helper' });
      // Don't throw - announcement is nice-to-have, shouldn't break the main flow
    }
  } catch (error) {
    logError('Unexpected error in createLibraryShareAnnouncement:', error, { component: 'announcement-helper' });
    // Don't throw - announcement is nice-to-have
  }
}