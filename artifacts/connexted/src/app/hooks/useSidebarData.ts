import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { hasRoleLevel, ROLES } from '@/lib/constants/roles';

export interface SidebarData {
  circles: any[];
  tables: any[];
  elevators: any[];
  meetings: any[];
  pitches: any[];
  builds: any[];
  prompts: any[];
  standups: any[];
  meetups: any[];
  sprints: any[];
  magazines: any[];
  playlists: any[];
  episodes: any[];
  checklists: any[];
  moments: any[];
  allUsers: any[];
  sponsors: any[];
  mySponsorMemberships: any[];
  myCompanies: any[];
  community: any | null;
  events: any[];
  programs: any[];
  courses: any[];
  markets: any[];
  loading: boolean;
  hasMarketVentures: boolean;
  documentCounts: { total: number; byCircle: Record<string, number> };
  eventCounts: { total: number; byCircle: Record<string, number> };
  reviewCounts: { total: number; byCircle: Record<string, number>; myReviews: number };
}

export function useSidebarData(currentUserId: string) {
  const { profile } = useAuth();
  
  // Supabase state
  const [circles, setCircles] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [elevators, setElevators] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [pitches, setPitches] = useState<any[]>([]);
  const [builds, setBuilds] = useState<any[]>([]);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [standups, setStandups] = useState<any[]>([]);
  const [meetups, setMeetups] = useState<any[]>([]);
  const [sprints, setSprints] = useState<any[]>([]);
  const [magazines, setMagazines] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [checklists, setChecklists] = useState<any[]>([]);
  const [moments, setMoments] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [mySponsorMemberships, setMySponsorMemberships] = useState<any[]>([]);
  const [myCompanies, setMyCompanies] = useState<any[]>([]);
  const [community, setCommunity] = useState<any | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [markets, setMarkets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMarketVentures, setHasMarketVentures] = useState(false);
  const [documentCounts, setDocumentCounts] = useState<{ total: number; byCircle: Record<string, number> }>({
    total: 0,
    byCircle: {},
  });
  const [eventCounts, setEventCounts] = useState<{ total: number; byCircle: Record<string, number> }>({
    total: 0,
    byCircle: {},
  });
  const [reviewCounts, setReviewCounts] = useState<{ total: number; byCircle: Record<string, number>; myReviews: number }>({
    total: 0,
    byCircle: {},
    myReviews: 0,
  });

  // Fetch all data from Supabase
  useEffect(() => {
    if (!profile || !currentUserId) return;

    // Capture profile in closure — stable because we depend on profile?.id
    const currentProfile = profile;

    let isFirstFetch = true;

    const fetchData = async () => {
      try {
        // Only show loading spinner on first fetch, not on realtime refetches
        if (isFirstFetch) {
          setLoading(true);
        }

        if (!currentProfile) return;

        // Platform admins see ALL containers, regular users see only their containers
        const isPlatformAdmin = currentProfile.role === 'super';

        // Helper to fetch containers safely
        const fetchContainer = async (table: string, setter: (data: any[]) => void) => {
          try {
            let query = supabase.from(table).select('*');
            if (!isPlatformAdmin) {
              if (table === 'moments') {
                query = query.or(`user_id.eq.${currentUserId},is_public.eq.true`);
              } else if (table === 'courses') {
                return;
              } else if (table === 'episodes' || table === 'magazines' || table === 'checklists' || table === 'prompts') {
                // These tables have no member_ids column — filter by creator only
                query = query.eq('created_by', currentUserId);
              } else if (table === 'circles') {
                 query = query.contains('member_ids', [currentUserId]);
              } else if (table === 'programs') {
                 query = query.contains('member_ids', [currentUserId]);
              } else {
                 query = query.or(`member_ids.cs.{${currentUserId}},admin_ids.cs.{${currentUserId}},created_by.eq.${currentUserId}`);
              }
            }
            
            if (table === 'programs' || table === 'courses') {
               query = query.order('created_at', { ascending: false });
            }

            const { data, error } = await query;
            
            if (error) {
              // Silently handle missing tables
              if (['PGRST204', 'PGRST116', '42P01', 'PGRST205'].includes(error.code) || error.message?.includes('Failed to fetch')) {
                console.log(`${table} table not accessible or found, skipping...`);
                setter([]);
              } else {
                throw error;
              }
            } else {
              setter(data || []);
            }
          } catch (err: any) {
             // Silently handle missing tables in catch block too
             if (['PGRST204', 'PGRST116', '42P01', 'PGRST205'].includes(err.code) || err.message?.includes('Failed to fetch')) {
                console.log(`${table} table not accessible, skipping...`);
                setter([]);
             } else {
                console.log(`Error fetching ${table}, skipping...`, err);
                setter([]);
             }
          }
        };

        // Fetch all containers in parallel
        await Promise.all([
          fetchContainer('circles', setCircles),
          fetchContainer('tables', setTables),
          fetchContainer('elevators', setElevators),
          fetchContainer('meetings', setMeetings),
          fetchContainer('pitches', setPitches),
          fetchContainer('builds', setBuilds),
          fetchContainer('prompts', setPrompts),
          fetchContainer('standups', setStandups),
          fetchContainer('meetups', setMeetups),
          fetchContainer('sprints', setSprints),
          fetchContainer('magazines', setMagazines),
          fetchContainer('playlists', setPlaylists),
          fetchContainer('episodes', setEpisodes),
          fetchContainer('checklists', setChecklists),
          fetchContainer('moments', setMoments),
          fetchContainer('programs', setPrograms),
        ]);

        // Special handling for courses (different field names)
        try {
          const isAdmin = currentProfile?.role ? hasRoleLevel(currentProfile.role, ROLES.ADMIN) : false;
          
          let coursesQuery = supabase
            .from('courses')
            .select('id, title, slug, instructor_id, created_by, is_published, enrollment_count')
            .order('created_at', { ascending: false });
          
          // Platform admins see all courses; regular users see only their own
          if (!isAdmin) {
            coursesQuery = coursesQuery.or(`instructor_id.eq.${currentUserId},created_by.eq.${currentUserId}`);
          }
          
          const { data: coursesData, error: coursesError } = await coursesQuery;
          
          if (coursesError) {
             if (['PGRST204', 'PGRST205', '42P01'].includes(coursesError.code)) {
               console.log('Courses table not found, skipping...');
               setCourses([]);
             } else {
               throw coursesError;
             }
          } else {
            setCourses(coursesData || []);
          }
        } catch (coursesErr: any) {
           console.log('Courses table not accessible, skipping...');
           setCourses([]);
        }

        // Fetch events
        try {
          const { data: eventsData, error: eventsError } = await supabase
            .from('events')
            .select('*')
            .eq('community_id', currentProfile.community_id)
            .order('start_time');
          
          if (eventsError) throw eventsError;
          setEvents(eventsData || []);
        } catch (err) {
           console.log('Error fetching events:', err);
           setEvents([]);
        }

        // Fetch users
        try {
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id, name, email, role, avatar, membership_tier')
            .eq('community_id', currentProfile.community_id);

          if (usersError) throw usersError;
          setAllUsers(usersData || []);
        } catch (err) {
           console.log('Error fetching users:', err);
           setAllUsers([]);
        }

        // Fetch sponsors
        try {
          const { data: sponsorsData, error: sponsorsError } = await supabase
            .from('sponsors')
            .select('*');

          if (sponsorsError) throw sponsorsError;
          setSponsors(sponsorsData || []);
        } catch (err) {
           console.log('Error fetching sponsors:', err);
           setSponsors([]);
        }

        // Fetch user's own sponsor memberships
        try {
          const { data: membershipData } = await supabase
            .from('sponsor_members')
            .select('sponsor_id, role, sponsor:sponsors(id, name, slug, logo_url)')
            .eq('user_id', currentUserId);
          setMySponsorMemberships(membershipData || []);
        } catch (err) {
          setMySponsorMemberships([]);
        }

        // Fetch user's companies (owned or member of)
        try {
          // Companies the user owns
          const { data: ownedCompanies } = await supabase
            .from('market_companies')
            .select('id, name, slug, logo_url, owner_user_id')
            .eq('owner_user_id', currentUserId)
            .order('name');

          // Companies the user is a member of (but doesn't own)
          const { data: memberOf } = await supabase
            .from('company_members')
            .select('company:market_companies(id, name, slug, logo_url, owner_user_id)')
            .eq('user_id', currentUserId);

          const memberCompanies = (memberOf || [])
            .map((m: any) => m.company)
            .filter(Boolean);

          // Merge, deduplicate by id
          const allIds = new Set((ownedCompanies || []).map((c: any) => c.id));
          const combined = [
            ...(ownedCompanies || []),
            ...memberCompanies.filter((c: any) => !allIds.has(c.id)),
          ];
          setMyCompanies(combined);
        } catch (err) {
          setMyCompanies([]);
        }

        // Fetch community info
        try {
          const { data: communityData, error: communityError } = await supabase
            .from('communities')
            .select('id, name, slug, logo')
            .eq('id', currentProfile.community_id)
            .single();

          if (communityError) throw communityError;
          
          if (communityData) {
            setCommunity(communityData);
          } else {
            // Fallback
            const { data: settingsData } = await supabase
              .from('platform_settings')
              .select('default_community_name')
              .single();
            
            if (settingsData?.default_community_name) {
              setCommunity({
                id: currentProfile.community_id,
                name: settingsData.default_community_name,
                slug: 'default',
                logo: null,
              });
            } else {
              setCommunity(null);
            }
          }
        } catch (err) {
           console.log('Error fetching community info:', err);
           setCommunity(null);
        }

        // Fetch markets
        try {
          const { data: marketsData, error: marketsError } = await supabase
            .from('markets')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true });

          if (marketsError) {
             if (['PGRST204', 'PGRST205', '42P01'].includes(marketsError.code)) {
               console.log('Markets table not found, skipping...');
               setMarkets([]);
             } else {
               throw marketsError;
             }
          } else {
            setMarkets(marketsData || []);
          }
        } catch (marketsErr) {
           console.log('Markets table not accessible, skipping...');
           setMarkets([]);
        }
        
        // Check for market ventures
        try {
          const { count, error } = await supabase
            .from('companies')
            .select('*', { count: 'exact', head: true })
            .or(`owner_id.eq.${currentUserId},admin_ids.cs.{${currentUserId}},member_ids.cs.{${currentUserId}}`);
            
          if (!error) {
            setHasMarketVentures(!!count && count > 0);
          }
        } catch (err) {
           console.log('Error checking market ventures:', err);
        }

        // Fetch document counts
        try {
           const { data: docsData, error: docsError } = await supabase
             .from('documents')
             .select('id, circle_id');
             
           if (!docsError && docsData) {
             const counts: Record<string, number> = {};
             docsData.forEach((doc: any) => {
               if (doc.circle_id) {
                 counts[doc.circle_id] = (counts[doc.circle_id] || 0) + 1;
               }
             });
             setDocumentCounts({
               total: docsData.length,
               byCircle: counts
             });
           }
        } catch (err) {
           console.log('Error fetching document counts:', err);
        }
        
        // Fetch event counts
        try {
           const { data: eventsCountData, error: eventsCountError } = await supabase
             .from('events')
             .select('id, circle_id');
             
           if (!eventsCountError && eventsCountData) {
             const counts: Record<string, number> = {};
             eventsCountData.forEach((event: any) => {
               if (event.circle_id) {
                 counts[event.circle_id] = (counts[event.circle_id] || 0) + 1;
               }
             });
             setEventCounts({
               total: eventsCountData.length,
               byCircle: counts
             });
           }
        } catch (err) {
           console.log('Error fetching event counts:', err);
        }
        
        // Fetch review counts
        try {
           const { data: reviewsData, error: reviewsError } = await supabase
             .from('reviews')
             .select('id, circle_id, author_id');
             
           if (!reviewsError && reviewsData) {
             const counts: Record<string, number> = {};
             let myCount = 0;
             
             reviewsData.forEach((review: any) => {
               if (review.circle_id) {
                 counts[review.circle_id] = (counts[review.circle_id] || 0) + 1;
               }
               if (review.author_id === currentUserId) {
                 myCount++;
               }
             });
             setReviewCounts({
               total: reviewsData.length,
               byCircle: counts,
               myReviews: myCount
             });
           }
        } catch (err) {
           console.log('Error fetching review counts:', err);
        }

      } catch (error) {
        console.error('Error fetching sidebar data:', error);
      } finally {
        setLoading(false);
        isFirstFetch = false;
      }
    };

    fetchData();
    
    // Set up real-time subscription for relevant tables
    const channel = supabase
      .channel('sidebar_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'circles' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'elevators' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pitches' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'builds' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prompts' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'standups' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetups' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sprints' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'magazines' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'playlists' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'episodes' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checklists' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'moments' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'programs' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // Use profile?.id (primitive) instead of profile (object) to prevent re-render loops
  }, [profile?.id, currentUserId]);

  return {
    circles,
    tables,
    elevators,
    meetings,
    pitches,
    builds,
    prompts,
    standups,
    meetups,
    sprints,
    magazines,
    playlists,
    episodes,
    checklists,
    moments,
    allUsers,
    sponsors,
    mySponsorMemberships,
    myCompanies,
    community,
    events,
    programs,
    courses,
    markets,
    loading,
    hasMarketVentures,
    documentCounts,
    eventCounts,
    reviewCounts
  };
}