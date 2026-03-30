import React, { useState } from 'react';
import { LikeButton } from './LikeButton';
import { FavoriteButton } from './FavoriteButton';
import { RatingWidget } from './RatingWidget';
import { ShareButton } from './ShareButton';
import { EngagementStats, EngagementCounts } from './EngagementStats';
import { Sparkles, FileText, Video, BookOpen } from 'lucide-react';

// Mock user ID for demo
const DEMO_USER_ID = '123e4567-e89b-12d3-a456-426614174000';

export default function EngagementDemo() {
  const [contentStats, setContentStats] = useState({
    likesCount: 47,
    favoritesCount: 23,
    avgRating: 4.3,
    ratingsCount: 15,
    sharesCount: 8,
    viewsCount: 342
  });

  const mockContent = [
    {
      id: '1',
      type: 'document',
      title: 'Complete Guide to React Hooks',
      description: 'Learn everything about useState, useEffect, and custom hooks',
      icon: FileText,
      url: 'https://example.com/react-hooks-guide'
    },
    {
      id: '2',
      type: 'course',
      title: 'Web Development Masterclass',
      description: 'Build modern web applications from scratch',
      icon: Video,
      url: 'https://example.com/web-dev-course'
    },
    {
      id: '3',
      type: 'library',
      title: 'Startup Resources Library',
      description: 'Curated collection of resources for entrepreneurs',
      icon: BookOpen,
      url: 'https://example.com/startup-library'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Sparkles className="text-blue-600" size={32} />
            <h1 className="text-4xl font-bold text-gray-900">
              Universal Engagement System
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            A complete engagement system with likes, favorites, ratings, and shares - 
            all working across any content type in your platform.
          </p>
        </div>

        {/* Overview Stats Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Overall Engagement</h2>
          <EngagementStats
            likesCount={contentStats.likesCount}
            favoritesCount={contentStats.favoritesCount}
            avgRating={contentStats.avgRating}
            ratingsCount={contentStats.ratingsCount}
            sharesCount={contentStats.sharesCount}
            viewsCount={contentStats.viewsCount}
            layout="horizontal"
            size="lg"
          />
        </div>

        {/* Component Demos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Like Button Demo */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Like Button</h3>
            <p className="text-sm text-gray-600 mb-6">
              Public upvotes that signal quality and usefulness
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <LikeButton
                  contentType="document"
                  contentId="demo-1"
                  initialLikesCount={47}
                  initialIsLiked={false}
                  userId={DEMO_USER_ID}
                  size="lg"
                />
                <LikeButton
                  contentType="document"
                  contentId="demo-2"
                  initialLikesCount={12}
                  initialIsLiked={true}
                  userId={DEMO_USER_ID}
                  size="md"
                />
                <LikeButton
                  contentType="document"
                  contentId="demo-3"
                  initialLikesCount={0}
                  initialIsLiked={false}
                  userId={DEMO_USER_ID}
                  size="sm"
                />
              </div>
              <div className="bg-blue-50 p-4 rounded-lg text-sm text-gray-700">
                <strong>Features:</strong> Toggle like/unlike, auto-update counts, optimistic UI
              </div>
            </div>
          </div>

          {/* Favorite Button Demo */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Favorite Button</h3>
            <p className="text-sm text-gray-600 mb-6">
              Personal bookmarks with collection organization
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <FavoriteButton
                  contentType="course"
                  contentId="demo-4"
                  initialIsFavorited={false}
                  userId={DEMO_USER_ID}
                  size="lg"
                />
                <FavoriteButton
                  contentType="course"
                  contentId="demo-5"
                  initialIsFavorited={true}
                  initialCollections={['Learning', 'React']}
                  userId={DEMO_USER_ID}
                  size="md"
                />
              </div>
              <div className="bg-blue-50 p-4 rounded-lg text-sm text-gray-700">
                <strong>Features:</strong> Collections dialog, personal notes, organize bookmarks
              </div>
            </div>
          </div>

          {/* Rating Widget Demo */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Rating Widget</h3>
            <p className="text-sm text-gray-600 mb-6">
              Detailed reviews with 1-5 star ratings
            </p>
            <div className="space-y-4">
              <RatingWidget
                contentType="course"
                contentId="demo-6"
                userId={DEMO_USER_ID}
                avgRating={4.3}
                ratingsCount={15}
              />
              <div className="bg-blue-50 p-4 rounded-lg text-sm text-gray-700">
                <strong>Features:</strong> Star rating, review text, helpful/recommend questions
              </div>
            </div>
          </div>

          {/* Share Button Demo */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Share Button</h3>
            <p className="text-sm text-gray-600 mb-6">
              Share content with copy link and native sharing
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <ShareButton
                  contentType="document"
                  contentId="demo-7"
                  contentUrl="https://connexted.com/guides/react-hooks"
                  contentTitle="Complete Guide to React Hooks"
                  userId={DEMO_USER_ID}
                  sharesCount={8}
                  size="lg"
                />
                <ShareButton
                  contentType="library"
                  contentId="demo-8"
                  contentUrl="https://connexted.com/libraries/startup-resources"
                  contentTitle="Startup Resources Library"
                  userId={DEMO_USER_ID}
                  sharesCount={24}
                  size="md"
                />
              </div>
              <div className="bg-blue-50 p-4 rounded-lg text-sm text-gray-700">
                <strong>Features:</strong> Copy link, Web Share API, track share counts
              </div>
            </div>
          </div>
        </div>

        {/* Content Cards with Full Engagement */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Content Cards</h2>
          <p className="text-sm text-gray-600 mb-6">
            See how all engagement components work together on real content
          </p>
          
          <div className="space-y-6">
            {mockContent.map((content, index) => (
              <div key={content.id} className="border border-gray-200 rounded-xl p-6 hover:border-blue-300 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <content.icon className="text-blue-600" size={24} />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{content.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{content.description}</p>
                    </div>
                    
                    {/* Engagement Actions */}
                    <div className="flex flex-wrap items-center gap-3">
                      <LikeButton
                        contentType={content.type}
                        contentId={content.id}
                        initialLikesCount={47 - index * 10}
                        userId={DEMO_USER_ID}
                      />
                      <FavoriteButton
                        contentType={content.type}
                        contentId={content.id}
                        userId={DEMO_USER_ID}
                      />
                      <ShareButton
                        contentType={content.type}
                        contentId={content.id}
                        contentUrl={content.url}
                        contentTitle={content.title}
                        userId={DEMO_USER_ID}
                        sharesCount={8 + index * 3}
                      />
                    </div>

                    {/* Stats */}
                    <div className="pt-3 border-t border-gray-100">
                      <EngagementCounts
                        likesCount={47 - index * 10}
                        favoritesCount={23 - index * 5}
                        sharesCount={8 + index * 3}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Layout Variations */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Layout Variations</h2>
          
          <div className="space-y-8">
            {/* Horizontal */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Horizontal</h3>
              <EngagementStats
                likesCount={47}
                favoritesCount={23}
                avgRating={4.3}
                ratingsCount={15}
                sharesCount={8}
                viewsCount={342}
                layout="horizontal"
              />
            </div>

            {/* Compact */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Compact</h3>
              <EngagementStats
                likesCount={47}
                favoritesCount={23}
                avgRating={4.3}
                ratingsCount={15}
                sharesCount={8}
                viewsCount={342}
                layout="compact"
              />
            </div>

            {/* Vertical */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Vertical</h3>
              <div className="max-w-xs">
                <EngagementStats
                  likesCount={47}
                  favoritesCount={23}
                  avgRating={4.3}
                  ratingsCount={15}
                  sharesCount={8}
                  viewsCount={342}
                  layout="vertical"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">System Architecture</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">✅ Database Tables</h3>
              <ul className="space-y-1 text-gray-700">
                <li>• content_likes - Public upvotes</li>
                <li>• content_favorites - Personal bookmarks</li>
                <li>• content_ratings - Star ratings & reviews</li>
                <li>• content_shares - Share tracking</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">✅ Features</h3>
              <ul className="space-y-1 text-gray-700">
                <li>• Auto-update engagement counts via triggers</li>
                <li>• URL detection for automatic associations</li>
                <li>• RLS policies for security</li>
                <li>• Polymorphic - works with any content type</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
